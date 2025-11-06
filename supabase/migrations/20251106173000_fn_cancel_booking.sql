set check_function_bodies = off;

create or replace function public.fn_cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking record;
begin
  select *
  into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  if v_booking.user_id <> auth.uid() then
    raise exception 'forbidden';
  end if;

  if v_booking.arrival_window_start is not null and now() >= v_booking.arrival_window_start then
    raise exception 'too_late_to_cancel';
  end if;

  if v_booking.status not in ('requested', 'approved', 'issued') then
    raise exception 'invalid_status_for_cancel';
  end if;

  update public.bookings
     set status = 'cancelled'
   where id = p_booking_id;

  insert into public.booking_audit (id, booking_id, from_status, to_status, actor, meta)
  values (
    gen_random_uuid(),
    p_booking_id,
    v_booking.status,
    'cancelled',
    'member',
    jsonb_build_object('reason', 'self_cancel')
  );

  if v_booking.hold_status = 'authorized' then
    insert into public.due_jobs (id, job_type, booking_id, run_at, status)
    values (gen_random_uuid(), 'hold_cancel', p_booking_id, now(), 'queued');
  end if;
end;
$$;
