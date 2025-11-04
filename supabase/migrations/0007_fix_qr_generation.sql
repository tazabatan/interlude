-- 0007_fix_qr_generation.sql
-- Qualify gen_random_bytes so it resolves with the Supabase search_path.

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
  -- Move to approved first (state guard will consume capacity)
  update public.bookings
  set status = 'approved',
      arrival_window_start = _window_start,
      arrival_window_end   = _window_end
  where id = _booking_id;
  if not found then
    raise exception 'Booking not found %', _booking_id;
  end if;

  -- Optionally issue immediately (sets QR + moves to issued)
  if _issue_now then
    update public.bookings
    set status = 'issued',
        qr_jti = _qr
    where id = _booking_id;
  end if;

  return jsonb_build_object('ok', true, 'qr_jti', _qr);
end;
$$;

