-- 0006_booking_audit_defaults.sql
-- Ensure booking_audit rows receive generated UUIDs.

alter table public.booking_audit
  alter column id set default gen_random_uuid();

