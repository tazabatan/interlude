-- Update fn_request_booking to accept and store requested arrival time
create or replace function public.fn_request_booking(_pass_id uuid, _date date, _party_size int, _arrival_time time default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare _booking_id uuid := gen_random_uuid();
begin
  insert into public.bookings (id, user_id, venue_id, pass_id, date, party_size, status, requested_arrival_time)
  select
    _booking_id,
    auth.uid(),
    p.venue_id,
    _pass_id,
    _date,
    _party_size,
    'requested'::booking_status,
    _arrival_time
  from public.passes p
  where p.id = _pass_id;

  if not found then
    raise exception 'Unknown pass %', _pass_id;
  end if;

  return _booking_id;
end;
$$;
