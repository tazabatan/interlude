-- Migration: enable RLS policies and define security definer RPC stubs

-- Helper expressions
create or replace function public.current_role_claim()
returns text
language sql
stable
as $$
  with vals as (
    select coalesce(
      nullif(auth.jwt() ->> 'role', ''),
      nullif(current_setting('request.jwt.claim.role', true), '')
    ) as role
  )
  select case
    when vals.role is null then 'member'
    when vals.role = 'authenticated' then 'member'
    else vals.role
  end
  from vals;
$$;

create or replace function public.current_venue_claim()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'venue_id', '')::uuid,
    nullif(current_setting('request.jwt.claim.venue_id', true), '')::uuid
  );
$$;

alter table if exists public.venues enable row level security;
alter table if exists public.passes enable row level security;
alter table if exists public.pass_inventory enable row level security;
alter table if exists public.bookings enable row level security;
alter table if exists public.booking_audit enable row level security;
alter table if exists public.venue_ledger enable row level security;
alter table if exists public.invoices enable row level security;
alter table if exists public.invoice_line_items enable row level security;

create policy bookings_members_select
on public.bookings
for select
using (
  current_role_claim() = 'member'
  and auth.uid() = user_id
);

create policy bookings_members_insert
on public.bookings
for insert
with check (
  current_role_claim() = 'member'
  and auth.uid() = user_id
  and hold_amount is null
  and payment_method_ref is null
  and payment_intent_ref is null
  and hold_status = 'none'
);

create policy bookings_staff_select
on public.bookings
for select
using (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and venue_id = current_venue_claim()
);

-- Booking audit (mirror booking visibility)
create policy booking_audit_member_select
on public.booking_audit
for select
using (
  current_role_claim() = 'member'
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.user_id = auth.uid()
  )
);

create policy booking_audit_staff_select
on public.booking_audit
for select
using (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_id
      and b.venue_id = current_venue_claim()
  )
);

-- Venues
create policy venues_staff_select
on public.venues
for select
using (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and id = current_venue_claim()
);

-- Passes
create policy passes_staff_select
on public.passes
for select
using (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and venue_id = current_venue_claim()
);

create policy passes_staff_modify
on public.passes
for all
using (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and venue_id = current_venue_claim()
)
with check (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and venue_id = current_venue_claim()
);

-- Pass inventory
create policy pass_inventory_staff_select
on public.pass_inventory
for select
using (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and exists (
    select 1
    from public.passes p
    where p.id = pass_inventory.pass_id
      and p.venue_id = current_venue_claim()
  )
);

create policy pass_inventory_staff_modify
on public.pass_inventory
for all
using (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and exists (
    select 1
    from public.passes p
    where p.id = pass_inventory.pass_id
      and p.venue_id = current_venue_claim()
  )
)
with check (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and exists (
    select 1
    from public.passes p
    where p.id = pass_inventory.pass_id
      and p.venue_id = current_venue_claim()
  )
);

-- Venue ledger & invoices visibility
create policy venue_ledger_staff_select
on public.venue_ledger
for select
using (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and venue_id = current_venue_claim()
);

create policy invoices_staff_select
on public.invoices
for select
using (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and venue_id = current_venue_claim()
);

create policy invoice_line_items_staff_select
on public.invoice_line_items
for select
using (
  current_role_claim() in ('venue_staff', 'venue_manager')
  and exists (
    select 1
    from public.invoices i
    where i.id = invoice_line_items.invoice_id
      and i.venue_id = current_venue_claim()
  )
);

-- SECURITY DEFINER RPC stubs (no-op bodies for now)
create or replace function public.fn_request_booking(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('status', 'not_implemented');
end;
$$;

create or replace function public.fn_approve_booking(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('status', 'not_implemented');
end;
$$;

create or replace function public.fn_decline_booking(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('status', 'not_implemented');
end;
$$;

create or replace function public.fn_redeem(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('status', 'not_implemented');
end;
$$;

create or replace function public.fn_mark_attended(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('status', 'not_implemented');
end;
$$;

create or replace function public.fn_set_daily_cap(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('status', 'not_implemented');
end;
$$;

create or replace function public.fn_toggle_pass_status(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('status', 'not_implemented');
end;
$$;

create or replace function public.fn_update_pass(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('status', 'not_implemented');
end;
$$;

create or replace function public.fn_release_expired_holds(payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object('status', 'not_implemented');
end;
$$;
