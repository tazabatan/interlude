-- 0005_rpcs_core.sql
-- Minimal working RPCs for request / approve / redeem.

-- Ensure pgcrypto for gen_random_* helpers
create extension if not exists pgcrypto;

-- Remove prior stub signatures
drop function if exists public.fn_request_booking(jsonb);
drop function if exists public.fn_approve_booking(jsonb);
drop function if exists public.fn_redeem(jsonb);

-- REQUEST: member asks for a booking
create or replace function public.fn_request_booking(_pass_id uuid, _date date, _party_size int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare _booking_id uuid := gen_random_uuid();
begin
  insert into public.bookings (id, user_id, venue_id, pass_id, date, party_size, status)
  select
    _booking_id,
    auth.uid(),
    p.venue_id,
    _pass_id,
    _date,
    _party_size,
    'requested'::booking_status
  from public.passes p
  where p.id = _pass_id;

  if not found then
    raise exception 'Unknown pass %', _pass_id;
  end if;

  return _booking_id;
end;
$$;

-- APPROVE (or ISSUE): staff moves request → approved or issued and sets window/QR
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
declare _qr text := encode(gen_random_bytes(16),'hex');
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

-- REDEEM: staff scans QR → insert redemptions + set status=redeemed
create or replace function public.fn_redeem(_qr_jti text, _server_name text default null, _table_ref text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare _booking_id uuid;
begin
  select id into _booking_id
  from public.bookings
  where qr_jti = _qr_jti and status = 'issued';

  if _booking_id is null then
    raise exception 'Invalid or already used QR';
  end if;

  -- Create redemption row (booking_id PK enforces idempotency)
  insert into public.redemptions(booking_id, redeemed_by, server_name, table_ref)
  values (_booking_id, auth.uid(), _server_name, _table_ref);

  -- Move to redeemed (state guard allows issued -> redeemed)
  update public.bookings set status='redeemed' where id=_booking_id;

  return jsonb_build_object('ok', true, 'booking_id', _booking_id);
end;
$$;
