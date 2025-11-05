import "jsr:@supabase/functions-js/edge-runtime";

export const config = { runtime: 'edge' };

const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321";
const _STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY"); // kept for parity

async function callSQL(path: string, body: unknown, srk: string) {
  const url = `${Deno.env.get("INTERLUDE_SUPABASE_URL") ?? DEFAULT_SUPABASE_URL}/rest/v1/rpc/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${srk}`,
      'content-type': 'application/json',
      'accept-profile': 'public',
      'content-profile': 'public',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`rpc ${path} ${res.status}: ${text}`);
  }

  return res.json();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("use POST", { status: 405 });
  }

  const srk = Deno.env.get("INTERLUDE_SRK") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!srk) {
    return new Response("missing SRK", { status: 500 });
  }

  try {
    const { action, payload } = await req.json();

    switch (action) {
      case 'set_auto_approve':
        return Response.json(await callSQL('fn_set_auto_approve', payload, srk));
      case "set_daily_cap":
        return Response.json(await callSQL("fn_set_daily_cap", payload, srk));
      case "set_default_arrival_window":
        return Response.json(await callSQL("fn_set_default_arrival_window", payload, srk));
      case 'set_paused':
        return Response.json(await callSQL("fn_set_paused", payload, srk));
      case "force_authorize_now":
        return Response.json(await callSQL("fn_force_authorize_now", payload, srk));
      default:
        return new Response("unknown action", { status: 400 });
    }
  } catch (error) {
    return new Response(`error: ${error.message}`, { status: 500 });
  }
});
