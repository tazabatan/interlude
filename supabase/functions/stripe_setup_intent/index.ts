import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  if (!SUPABASE_URL || !SRK) {
    return new Response("config missing", { status: 500 });
  }

  const { booking_id } = await req.json().catch(() => ({}));
  if (!booking_id) {
    return new Response("booking_id required", { status: 400 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${booking_id}`, {
    method: "PATCH",
    headers: {
      apikey: SRK,
      Authorization: `Bearer ${SRK}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ payment_method_ref: "stub_pm_saved" }),
  });

  if (!res.ok) {
    return new Response(await res.text(), { status: res.status });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
