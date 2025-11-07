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

    const role =
      (userData.user.user_metadata as any)?.app_role ??
      (userData.user.app_metadata as any)?.role;
    if (role !== "venue_manager") return json({ ok:false, error:"Forbidden (role must be venue_manager)" }, 403);

    const venueId = (userData.user.user_metadata as any)?.venue_id;
    if (!venueId) return json({ ok:false, error:"No venue context" }, 403);

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

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

    function toMinutes(time: string) {
      const [hours = "0", minutes = "0"] = time.split(":");
      return parseInt(hours, 10) * 60 + parseInt(minutes, 10);
    }

    async function ensurePassOwnership(passId: string) {
      const { data, error } = await admin
        .from("passes")
        .select("id")
        .eq("id", passId)
        .eq("venue_id", venueId)
        .single();
      if (error || !data) throw new Error("Pass not found or forbidden");
    }

    function resolvePassId(payload: Record<string, unknown>) {
      const passId = (payload.pass_id ?? payload.p_pass_id) as string | undefined;
      if (!passId) throw new Error("pass_id required");
      return passId;
    }

    async function updatePass(passId: string, patch: Record<string, unknown>) {
      await ensurePassOwnership(passId);
      const { error } = await admin
        .from("passes")
        .update(patch)
        .eq("id", passId)
        .eq("venue_id", venueId);
      if (error) throw error;
      return { ok: true };
    }

    let out: unknown;
    switch (action) {
      case "set_auto_approve":
        out = await callRpc("fn_set_auto_approve", payload);
        break;
      case "set_daily_cap":
        out = await callRpc("fn_set_daily_cap", payload);
        break;
      case "set_default_cap": {
        const passId = resolvePassId(payload);
        const capValue = Number(payload.cap);
        if (!Number.isFinite(capValue) || capValue < 0) throw new Error("Invalid cap");
        out = await updatePass(passId, { default_daily_cap: Math.round(capValue) });
        break;
      }
      case "set_paused":
        out = await callRpc("fn_set_paused", payload);
        break;
      case "set_default_arrival_window":
        out = await callRpc("fn_set_default_arrival_window", payload);
        break;
      case "force_authorize_now":
        out = await callRpc("fn_force_authorize_now", payload);
        break;
      case "update_pass_status_visibility": {
        const passId = resolvePassId(payload);
        const patch: Record<string, unknown> = {};
        if (typeof payload.status === "string") {
          const status = payload.status;
          if (!["active", "paused"].includes(status)) throw new Error("Invalid status");
          patch.status = status;
        }
        if (typeof payload.visibility === "string") {
          const visibility = payload.visibility;
          if (!["members", "guest_only", "both", "private"].includes(visibility)) {
            throw new Error("Invalid visibility");
          }
          patch.visibility = visibility;
        }
        if (Object.keys(patch).length === 0) throw new Error("No updates provided");
        out = await updatePass(passId, patch);
        break;
      }
      case "update_pass_service_hours": {
        const passId = resolvePassId(payload);
        const open = payload.open as string;
        const close = payload.close as string;
        if (!open || !close) throw new Error("Missing parameters");
        if (!timeRegex.test(open) || !timeRegex.test(close)) throw new Error("Invalid time format");
        const openMinutes = toMinutes(open);
        const closeMinutes = toMinutes(close);
        if (closeMinutes <= openMinutes) throw new Error("Close must be after open");
        out = await updatePass(passId, {
          service_hours_open_local: open,
          service_hours_close_local: close,
        });
        break;
      }
      case "update_pass_arrival_window": {
        const passId = resolvePassId(payload);
        const start = payload.start_local as string;
        const minutes = Number(payload.minutes);
        const grace = Number(payload.grace_minutes ?? 30);
        if (!start) throw new Error("Missing parameters");
        if (!timeRegex.test(start)) throw new Error("Invalid start time");
        if (!Number.isFinite(minutes) || minutes <= 0) throw new Error("Invalid minutes");
        if (!Number.isFinite(grace) || grace < 0) throw new Error("Invalid grace period");
        out = await updatePass(passId, {
          default_arrival_start_local: start,
          default_arrival_window_minutes: Math.round(minutes),
          arrival_grace_minutes: Math.round(grace),
        });
        break;
      }
      case "update_pass_pricing": {
        const passId = resolvePassId(payload);
        const patch: Record<string, unknown> = {};
        if (typeof payload.min_spend_amount === "number") {
          patch.min_spend_amount = Math.max(0, Math.round(payload.min_spend_amount as number));
        }
        if (typeof payload.display_price_text === "string") {
          patch.display_price_text = payload.display_price_text;
        }
        if (typeof payload.no_show_amount_per_person === "number") {
          patch.no_show_amount_per_person = Math.max(0, Math.round(payload.no_show_amount_per_person as number));
        }
        if (Object.keys(patch).length === 0) throw new Error("No pricing updates provided");
        out = await updatePass(passId, patch);
        break;
      }
      default:
        return json({ ok:false, error:`Unknown action: ${action}` }, 400);
    }

    return json(out);
  } catch (e) {
    console.error(e);
    return json({ ok:false, error:String(e) }, 500);
  }
});
