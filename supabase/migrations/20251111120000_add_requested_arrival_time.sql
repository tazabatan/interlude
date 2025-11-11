-- Add requested_arrival_time column to bookings table
alter table public.bookings
  add column if not exists requested_arrival_time time;

comment on column public.bookings.requested_arrival_time is 'Guest-requested arrival time (local time)';
