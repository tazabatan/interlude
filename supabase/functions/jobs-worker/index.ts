import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type JobRow = {
  job_id: string;
  job_type: string;
  booking_id: string | null;
  scheduled_at: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
}

const rpc = async <T>(
  fn: string,
  params?: Record<string, unknown>,
): Promise<T> => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(params ?? {}),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`${fn} ${res.status}: ${errorBody}`);
  }

  if (res.status === 204) {
    return [] as T;
  }

  const text = await res.text();
  if (!text) {
    return [] as T;
  }

  return JSON.parse(text) as T;
};

const callFunction = async (name: string, payload: Record<string, unknown>) => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`${name} ${res.status}: ${await res.text()}`);
  }
};

serve(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Missing Supabase configuration", { status: 500 });
  }

  let jobs: JobRow[] = [];
  try {
    jobs = await rpc<JobRow[]>("fn_claim_due_jobs", { _limit: 25 });
  } catch (error) {
    console.error("Claim error", error);
    return new Response(`claim error: ${String(error)}`, { status: 500 });
  }

  for (const job of jobs) {
    try {
      switch (job.job_type) {
        case "hold_cancel": {
          if (!job.booking_id) {
            throw new Error("hold_cancel missing booking_id");
          }
          await callFunction("hold_cancel", { booking_id: job.booking_id });
          break;
        }
        case "hold_authorize": {
          if (!job.booking_id) {
            throw new Error("hold_authorize missing booking_id");
          }
          await callFunction("hold_authorize", { booking_id: job.booking_id });
          break;
        }
        case "hold_capture": {
          if (!job.booking_id) {
            throw new Error("hold_capture missing booking_id");
          }
          await callFunction("hold_capture", { booking_id: job.booking_id });
          break;
        }
        default:
          throw new Error(`unknown job type ${job.job_type}`);
      }

      await rpc("fn_complete_job_ok", { _id: job.job_id });
    } catch (error) {
      console.error("Job error", job.job_id, error);
      await rpc("fn_complete_job_err", {
        _id: job.job_id,
        _err: String(error),
      });
    }
  }

  return new Response(`processed: ${jobs.length}`, { status: 200 });
});
