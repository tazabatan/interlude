import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Booking = {
  id: string;
  hold_amount: number | null;
  hold_currency: string | null;
  hold_status: string;
  payment_intent_ref: string | null;
};

type StripePaymentIntent = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  cancellation_reason?: string;
  [key: string]: unknown;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const EMAIL_DISPATCH_URL = Deno.env.get("EMAIL_DISPATCH_URL") ?? Deno.env.get("SITE_URL");
const INTERNAL_EMAIL_SECRET = Deno.env.get("INTERNAL_EMAIL_SECRET");

const supabaseHeaders = SERVICE_ROLE_KEY
  ? {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    }
  : null;

async function fetchBooking(bookingId: string): Promise<Booking | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?select=id,hold_amount,hold_currency,hold_status,payment_intent_ref&id=eq.${bookingId}&limit=1`,
    { headers: supabaseHeaders! },
  );

  if (!res.ok) {
    throw new Error(`failed to load booking: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as Booking[];
  return data[0] ?? null;
}

async function insertIdempotency(key: string, meta: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/ops_idempotency`, {
    method: "POST",
    headers: {
      ...supabaseHeaders!,
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({ key, meta }),
  });

  if (res.status === 409) {
    return false;
  }

  if (!res.ok) {
    throw new Error(`idempotency insert failed: ${res.status} ${await res.text()}`);
  }

  return true;
}

async function removeIdempotency(key: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/ops_idempotency?key=eq.${key}`, {
    method: "DELETE",
    headers: supabaseHeaders!,
  });
}

async function stripeCapture(
  paymentIntentId: string,
  amount: number,
  idempotencyKey: string,
): Promise<StripePaymentIntent> {
  const params = new URLSearchParams();
  params.set("amount_to_capture", amount.toString());

  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
    body: params.toString(),
  });

  const json = (await res.json()) as StripePaymentIntent;

  if (!res.ok) {
    throw new Error(`stripe capture failed: ${JSON.stringify(json)}`);
  }

  return json;
}

async function dispatchHoldStatusEmail(bookingId: string, variant: "authorized" | "released" | "captured") {
  if (!EMAIL_DISPATCH_URL || !INTERNAL_EMAIL_SECRET) return;
  try {
    const endpoint = EMAIL_DISPATCH_URL.replace(/\/$/, "");
    await fetch(`${endpoint}/api/internal/email/dispatch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${INTERNAL_EMAIL_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: "hold-status",
        bookingId,
        variant,
        statusDate: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("hold_capture email dispatch failed", error);
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!SUPABASE_URL || !supabaseHeaders || !STRIPE_SECRET_KEY) {
    return new Response("config missing", { status: 500 });
  }

  const payload = await req.json().catch(() => ({})) as {
    booking_id?: string;
  };

  const bookingId = payload.booking_id;
  if (!bookingId) {
    return new Response("booking_id required", { status: 400 });
  }

  try {
    const booking = await fetchBooking(bookingId);
    if (!booking) {
      return new Response("booking not found", { status: 404 });
    }

    if (booking.hold_status === "captured") {
      return new Response(JSON.stringify({ ok: true, idem: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!booking.payment_intent_ref) {
      return new Response("payment_intent_ref missing", { status: 400 });
    }

    const amount = booking.hold_amount ?? 0;
    if (amount <= 0) {
      return new Response("hold_amount missing", { status: 400 });
    }

    const idemKey = `hold_capture:${bookingId}`;
    const inserted = await insertIdempotency(idemKey, {
      booking_id: bookingId,
      job: "hold_capture",
      created_at: new Date().toISOString(),
    });
    if (!inserted) {
      return new Response(JSON.stringify({ ok: true, idem: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let paymentIntent: StripePaymentIntent;
    try {
      paymentIntent = await stripeCapture(
        booking.payment_intent_ref,
        amount,
        `hold_capture_${bookingId}`,
      );
    } catch (error) {
      await removeIdempotency(idemKey);
      return new Response(String(error), { status: 400 });
    }

    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_hold_captured`, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify({
        _booking_id: bookingId,
        _amount_cents: (paymentIntent as { amount_received?: number }).amount_received ?? paymentIntent.amount ?? amount,
        _currency: paymentIntent.currency?.toUpperCase() ?? booking.hold_currency ?? "USD",
        _stripe_response: paymentIntent,
      }),
    });

    if (!rpcRes.ok) {
      return new Response(
        `failed to persist capture: ${rpcRes.status} ${await rpcRes.text()}`,
        { status: 500 },
      );
    }

    await dispatchHoldStatusEmail(bookingId, "captured");

    return new Response(
      JSON.stringify({ ok: true, payment_intent: paymentIntent.id, stripe: paymentIntent }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(String(error), { status: 500 });
  }
});
