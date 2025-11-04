-- 0003_state_guards_and_redemptions.sql

-----------------------------
-- 1) Redemptions table
-----------------------------
create table if not exists public.redemptions (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  redeemed_by uuid,                -- staff user id (optional)
  server_name text,                -- entered by staff
  table_ref   text,                -- entered by staff
  bill_photo_url text              -- optional S3 path
);

-----------------------------
-- 2) Audit trigger (insert a row when bookings are created or status changes)
-----------------------------
create or replace function public.fn_booking_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.booking_audit (booking_id, from_status, to_status, actor, meta, created_at)
    values (NEW.id, null, NEW.status, auth.uid(), null, now());
  elsif TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status then
    insert into public.booking_audit (booking_id, from_status, to_status, actor, meta, created_at)
    values (NEW.id, OLD.status, NEW.status, auth.uid(), null, now());
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_booking_audit on public.bookings;
create trigger trg_booking_audit
after insert or update on public.bookings
for each row execute function public.fn_booking_audit();

-----------------------------
-- 3) State machine + immutability + capacity + payment field guard
-----------------------------
create or replace function public.fn_booking_state_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _ok boolean := false;
  _old_status text;
  _new_status text;
  _role text := coalesce(public.current_role_claim(), '');
begin
  _old_status := coalesce(OLD.status::text, '');
  _new_status := NEW.status::text;

  -- A) Only allow sane initial statuses on INSERT
  if TG_OP = 'INSERT' then
    if NEW.status not in ('requested','approved','issued') then
      raise exception 'Invalid initial status: %', NEW.status;
    end if;
    return NEW;
  end if;

  -- B) Block illegal transitions on UPDATE
  if NEW.status is distinct from OLD.status then
    case OLD.status
      when 'requested' then _ok := NEW.status in ('approved','cancelled');
      when 'approved'  then _ok := NEW.status in ('issued','cancelled');
      when 'issued'    then _ok := NEW.status in ('redeemed','pending_verification','cancelled');
      when 'pending_verification' then _ok := NEW.status in ('redeemed_late','no_show','cancelled');
      -- Terminal states: no further transitions
      when 'redeemed','redeemed_late','no_show','cancelled' then _ok := false;
      else _ok := false;
    end case;

    if not _ok then
      raise exception 'Invalid transition % -> %', OLD.status, NEW.status;
    end if;
  end if;

  -- C) Lock critical fields once issued (or later)
  if OLD.status in ('issued','redeemed','redeemed_late','pending_verification','no_show') then
    if NEW.venue_id        is distinct from OLD.venue_id
    or NEW.pass_id         is distinct from OLD.pass_id
    or NEW.date            is distinct from OLD.date
    or NEW.party_size      is distinct from OLD.party_size
    or NEW.hold_currency   is distinct from OLD.hold_currency
    then
      raise exception 'Immutable fields cannot change after issue: venue/pass/date/party_size/currency';
    end if;
  end if;

  -- D) Only the service role can touch payment/hold fields at any time
  if (NEW.hold_amount           is distinct from OLD.hold_amount
      or NEW.payment_method_ref is distinct from OLD.payment_method_ref
      or NEW.payment_intent_ref is distinct from OLD.payment_intent_ref
      or NEW.hold_status        is distinct from OLD.hold_status)
     and _role not in ('service','service_role')
  then
    raise exception 'Payment/hold fields may only be changed by service role';
  end if;

  -- E) Consume capacity when moving into approved/issued (from a non-counted state)
  if NEW.status in ('approved','issued') and OLD.status not in ('approved','issued') then
    -- Decrement the inventory atomically; fail if insufficient
    update public.pass_inventory
    set cap = cap - NEW.party_size
    where pass_id = NEW.pass_id
      and date    = NEW.date
      and cap >= NEW.party_size
    returning true into _ok;

    if not found or not _ok then
      raise exception 'Insufficient capacity for pass % on %', NEW.pass_id, NEW.date;
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_booking_state_guard on public.bookings;
create trigger trg_booking_state_guard
before insert or update on public.bookings
for each row execute function public.fn_booking_state_guard();
