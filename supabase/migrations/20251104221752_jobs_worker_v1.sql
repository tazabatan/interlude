-- jobs_worker_v1.sql
-- Helpers for claiming and completing due jobs processed by the background worker.

create index if not exists idx_due_jobs_ready
on public.due_jobs (status, run_at);

create unique index if not exists idx_due_jobs_unique
on public.due_jobs (booking_id, job_type);

create or replace function public.fn_claim_due_jobs(_limit int default 25)
returns table(job_id uuid, job_type text, booking_id uuid, scheduled_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    with claim as (
      select id as selected_id
      from public.due_jobs
      where status = 'pending'
        and run_at <= now()
      order by run_at asc
      for update skip locked
      limit _limit
    )
    update public.due_jobs j
    set status = 'processing',
        claimed_at = now(),
        attempts = coalesce(j.attempts, 0)
    where j.id in (select selected_id from claim)
    returning j.id, j.job_type, j.booking_id, j.run_at as scheduled_at;
end;
$$;

create or replace function public.fn_complete_job_ok(_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.due_jobs
  set status = 'done',
      last_error = null
  where id = _id;
end;
$$;

create or replace function public.fn_complete_job_err(_id uuid, _err text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.due_jobs
  set status = 'failed',
      last_error = _err,
      attempts = coalesce(attempts, 0) + 1
  where id = _id;
end;
$$;
