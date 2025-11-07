set check_function_bodies = off;

create or replace function public.fn_restore_declined_booking(_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claims jsonb := coalesce(auth.jwt(), '{}'::jsonb);
  v_role text := public.current_role_claim();
  v_staff uuid := nullif(v_claims ->> 'sub', '')::uuid;
  v_booking public.bookings%rowtype;
  v_venue_claim uuid := public.current_venue_claim();
begin
  if v_role not in ('venue_staff', 'venue_manager', 'admin', 'service', 'service_role') then
    raise exception 'forbidden';
  end if;

  select *
    into v_booking
    from public.bookings
   where id = _booking_id
   for update;

  if not found then
    raise exception 'booking_not_found';
  end if;

  if v_role in ('venue_staff', 'venue_manager') then
    if v_venue_claim is null or v_booking.venue_id <> v_venue_claim then
      raise exception 'forbidden';
    end if;
  end if;

  if v_booking.status <> 'declined' then
    return jsonb_build_object('ok', true, 'booking_id', v_booking.id, 'status', v_booking.status, 'noop', true);
  end if;

  update public.bookings
     set status = 'requested'
   where id = _booking_id;

  insert into public.booking_audit (booking_id, from_status, to_status, actor, meta)
  values (
    _booking_id,
    'declined',
    'requested',
    v_staff,
    jsonb_build_object('event', 'undo_decline')
  );

  return jsonb_build_object('ok', true, 'booking_id', _booking_id, 'status', 'requested');
end;
$$;
