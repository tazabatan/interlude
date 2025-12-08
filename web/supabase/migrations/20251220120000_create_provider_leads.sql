create table if not exists public.provider_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null,
  company text,
  provider_type text,
  location text,
  website text,
  message text,
  phone text
);

alter table public.provider_leads enable row level security;
