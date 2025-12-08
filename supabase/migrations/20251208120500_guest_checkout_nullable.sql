-- Allow guest bookings by making user_id nullable.

alter table if exists public.bookings
  alter column user_id drop not null;

