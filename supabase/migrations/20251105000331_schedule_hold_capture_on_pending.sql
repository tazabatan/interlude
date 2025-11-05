-- schedule_hold_capture_on_pending.sql
-- Schedule hold capture when bookings enter pending_verification.

create or replace function public.fn_capture_deadline(_win_end timestamptz, _tz text)
returns timestamptz
language sql
immutable
as $$
  select timezone('UTC', timezone(_tz, coalesce(_win_end, now())) + interval '24 hours');
$$;

create or replace function public.fn_enqueue_capture_once(_booking_id uuid, _run_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.due_jobs (id, job_type, booking_id, run_at, status, attempts)
  select gen_random_uuid(), 'hold_capture', _booking_id, _run_at, 'pending', 0
  where not exists (
    select 1
    from public.due_jobs
    where booking_id = _booking_id
      and job_type = 'hold_capture'
  );
end;
$$;

drop trigger if exists trg_schedule_capture_on_pending on public.bookings;

create or replace function public.fn_schedule_capture_on_pending()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_at timestamptz;
begin
  if NEW.status = 'pending_verification' and coalesce(OLD.status::text, '') <> 'pending_verification' then
    v_run_at := public.fn_capture_deadline(NEW.arrival_window_end, 'America/Anguilla');
    perform public.fn_enqueue_capture_once(NEW.id, v_run_at);
  end if;
  return NEW;
end;
$$;

create trigger trg_schedule_capture_on_pending
after update on public.bookings
for each row
execute procedure public.fn_schedule_capture_on_pending();
