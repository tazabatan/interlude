-- Table to assign concierge passes (boat/private chef) to specific users (manager/staff)
create table if not exists public.concierge_pass_assignments (
  id uuid primary key default gen_random_uuid(),
  pass_id uuid not null references public.passes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('manager','staff')),
  created_at timestamptz not null default now(),
  unique (pass_id, user_id)
);

create index if not exists concierge_pass_assignments_user_idx on public.concierge_pass_assignments (user_id);
create index if not exists concierge_pass_assignments_pass_idx on public.concierge_pass_assignments (pass_id);
