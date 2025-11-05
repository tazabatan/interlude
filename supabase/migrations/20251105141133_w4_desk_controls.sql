-- W4 Desk & Controls: enforce pass defaults and expose manager RPCs.

set check_function_bodies = off;

create extension if not exists btree_gist;

alter table public.passes
  add column if not exists default_arrival_start_local time default '12:00';

-- Backfill and enforce pass-level defaults.
update public.passes
set auto_approve_enabled = coalesce(auto_approve_enabled, false),
    default_arrival_window_minutes = coalesce(default_arrival_window_minutes, 60),
    status = coalesce(status, 'active'),
    default_arrival_start_local = coalesce(default_arrival_start_local, '12:00'::time);

alter table public.passes
  alter column auto_approve_enabled set default false,
  alter column auto_approve_enabled set not null,
  alter column default_arrival_window_minutes set default 60,
  alter column default_arrival_window_minutes set not null,
  alter column default_arrival_start_local set default '12:00',
  alter column status set default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'passes_status_check'
      and conrelid = 'public.passes'::regclass
  ) then
    alter table public.passes
      add constraint passes_status_check check (status in ('active', 'paused'));
  end if;
end;
$$;

alter table public.passes
  alter column status set not null,
  alter column default_arrival_start_local set not null;

alter table public.pass_inventory
  alter column paused set default false,
  alter column paused set not null;

-- RPCs for desk controls.
create or replace function public.fn_set_auto_approve(p_pass_id uuid, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare _venue uuid;
begin
  update public.passes
     set auto_approve_enabled = p_enabled
   where id = p_pass_id
   returning venue_id into _venue;

  if not found then
    raise exception 'Pass % not found', p_pass_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'pass_id', p_pass_id,
    'auto_approve_enabled', p_enabled,
    'venue_id', _venue
  );
end;
$$;

create or replace function public.fn_set_default_arrival_window(p_pass_id uuid, p_minutes int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare _venue uuid;
begin
  if p_minutes <= 0 then
    raise exception 'default_arrival_window_minutes must be positive';
  end if;

  update public.passes
     set default_arrival_window_minutes = p_minutes
   where id = p_pass_id
   returning venue_id into _venue;

  if not found then
    raise exception 'Pass % not found', p_pass_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'pass_id', p_pass_id,
    'minutes', p_minutes,
    'venue_id', _venue
  );
end;
$$;

create or replace function public.fn_set_daily_cap(p_pass_id uuid, p_date date, p_cap int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare _row public.pass_inventory;
begin
  if p_cap < 0 then
    raise exception 'cap must be >= 0';
  end if;

  insert into public.pass_inventory (id, pass_id, date, cap)
  values (gen_random_uuid(), p_pass_id, p_date, p_cap)
  on conflict (pass_id, date) do update
    set cap = excluded.cap
  returning * into _row;

  return jsonb_build_object(
    'ok', true,
    'pass_id', _row.pass_id,
    'date', _row.date,
    'cap', _row.cap,
    'paused', _row.paused
  );
end;
$$;

create or replace function public.fn_set_paused(p_pass_id uuid, p_date date, p_paused boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare _row public.pass_inventory;
begin
  insert into public.pass_inventory (id, pass_id, date, cap, paused)
  values (gen_random_uuid(), p_pass_id, p_date, 0, p_paused)
  on conflict (pass_id, date) do update
    set paused = excluded.paused
  returning * into _row;

  return jsonb_build_object(
    'ok', true,
    'pass_id', _row.pass_id,
    'date', _row.date,
    'paused', _row.paused,
    'cap', _row.cap
  );
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
  v_default_minutes int;
  v_default_start_local time;
  v_venue_tz text;
  v_default_start timestamptz;
  v_default_end timestamptz;
  v_window_start timestamptz := _window_start;
  v_window_end timestamptz := _window_end;
  v_original_role text := current_setting('request.jwt.claim.role', true);
begin
  select * into v_booking
  from public.bookings
  where id = _booking_id
  for update;

  if not found then
    raise exception 'Booking not found %', _booking_id;
  end if;

  select p.no_show_amount_per_person,
         p.currency,
         p.requires_hold,
         p.default_arrival_window_minutes,
         p.default_arrival_start_local,
         v.tz
    into v_no_show_per_person,
         v_currency,
         v_requires_hold,
         v_default_minutes,
         v_default_start_local,
         v_venue_tz
  from public.passes p
  join public.venues v on v.id = p.venue_id
  where p.id = v_booking.pass_id;

  if v_window_start is null or v_window_end is null then
    v_default_start := (
      (v_booking.date + v_default_start_local)::timestamp
      at time zone coalesce(v_venue_tz, 'UTC')
    );
    v_default_end := v_default_start + make_interval(mins => coalesce(v_default_minutes, 60));

    v_window_start := coalesce(v_window_start, v_default_start);
    v_window_end := coalesce(v_window_end, v_default_end);
  end if;

  if v_window_end <= v_window_start then
    raise exception 'arrival window end must be after start';
  end if;

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
      arrival_window_start = v_window_start,
      arrival_window_end = v_window_end,
      hold_amount = v_hold_amount,
      hold_currency = coalesce(v_currency, 'USD')
  where id = _booking_id;

  if _issue_now then
    update public.bookings
    set status = 'issued',
        qr_jti = _qr
    where id = _booking_id;

    perform public.fn_after_issue_schedule(_booking_id, v_window_start);
  end if;

  perform set_config('request.jwt.claim.role', coalesce(v_original_role, ''), true);

  return jsonb_build_object('ok', true, 'qr_jti', _qr);
end;
$$;

create or replace function public.fn_force_authorize_now(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  update public.due_jobs
     set run_at = now(),
         status = 'pending',
         last_error = null
   where booking_id = p_booking_id
     and job_type = 'hold_authorize';

  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'ok', v_count > 0,
    'updated', v_count
  );
end;
$$;
