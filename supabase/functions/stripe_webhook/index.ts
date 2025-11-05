import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const supabaseHeaders = SERVICE_ROLE_KEY
  ? {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    }
  : null;

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

function hexToUint8(hex: string) {
  const normalized = hex.trim();
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(normalized.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function verifySignature(signatureHeader: string, payload: string) {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET missing");
  }

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, item) => {
    const [k, v] = item.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) {
    throw new Error("invalid signature header");
  }

  const signedContent = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(signedContent)),
  );

  const provided = hexToUint8(signature);
  if (!timingSafeEqual(expected, provided)) {
    throw new Error("invalid signature");
  }
}

async function recordEvent(event: Record<string, unknown>) {
  await fetch(`${SUPABASE_URL}/rest/v1/stripe_events`, {
    method: "POST",
    headers: {
      ...supabaseHeaders!,
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({
      id: event.id,
      type: event.type,
      payload: event,
    }),
  });
}

async function callRpc(fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: supabaseHeaders!,
    body: JSON.stringify(args),
  });

  if (!res.ok) {
    throw new Error(`RPC ${fn} failed: ${res.status} ${await res.text()}`);
  }
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!SUPABASE_URL || !supabaseHeaders || !STRIPE_WEBHOOK_SECRET) {
    return new Response("config missing", { status: 500 });
  }

  const signatureHeader = req.headers.get("stripe-signature");
  if (!signatureHeader) {
    return new Response("missing signature", { status: 400 });
  }

  const rawBody = await req.text();

  try {
    await verifySignature(signatureHeader, rawBody);
  } catch (error) {
    return new Response(String(error), { status: 400 });
  }

  const event = JSON.parse(rawBody) as Record<string, any>;

  try {
    await recordEvent(event);
  } catch (_) {
    // ignore duplicate insert errors
  }

  try {
    if (event.type?.startsWith("payment_intent")) {
      const paymentIntent = event.data?.object as Record<string, any> | undefined;
      const bookingId = paymentIntent?.metadata?.booking_id as string | undefined;

      if (bookingId) {
        if (event.type === "payment_intent.canceled") {
          await callRpc("fn_hold_canceled", {
            _booking_id: bookingId,
            _reason: paymentIntent?.cancellation_reason ?? null,
            _stripe_response: paymentIntent,
          });
        } else if (event.type === "payment_intent.succeeded") {
          await callRpc("fn_hold_captured", {
            _booking_id: bookingId,
            _amount_cents: paymentIntent?.amount_received ?? paymentIntent?.amount ?? 0,
            _currency: paymentIntent?.currency?.toUpperCase() ?? null,
            _stripe_response: paymentIntent,
          });
        }
      }
    }
  } catch (error) {
    return new Response(String(error), { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
