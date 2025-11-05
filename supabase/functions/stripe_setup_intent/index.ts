import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Booking = {
  id: string;
  user_id: string;
  hold_amount: number | null;
  hold_currency: string | null;
};

type MemberProfile = {
  user_id: string;
  customer_id: string;
  default_payment_method: string | null;
};

type StripeCustomer = {
  id: string;
  [key: string]: unknown;
};

type StripeSetupIntent = {
  id: string;
  client_secret: string;
  customer: string;
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
    `${SUPABASE_URL}/rest/v1/bookings?select=id,user_id,hold_amount,hold_currency&id=eq.${bookingId}&limit=1`,
    { headers: supabaseHeaders! },
  );

  if (!res.ok) {
    throw new Error(`failed to load booking: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as Booking[];
  return data[0] ?? null;
}

async function fetchProfile(userId: string): Promise<MemberProfile | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/member_stripe_profiles?select=user_id,customer_id,default_payment_method&user_id=eq.${userId}&limit=1`,
    { headers: supabaseHeaders! },
  );

  if (!res.ok) {
    throw new Error(`failed to load stripe profile: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as MemberProfile[];
  return data[0] ?? null;
}

async function upsertProfile(userId: string, customerId: string, defaultPaymentMethod?: string | null) {
  await fetch(`${SUPABASE_URL}/rest/v1/member_stripe_profiles`, {
    method: "POST",
    headers: {
      ...supabaseHeaders!,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      user_id: userId,
      customer_id: customerId,
      default_payment_method: defaultPaymentMethod ?? null,
    }),
  });
}

async function fetchUserEmail(userId: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    headers: {
      apikey: SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json() as { email?: string };
  return data.email ?? null;
}

async function stripeCreateCustomer(email: string | null, metadata: Record<string, string>): Promise<StripeCustomer> {
  const params = new URLSearchParams();
  if (email) params.set("email", email);
  for (const [key, value] of Object.entries(metadata)) {
    params.set(`metadata[${key}]`, value);
  }

  const res = await fetch("https://api.stripe.com/v1/customers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const json = (await res.json()) as StripeCustomer;
  if (!res.ok) {
    throw new Error(`stripe customer error: ${JSON.stringify(json)}`);
  }
  return json;
}

async function stripeCreateSetupIntent(customerId: string, bookingId: string): Promise<StripeSetupIntent> {
  const params = new URLSearchParams();
  params.set("customer", customerId);
  params.append("payment_method_types[]", "card");
  params.set("usage", "off_session");
  params.set("metadata[booking_id]", bookingId);

  const res = await fetch("https://api.stripe.com/v1/setup_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const json = (await res.json()) as StripeSetupIntent;
  if (!res.ok) {
    throw new Error(`stripe setup_intent error: ${JSON.stringify(json)}`);
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
    email?: string;
    payment_method_id?: string;
    customer_id?: string;
    stripe_response?: Record<string, unknown>;
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

    if (payload.payment_method_id) {
      const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_hold_store_payment_method`, {
        method: "POST",
        headers: supabaseHeaders,
        body: JSON.stringify({
          _booking_id: bookingId,
          _payment_method: payload.payment_method_id,
          _customer_id: payload.customer_id ?? null,
          _stripe_response: payload.stripe_response ?? null,
        }),
      });

      if (!rpcRes.ok) {
        return new Response(
          `failed to store payment method: ${rpcRes.status} ${await rpcRes.text()}`,
          { status: 500 },
        );
      }

      if (payload.customer_id) {
        await upsertProfile(booking.user_id, payload.customer_id, payload.payment_method_id);
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let profile = await fetchProfile(booking.user_id);
    let customerId = payload.customer_id ?? profile?.customer_id ?? null;

    if (!customerId) {
      const email = payload.email ?? (await fetchUserEmail(booking.user_id));
      const customer = await stripeCreateCustomer(email, {
        booking_id: bookingId,
        user_id: booking.user_id,
      });
      customerId = customer.id;
      await upsertProfile(booking.user_id, customerId, null);
    }

    const setupIntent = await stripeCreateSetupIntent(customerId, bookingId);

    return new Response(
      JSON.stringify({
        ok: true,
        client_secret: setupIntent.client_secret,
        customer_id: customerId,
        setup_intent: setupIntent.id,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(String(error), { status: 500 });
  }
});
