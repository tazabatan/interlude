-- Pass detail enhancements: service hours + arrival grace metadata.

alter table public.passes
  add column if not exists service_hours_open_local time,
  add column if not exists service_hours_close_local time,
  add column if not exists arrival_grace_minutes int;

update public.passes
set service_hours_open_local = coalesce(service_hours_open_local, '09:00'::time),
    service_hours_close_local = coalesce(service_hours_close_local, '18:00'::time),
    arrival_grace_minutes = coalesce(arrival_grace_minutes, 30)
where service_hours_open_local is null
   or service_hours_close_local is null
   or arrival_grace_minutes is null;

alter table public.passes
  alter column service_hours_open_local set default '09:00',
  alter column service_hours_close_local set default '18:00',
  alter column arrival_grace_minutes set default 30,
  alter column service_hours_open_local set not null,
  alter column service_hours_close_local set not null,
  alter column arrival_grace_minutes set not null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'passes_service_hours_check'
      and conrelid = 'public.passes'::regclass
  ) then
    alter table public.passes drop constraint passes_service_hours_check;
  end if;
  alter table public.passes
    add constraint passes_service_hours_check
    check (service_hours_open_local < service_hours_close_local);
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'passes_arrival_grace_check'
      and conrelid = 'public.passes'::regclass
  ) then
    alter table public.passes drop constraint passes_arrival_grace_check;
  end if;
  alter table public.passes
    add constraint passes_arrival_grace_check
    check (arrival_grace_minutes >= 0 and arrival_grace_minutes <= 720);
end;
$$;
