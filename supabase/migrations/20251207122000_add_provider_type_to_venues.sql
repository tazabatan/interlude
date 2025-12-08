-- Add provider_type to venues to distinguish provider categories
alter table if exists public.venues
  add column if not exists provider_type text not null default 'hotel';

alter table if exists public.venues
  add constraint provider_type_check
    check (provider_type in ('hotel','restaurant','private_chef','boat_company'));
