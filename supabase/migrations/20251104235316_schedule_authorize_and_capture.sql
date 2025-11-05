-- schedule_authorize_and_capture.sql
-- Helpers and triggers to schedule hold authorization jobs when issuing bookings.

create or replace function public.fn_t_minus_one_14(_instant timestamptz, _tz text)
returns timestamptz
language sql
immutable
as $$
  select timezone(
    'UTC',
    (date_trunc('day', timezone(_tz, coalesce(_instant, now()))) - interval '1 day') + time '14:00'
  );
$$;

create or replace function public.fn_enqueue(_job_type text, _booking_id uuid, _run_at timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.due_jobs (id, job_type, booking_id, run_at, status, attempts)
  select gen_random_uuid(), _job_type, _booking_id, _run_at, 'pending', 0
  where not exists (
    select 1
    from public.due_jobs
    where booking_id = _booking_id
      and job_type = _job_type
  );
end;
$$;

create or replace function public.fn_after_issue_schedule(_booking_id uuid, _window_start timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_at timestamptz;
begin
  v_run_at := public.fn_t_minus_one_14(_window_start, 'America/Anguilla');
  perform public.fn_enqueue('hold_authorize', _booking_id, v_run_at);
end;
$$;

create or replace function public.fn_approve_booking(
  _booking_id uuid,
  _window_start timestamptz,
  _window_end   timestamptz,
  _issue_now boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare _qr text := encode(extensions.gen_random_bytes(16),'hex');
begin
  update public.bookings
  set status = 'approved',
      arrival_window_start = _window_start,
      arrival_window_end   = _window_end
  where id = _booking_id;
  if not found then
    raise exception 'Booking not found %', _booking_id;
  end if;

  if _issue_now then
    update public.bookings
    set status = 'issued',
        qr_jti = _qr
    where id = _booking_id;

    perform public.fn_after_issue_schedule(_booking_id, _window_start);
  end if;

  return jsonb_build_object('ok', true, 'qr_jti', _qr);
end;
$$;
