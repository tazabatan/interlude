-- 0004_redemptions_rls.sql
-- Secure the redemptions table with RLS and add a reporting index.

-- 1) Enable RLS
alter table if exists public.redemptions enable row level security;

-- 2) Helper: we already have current_role_claim() and current_venue_claim()
--    from 0002.

-- 3) Visibility policies
-- Members can see redemptions tied to their own bookings
create policy redemptions_member_select
on public.redemptions
for select
using (
  public.current_role_claim() = 'member'
  and exists (
    select 1
    from public.bookings b
    where b.id = redemptions.booking_id
      and b.user_id = auth.uid()
  )
);

-- Venue staff/managers can see redemptions for bookings at their venue
create policy redemptions_staff_select
on public.redemptions
for select
using (
  public.current_role_claim() in ('venue_staff','venue_manager')
  and exists (
    select 1
    from public.bookings b
    where b.id = redemptions.booking_id
      and b.venue_id = public.current_venue_claim()
  )
);

-- For now, only the service role should be allowed to insert/update/delete.
-- (Your fn_redeem RPC will perform the insert server-side.)
create policy redemptions_service_modify
on public.redemptions
for all
using ( public.current_role_claim() in ('service','service_role') )
with check ( public.current_role_claim() in ('service','service_role') );

-- 4) Reporting index (nice for dashboards)
create index if not exists redemptions_redeemed_at_idx
  on public.redemptions (redeemed_at);

