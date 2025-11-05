import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY =
  Deno.env.get("INTERLUDE_SRK") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";

function json(body: unknown, init: number | ResponseInit = 200) {
  const respInit = typeof init === "number" ? { status: init } : init;
  return new Response(JSON.stringify(body), {
    ...respInit,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
      "access-control-allow-methods": "GET, POST, OPTIONS, PATCH"
    }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return json({}, 204);
  try {
    if (!SERVICE_ROLE_KEY) return json({ ok:false, error:"Missing INTERLUDE_SRK env var" }, 500);

    // JWT from the browser
    const authHeader = req.headers.get("Authorization") ?? "";

    // User client to read auth + role
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ ok:false, error:"Not authenticated" }, 401);

    const role = (userData.user.app_metadata as any)?.role;
    if (role !== "venue_manager") return json({ ok:false, error:"Forbidden (role must be venue_manager)" }, 403);

    // Service-role client for RPCs
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { action, payload } = (await req.json()) as { action: string; payload: Record<string, unknown> };

    async function callRpc(name: string, params: Record<string, unknown>) {
      const { data, error } = await admin.rpc(name, params);
      if (error) throw error;
      return data ?? { ok: true };
    }

    let out: unknown;
    switch (action) {
      case "set_auto_approve":
        out = await callRpc("fn_set_auto_approve", payload);
        break;
      case "set_daily_cap":
        out = await callRpc("fn_set_daily_cap", payload);
        break;
      case "set_paused":
        out = await callRpc("fn_set_paused", payload);
        break;
      case "set_default_arrival_window":
        out = await callRpc("fn_set_default_arrival_window", payload);
        break;
      case "force_authorize_now":
        out = await callRpc("fn_force_authorize_now", payload);
        break;
      default:
        return json({ ok:false, error:`Unknown action: ${action}` }, 400);
    }

    return json(out);
  } catch (e) {
    console.error(e);
    return json({ ok:false, error:String(e) }, 500);
  }
});
