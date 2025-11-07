-- Default daily cap support and capacity fallback.

alter table public.passes
  add column if not exists default_daily_cap int;

update public.passes
set default_daily_cap = coalesce(default_daily_cap, 30)
where default_daily_cap is null;

alter table public.passes
  alter column default_daily_cap set default 30,
  alter column default_daily_cap set not null;

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
      when 'requested' then _ok := NEW.status in ('approved','cancelled','declined');
      when 'approved'  then _ok := NEW.status in ('issued','cancelled');
      when 'issued'    then _ok := NEW.status in ('redeemed','pending_verification','cancelled');
      when 'pending_verification' then _ok := NEW.status in ('redeemed_late','no_show','cancelled');
      when 'declined' then _ok := NEW.status in ('requested');
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
    insert into public.pass_inventory (id, pass_id, date, cap, paused)
    select gen_random_uuid(), NEW.pass_id, NEW.date, p.default_daily_cap, false
    from public.passes p
    where p.id = NEW.pass_id
      and not exists (
        select 1 from public.pass_inventory inv
        where inv.pass_id = NEW.pass_id
          and inv.date = NEW.date
      );

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
