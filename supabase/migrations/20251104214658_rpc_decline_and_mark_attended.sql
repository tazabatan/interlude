-- rpc_decline_and_mark_attended.sql
-- Adds idempotency store and RPCs for declining bookings and marking pending verification bookings as attended.

create table if not exists public.ops_idempotency (
  key text primary key,
  meta jsonb,
  created_at timestamptz default now()
);

create or replace function public.fn_decline_booking(
  _booking_id uuid,
  _reason text default null,
  _idem_key text default null
) returns jsonb
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
  v_rows integer;
  v_meta jsonb := case when _reason is null then null else jsonb_build_object('reason', _reason) end;
begin
  if _idem_key is not null then
    insert into public.ops_idempotency (key, meta)
    values (_idem_key, jsonb_build_object('fn', 'fn_decline_booking', 'booking_id', _booking_id))
    on conflict do nothing;

    get diagnostics v_rows = ROW_COUNT;
    if v_rows = 0 then
      return jsonb_build_object('ok', true, 'booking_id', _booking_id, 'status', 'declined', 'idem', true);
    end if;
  end if;

  if v_role not in ('venue_staff', 'venue_manager', 'admin', 'service', 'service_role') then
    raise exception 'forbidden';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = _booking_id;

  if not found then
    raise exception 'booking not found';
  end if;

  if v_role in ('venue_staff', 'venue_manager') then
    if v_venue_claim is null or v_venue_claim <> v_booking.venue_id then
      raise exception 'forbidden: venue mismatch';
    end if;
  end if;

  if v_booking.status = 'declined' then
    return jsonb_build_object('ok', true, 'booking_id', v_booking.id, 'status', v_booking.status, 'idem', true);
  end if;

  if v_booking.status <> 'requested' then
    raise exception 'invalid transition from %', v_booking.status;
  end if;

  update public.bookings
  set status = 'declined'
  where id = _booking_id;

  insert into public.booking_audit (booking_id, from_status, to_status, actor, meta)
  values (_booking_id, 'requested', 'declined', v_staff, v_meta);

  return jsonb_build_object('ok', true, 'booking_id', _booking_id, 'status', 'declined');
end;
$$;

create or replace function public.fn_mark_attended(
  _booking_id uuid,
  _note text default null,
  _idem_key text default null
) returns jsonb
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
  v_rows integer;
  v_meta jsonb := case when _note is null then null else jsonb_build_object('note', _note) end;
begin
  if _idem_key is not null then
    insert into public.ops_idempotency (key, meta)
    values (_idem_key, jsonb_build_object('fn', 'fn_mark_attended', 'booking_id', _booking_id))
    on conflict do nothing;

    get diagnostics v_rows = ROW_COUNT;
    if v_rows = 0 then
      return jsonb_build_object('ok', true, 'booking_id', _booking_id, 'status', 'redeemed_late', 'idem', true);
    end if;
  end if;

  if v_role not in ('venue_staff', 'venue_manager', 'admin', 'service', 'service_role') then
    raise exception 'forbidden';
  end if;

  select *
  into v_booking
  from public.bookings
  where id = _booking_id;

  if not found then
    raise exception 'booking not found';
  end if;

  if v_role in ('venue_staff', 'venue_manager') then
    if v_venue_claim is null or v_venue_claim <> v_booking.venue_id then
      raise exception 'forbidden: venue mismatch';
    end if;
  end if;

  if v_booking.status = 'redeemed_late' then
    return jsonb_build_object('ok', true, 'booking_id', v_booking.id, 'status', v_booking.status, 'idem', true);
  end if;

  if v_booking.status <> 'pending_verification' then
    raise exception 'invalid transition from %', v_booking.status;
  end if;

  update public.bookings
  set status = 'redeemed_late'
  where id = _booking_id;

  insert into public.booking_audit (booking_id, from_status, to_status, actor, meta)
  values (_booking_id, 'pending_verification', 'redeemed_late', v_staff, v_meta);

  insert into public.due_jobs (id, job_type, booking_id, run_at)
  select gen_random_uuid(), 'hold_cancel', _booking_id, now()
  where not exists (
    select 1
    from public.due_jobs
    where booking_id = _booking_id
      and job_type = 'hold_cancel'
  );

  return jsonb_build_object('ok', true, 'booking_id', _booking_id, 'status', 'redeemed_late');
end;
$$;
