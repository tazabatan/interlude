set check_function_bodies = off;

-- Venue lifecycle metadata
alter table public.venues
  add column if not exists status text;

update public.venues
set status = coalesce(status, 'active')
where status is null;

alter table public.venues
  alter column status set default 'draft',
  alter column status set not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'venues_status_check'
      and conrelid = 'public.venues'::regclass
  ) then
    alter table public.venues drop constraint venues_status_check;
  end if;
  alter table public.venues
    add constraint venues_status_check
    check (status in ('draft','active','paused'));
end;
$$;

alter table public.venues
  add column if not exists profile jsonb not null default '{}'::jsonb;

-- Pass profile + cancellation metadata
alter table public.passes
  add column if not exists profile jsonb not null default '{}'::jsonb,
  add column if not exists cancellation_window_days int not null default 2,
  add column if not exists cancellation_cutoff_local time not null default '12:00';

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'passes_status_check'
      and conrelid = 'public.passes'::regclass
  ) then
    alter table public.passes drop constraint passes_status_check;
  end if;
  alter table public.passes
    add constraint passes_status_check
    check (status in ('draft','active','paused'));
end;
$$;

-- Storage bucket for uploaded media assets
insert into storage.buckets (id, name, public)
values ('venue-media', 'venue-media', true)
on conflict (id) do update
  set public = excluded.public;
