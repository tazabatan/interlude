-- Migration: create core schema objects for Interlude MVP
-- Enums
create type if not exists pass_kind as enum ('MIN_SPEND', 'DAY_PASS');
create type if not exists pricing_mode as enum ('HOLD_ONLY');
create type if not exists pass_visibility as enum ('members', 'guest_only', 'both', 'private');
create type if not exists booking_status as enum (
  'requested',
  'approved',
  'issued',
  'redeemed',
  'redeemed_late',
  'pending_verification',
  'no_show',
  'cancelled',
  'declined'
);
create type if not exists hold_status as enum ('none', 'authorized', 'canceled', 'captured');
create type if not exists invoice_status as enum ('draft', 'sent', 'paid', 'void');
create type if not exists ledger_type as enum (
  'fee_due',
  'venue_credit_no_show',
  'platform_admin_no_show',
  'refund',
  'adjustment'
);

-- Table: venues
create table if not exists public.venues (
  id uuid primary key,
  name text not null,
  tz text default 'America/Anguilla',
  billing_customer_id text,
  billing_pm_id text,
  is_test_venue boolean default false,
  created_at timestamptz default now()
);

-- Table: passes
create table if not exists public.passes (
  id uuid primary key,
  venue_id uuid references public.venues (id) on delete cascade not null,
  kind pass_kind not null,
  pricing_mode pricing_mode default 'HOLD_ONLY',
  currency text default 'USD',
  min_spend_amount int,
  display_price_text text,
  no_show_amount_per_person int not null,
  requires_hold boolean default true,
  status text,
  visibility pass_visibility not null default 'members',
  auto_approve_enabled boolean default false,
  default_arrival_window_minutes int,
  created_at timestamptz default now()
);

-- Table: pass_inventory
create table if not exists public.pass_inventory (
  id uuid primary key,
  pass_id uuid references public.passes (id) on delete cascade not null,
  date date not null,
  cap int not null,
  paused boolean default false,
  created_at timestamptz default now(),
  constraint pass_inventory_unique_per_date unique (pass_id, date)
);

-- Table: bookings
create table if not exists public.bookings (
  id uuid primary key,
  user_id uuid references auth.users (id) not null,
  venue_id uuid references public.venues (id) not null,
  pass_id uuid references public.passes (id) not null,
  date date not null,
  party_size int not null check (party_size > 0),
  status booking_status not null,
  hold_amount int,
  hold_currency text default 'USD',
  payment_method_ref text,
  payment_intent_ref text,
  hold_status hold_status not null default 'none',
  arrival_window_start timestamptz,
  arrival_window_end timestamptz,
  qr_jti text unique,
  hotel_code text,
  has_guest_claim boolean default false,
  created_at timestamptz default now()
);

-- Table: booking_audit
create table if not exists public.booking_audit (
  id uuid primary key,
  booking_id uuid references public.bookings (id) on delete cascade not null,
  from_status booking_status,
  to_status booking_status not null,
  actor uuid,
  meta jsonb,
  created_at timestamptz default now()
);

-- Table: due_jobs
create table if not exists public.due_jobs (
  id uuid primary key,
  job_type text not null,
  booking_id uuid references public.bookings (id) on delete set null,
  run_at timestamptz not null,
  status text default 'pending',
  attempts int default 0,
  last_error text,
  claimed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists due_jobs_status_run_at_idx on public.due_jobs (status, run_at);

-- Table: venue_ledger
create table if not exists public.venue_ledger (
  id uuid primary key,
  venue_id uuid references public.venues (id) on delete cascade not null,
  type ledger_type not null,
  amount_cents int not null,
  currency text default 'USD',
  booking_id uuid references public.bookings (id),
  created_at timestamptz default now()
);

create index if not exists venue_ledger_venue_created_at_idx on public.venue_ledger (venue_id, created_at);

-- Table: invoices
create table if not exists public.invoices (
  id uuid primary key,
  venue_id uuid references public.venues (id) on delete cascade not null,
  period_start date not null,
  period_end date not null,
  total_cents int not null,
  currency text default 'USD',
  status invoice_status not null default 'draft',
  pdf_url text,
  payment_intent_id text,
  created_at timestamptz default now()
);

-- Table: invoice_line_items
create table if not exists public.invoice_line_items (
  id uuid primary key,
  invoice_id uuid references public.invoices (id) on delete cascade not null,
  ledger_id uuid references public.venue_ledger (id),
  description text,
  amount_cents int not null
);

-- Table: ops_idempotency
create table if not exists public.ops_idempotency (
  key text primary key,
  meta jsonb,
  created_at timestamptz default now()
);

-- Indexes for bookings (performance)
create index if not exists bookings_venue_date_idx on public.bookings (venue_id, date);
create index if not exists bookings_pass_date_idx on public.bookings (pass_id, date);
create index if not exists bookings_status_date_idx on public.bookings (status, date);
create index if not exists bookings_user_date_idx on public.bookings (user_id, date);
