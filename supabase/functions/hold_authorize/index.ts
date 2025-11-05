import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Booking = {
  id: string;
  hold_amount: number | null;
  hold_currency: string | null;
  hold_status: string;
  payment_method_ref: string | null;
};

type StripePaymentIntent = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  [key: string]: unknown;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

const supabaseHeaders = SERVICE_ROLE_KEY
  ? {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    }
  : null;

async function fetchBooking(bookingId: string): Promise<Booking | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/bookings?select=id,hold_amount,hold_currency,hold_status,payment_method_ref&id=eq.${bookingId}&limit=1`,
    {
      headers: supabaseHeaders!,
    },
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

async function stripeRequest(
  path: string,
  params: URLSearchParams,
  idempotencyKey: string,
): Promise<StripePaymentIntent> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
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
    throw new Error(`stripe error: ${JSON.stringify(json)}`);
  }

  return json;
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

    if (booking.hold_status === "authorized") {
      return new Response(JSON.stringify({ ok: true, idem: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!booking.payment_method_ref) {
      return new Response("payment_method_ref missing", { status: 400 });
    }

    if (!booking.hold_amount || booking.hold_amount <= 0) {
      return new Response("hold_amount missing", { status: 400 });
    }

    const idemKey = `hold_authorize:${bookingId}`;
    const inserted = await insertIdempotency(idemKey, {
      booking_id: bookingId,
      job: "hold_authorize",
      created_at: new Date().toISOString(),
    });
    if (!inserted) {
      return new Response(JSON.stringify({ ok: true, idem: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams();
    params.set("amount", booking.hold_amount.toString());
    params.set("currency", (booking.hold_currency ?? "usd").toLowerCase());
    params.set("payment_method", booking.payment_method_ref);
    params.set("capture_method", "manual");
    params.set("confirm", "true");
    params.append("payment_method_types[]", "card");
    params.set("metadata[booking_id]", bookingId);

    let paymentIntent: StripePaymentIntent;
    try {
      paymentIntent = await stripeRequest(
        "payment_intents",
        params,
        `hold_authorize_${bookingId}`,
      );
    } catch (error) {
      await removeIdempotency(idemKey);
      return new Response(String(error), { status: 400 });
    }

    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_hold_authorized`, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify({
        _booking_id: bookingId,
        _payment_intent: paymentIntent.id,
        _amount_cents: (paymentIntent as { amount_received?: number }).amount_received ?? paymentIntent.amount ?? booking.hold_amount,
        _currency: paymentIntent.currency?.toUpperCase() ?? booking.hold_currency ?? "USD",
        _stripe_response: paymentIntent,
      }),
    });

    if (!rpcRes.ok) {
      return new Response(
        `failed to persist authorization: ${rpcRes.status} ${await rpcRes.text()}`,
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, payment_intent: paymentIntent.id, stripe: paymentIntent }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(String(error), { status: 500 });
  }
});
