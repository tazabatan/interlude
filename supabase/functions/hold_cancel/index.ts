import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Booking = {
  id: string;
  hold_status: string;
  payment_intent_ref: string | null;
};

type StripePaymentIntent = {
  id: string;
  status: string;
  cancellation_reason?: string;
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
    `${SUPABASE_URL}/rest/v1/bookings?select=id,hold_status,payment_intent_ref&id=eq.${bookingId}&limit=1`,
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

async function stripeCancel(
  paymentIntentId: string,
  idempotencyKey: string,
): Promise<StripePaymentIntent> {
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
  });

  const json = (await res.json()) as StripePaymentIntent;

  if (!res.ok) {
    throw new Error(`stripe cancel failed: ${JSON.stringify(json)}`);
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

    if (booking.hold_status === "canceled") {
      return new Response(JSON.stringify({ ok: true, idem: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!booking.payment_intent_ref) {
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_hold_canceled`, {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify({
          _booking_id: bookingId,
          _reason: "no_payment_intent",
        }),
      });

      if (!rpcRes.ok) {
        return new Response(
          `failed to persist cancel: ${rpcRes.status} ${await rpcRes.text()}`,
          { status: 500 },
        );
      }

      return new Response(JSON.stringify({ ok: true, noop: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const idemKey = `hold_cancel:${bookingId}`;
    const inserted = await insertIdempotency(idemKey, {
      booking_id: bookingId,
      job: "hold_cancel",
      created_at: new Date().toISOString(),
    });
    if (!inserted) {
      return new Response(JSON.stringify({ ok: true, idem: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let paymentIntent: StripePaymentIntent;
    try {
      paymentIntent = await stripeCancel(
        booking.payment_intent_ref,
        `hold_cancel_${bookingId}`,
      );
    } catch (error) {
      await removeIdempotency(idemKey);
      return new Response(String(error), { status: 400 });
    }

    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_hold_canceled`, {
      method: "POST",
      headers: supabaseHeaders,
      body: JSON.stringify({
        _booking_id: bookingId,
        _reason: paymentIntent.cancellation_reason ?? null,
        _stripe_response: paymentIntent,
      }),
    });

    if (!rpcRes.ok) {
      return new Response(
        `failed to persist cancel: ${rpcRes.status} ${await rpcRes.text()}`,
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
