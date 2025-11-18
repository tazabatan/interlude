-- Week 7: ledger & statements infrastructure

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ledger_entry_type') then
    create type public.ledger_entry_type as enum (
      'fee_due',
      'venue_credit_no_show',
      'platform_admin_no_show',
      'adjustment'
    );
  end if;
end $$;

create table if not exists public.venue_ledger (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  entry_type public.ledger_entry_type not null,
  amount_cents integer not null,
  currency text not null default 'USD',
  booking_id uuid references public.bookings(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists venue_ledger_venue_created_at_idx on public.venue_ledger (venue_id, created_at);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  currency text not null default 'USD',
  total_cents integer not null,
  status text not null default 'draft' check (status in ('draft','sent','paid','void')),
  recipient_name text,
  recipient_email text,
  notes text,
  pdf_url text,
  payment_reference text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invoices_venue_period_idx on public.invoices (venue_id, period_start, period_end);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  ledger_id uuid references public.venue_ledger(id) on delete set null,
  description text,
  amount_cents integer not null,
  created_at timestamptz not null default now()
);

create unique index if not exists invoice_line_items_ledger_id_key
  on public.invoice_line_items(ledger_id) where ledger_id is not null;

alter table if exists public.venue_ledger
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

do $rename$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'venue_ledger'
      and column_name = 'entry_kind'
  ) then
    alter table public.venue_ledger
      rename column entry_kind to entry_type;
  end if;
end
$rename$;

alter table public.venue_ledger enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
