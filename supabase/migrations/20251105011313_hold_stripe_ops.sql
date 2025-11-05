-- 20251105011313_hold_stripe_ops.sql
-- Stripe hold lifecycle helpers: customer profiles, auditing, and ledger updates.

create table if not exists public.member_stripe_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  customer_id text not null,
  default_payment_method text,
  created_at timestamptz default now()
);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz default now()
);

create or replace function public.fn_hold_store_payment_method(
  _booking_id uuid,
  _payment_method text,
  _customer_id text default null,
  _stripe_response jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_original_role text := current_setting('request.jwt.claim.role', true);
begin
  if coalesce(_payment_method, '') = '' then
    raise exception 'payment_method required';
  end if;

  select * into v_booking
  from public.bookings
  where id = _booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.bookings
  set payment_method_ref = _payment_method
  where id = _booking_id;
  perform set_config('request.jwt.claim.role', coalesce(v_original_role, ''), true);

  insert into public.booking_audit (booking_id, from_status, to_status, actor, meta, created_at)
  values (
    _booking_id,
    v_booking.status,
    v_booking.status,
    null,
    jsonb_build_object(
      'event', 'payment_method_saved',
      'payment_method', _payment_method,
      'stripe', coalesce(_stripe_response, '{}'::jsonb)
    ),
    now()
  );

  if _customer_id is not null then
    insert into public.member_stripe_profiles (user_id, customer_id, default_payment_method)
    values (v_booking.user_id, _customer_id, _payment_method)
    on conflict (user_id) do update
      set customer_id = excluded.customer_id,
          default_payment_method = excluded.default_payment_method;
  end if;

  return jsonb_build_object('ok', true, 'booking_id', _booking_id);
end;
$$;

create or replace function public.fn_hold_authorized(
  _booking_id uuid,
  _payment_intent text,
  _amount_cents int,
  _currency text,
  _stripe_response jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_currency text;
  v_original_role text := current_setting('request.jwt.claim.role', true);
begin
  select * into v_booking
  from public.bookings
  where id = _booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  v_currency := coalesce(_currency, v_booking.hold_currency, 'USD');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.bookings
  set payment_intent_ref = _payment_intent,
      hold_status = 'authorized',
      hold_amount = coalesce(v_booking.hold_amount, _amount_cents),
      hold_currency = v_currency
  where id = _booking_id;
  perform set_config('request.jwt.claim.role', coalesce(v_original_role, ''), true);

  insert into public.booking_audit (booking_id, from_status, to_status, actor, meta, created_at)
  values (
    _booking_id,
    v_booking.status,
    v_booking.status,
    null,
    jsonb_build_object(
      'event', 'hold_authorized',
      'payment_intent', _payment_intent,
      'amount_cents', _amount_cents,
      'currency', v_currency,
      'stripe', coalesce(_stripe_response, '{}'::jsonb)
    ),
    now()
  );

  return jsonb_build_object('ok', true, 'booking_id', _booking_id);
end;
$$;

create or replace function public.fn_hold_canceled(
  _booking_id uuid,
  _reason text default null,
  _stripe_response jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_original_role text := current_setting('request.jwt.claim.role', true);
begin
  select * into v_booking
  from public.bookings
  where id = _booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.bookings
  set hold_status = 'canceled'
  where id = _booking_id;
  perform set_config('request.jwt.claim.role', coalesce(v_original_role, ''), true);

  insert into public.booking_audit (booking_id, from_status, to_status, actor, meta, created_at)
  values (
    _booking_id,
    v_booking.status,
    v_booking.status,
    null,
    jsonb_build_object(
      'event', 'hold_canceled',
      'reason', _reason,
      'stripe', coalesce(_stripe_response, '{}'::jsonb)
    ),
    now()
  );

  return jsonb_build_object('ok', true, 'booking_id', _booking_id);
end;
$$;

create or replace function public.fn_hold_captured(
  _booking_id uuid,
  _amount_cents int,
  _currency text,
  _stripe_response jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_currency text;
  v_existing boolean;
  v_venue_amount int;
  v_admin_amount int;
  v_status booking_status;
  v_original_role text := current_setting('request.jwt.claim.role', true);
begin
  select * into v_booking
  from public.bookings
  where id = _booking_id
  for update;

  if not found then
    raise exception 'Booking not found';
  end if;

  v_currency := coalesce(_currency, v_booking.hold_currency, 'USD');

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.bookings
  set hold_status = 'captured'
  where id = _booking_id;

  if v_booking.status = 'pending_verification' then
    update public.bookings
    set status = 'no_show'
    where id = _booking_id;
  end if;
  perform set_config('request.jwt.claim.role', coalesce(v_original_role, ''), true);

  v_existing := exists (
    select 1 from public.venue_ledger
    where booking_id = _booking_id and type = 'venue_credit_no_show'
  );

  if not v_existing then
    v_venue_amount := (_amount_cents * 9) / 10;
    v_admin_amount := _amount_cents - v_venue_amount;

    insert into public.venue_ledger (id, venue_id, type, amount_cents, currency, booking_id)
    values
      (gen_random_uuid(), v_booking.venue_id, 'venue_credit_no_show', v_venue_amount, v_currency, _booking_id),
      (gen_random_uuid(), v_booking.venue_id, 'platform_admin_no_show', v_admin_amount, v_currency, _booking_id);
  end if;

  select status into v_status from public.bookings where id = _booking_id;

  insert into public.booking_audit (booking_id, from_status, to_status, actor, meta, created_at)
  values (
    _booking_id,
    v_booking.status,
    v_status,
    null,
    jsonb_build_object(
      'event', 'hold_captured',
      'amount_cents', _amount_cents,
      'currency', v_currency,
      'stripe', coalesce(_stripe_response, '{}'::jsonb)
    ),
    now()
  );

  return jsonb_build_object('ok', true, 'booking_id', _booking_id);
end;
$$;

create or replace function public.fn_redeem(
  _qr_jti text,
  _server_name text default null,
  _table_ref text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking_id uuid;
begin
  select id into v_booking_id
  from public.bookings
  where qr_jti = _qr_jti and status = 'issued';

  if v_booking_id is null then
    raise exception 'Invalid or already used QR';
  end if;

  insert into public.redemptions (booking_id, redeemed_by, server_name, table_ref)
  values (v_booking_id, auth.uid(), _server_name, _table_ref);

  update public.bookings
  set status = 'redeemed'
  where id = v_booking_id;

  perform public.fn_enqueue('hold_cancel', v_booking_id, now());

  return jsonb_build_object('ok', true, 'booking_id', v_booking_id);
end;
$$;

create or replace function public.fn_approve_booking(
  _booking_id uuid,
  _window_start timestamptz,
  _window_end timestamptz,
  _issue_now boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  _qr text := encode(extensions.gen_random_bytes(16), 'hex');
  v_booking public.bookings%rowtype;
  v_no_show_per_person int;
  v_currency text;
  v_requires_hold boolean;
  v_hold_amount int;
  v_original_role text := current_setting('request.jwt.claim.role', true);
begin
  select * into v_booking
  from public.bookings
  where id = _booking_id
  for update;

  if not found then
    raise exception 'Booking not found %', _booking_id;
  end if;

  select p.no_show_amount_per_person, p.currency, p.requires_hold
  into v_no_show_per_person, v_currency, v_requires_hold
  from public.passes p
  where p.id = v_booking.pass_id;

  if v_requires_hold then
    if v_no_show_per_person is null then
      raise exception 'Pass % missing no-show amount', v_booking.pass_id;
    end if;
    v_hold_amount := v_no_show_per_person * v_booking.party_size;
  else
    v_hold_amount := null;
  end if;

  perform set_config('request.jwt.claim.role', 'service_role', true);

  update public.bookings
  set status = 'approved',
      arrival_window_start = _window_start,
      arrival_window_end = _window_end,
      hold_amount = v_hold_amount,
      hold_currency = coalesce(v_currency, 'USD')
  where id = _booking_id;

  if _issue_now then
    update public.bookings
    set status = 'issued',
        qr_jti = _qr
    where id = _booking_id;

    perform public.fn_after_issue_schedule(_booking_id, _window_start);
  end if;

  perform set_config('request.jwt.claim.role', coalesce(v_original_role, ''), true);

  return jsonb_build_object('ok', true, 'qr_jti', _qr);
end;
$$;
