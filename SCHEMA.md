# Database Schema (Supabase)

## Enums (recommended to prevent typos)
-- Define as Postgres enums in migrations:
-- pass_kind:        MIN_SPEND | DAY_PASS
-- pricing_mode:     HOLD_ONLY
-- pass_visibility:  members | guest_only | both | private
-- booking_status:   requested | approved | issued | redeemed | redeemed_late | pending_verification | no_show | cancelled | declined
-- hold_status:      none | authorized | canceled | captured
-- invoice_status:   draft | sent | paid | void
-- ledger_type:      fee_due | venue_credit_no_show | platform_admin_no_show | refund | adjustment

## Tables

venues
  id uuid primary key
  name text not null
  tz text default 'America/Anguilla'
  billing_customer_id text
  billing_pm_id text
  is_test_venue boolean default false
  created_at timestamptz default now()

passes
  id uuid primary key
  venue_id uuid references venues not null
  kind pass_kind not null
  pricing_mode pricing_mode default 'HOLD_ONLY'
  currency text default 'USD'
  min_spend_amount int                       -- for MIN_SPEND (integer cents)
  display_price_text text                    -- hotel copy (display only)
  no_show_amount_per_person int not null     -- integer cents
  requires_hold boolean default true
  status text                                -- optional operational status
  visibility pass_visibility not null default 'members'
  auto_approve_enabled boolean default false
  default_arrival_window_minutes int
  created_at timestamptz default now()

pass_inventory
  id uuid primary key
  pass_id uuid references passes not null
  date date not null
  cap int not null
  paused boolean default false
  created_at timestamptz default now()
  -- Ensure one row per pass per date
  UNIQUE (pass_id, date)

bookings
  id uuid primary key
  user_id uuid references auth.users not null
  venue_id uuid references venues not null
  pass_id uuid references passes not null
  date date not null
  party_size int not null check (party_size > 0)
  status booking_status not null
  hold_amount int                             -- integer cents, computed at issue
  hold_currency text default 'USD'
  payment_method_ref text
  payment_intent_ref text
  hold_status hold_status not null default 'none'
  arrival_window_start timestamptz
  arrival_window_end timestamptz
  qr_jti text unique
  hotel_code text
  has_guest_claim boolean default false
  created_at timestamptz default now()
  -- Useful to prevent dup spam (adjust policy as needed)
  -- Optional: UNIQUE (user_id, pass_id, date) DEFERRABLE INITIALLY IMMEDIATE

booking_audit
  id uuid primary key
  booking_id uuid references bookings not null
  from_status booking_status
  to_status booking_status not null
  actor uuid                                  -- user id or service
  meta jsonb
  created_at timestamptz default now()

due_jobs
  id uuid primary key
  job_type text not null                      -- e.g., authorize_hold, capture_after_24h
  booking_id uuid references bookings
  run_at timestamptz not null
  status text default 'pending'
  attempts int default 0
  last_error text
  claimed_at timestamptz
  created_at timestamptz default now()
  -- Indexes for worker
  INDEX (status, run_at)

venue_ledger
  id uuid primary key
  venue_id uuid references venues not null
  type ledger_type not null
  amount_cents int not null
  currency text default 'USD'
  booking_id uuid references bookings
  created_at timestamptz default now()
  -- Index for statements
  INDEX (venue_id, created_at)

invoices
  id uuid primary key
  venue_id uuid references venues not null
  period_start date not null
  period_end date not null
  total_cents int not null
  currency text default 'USD'
  status invoice_status not null default 'draft'
  pdf_url text
  payment_intent_id text
  created_at timestamptz default now()

invoice_line_items
  id uuid primary key
  invoice_id uuid references invoices not null
  ledger_id uuid references venue_ledger
  description text
  amount_cents int not null

ops_idempotency
  key text primary key
  meta jsonb
  created_at timestamptz default now()

## RLS POLICIES (outline)
- members: can only SELECT/INSERT their own bookings (user_id = auth.uid()).
- venue_staff / venue_manager: CRUD only for rows where venue_id matches their JWT claim.
- admin/service: elevated via RLS bypass or SECURITY DEFINER RPCs.
- Sensitive fields (hold_*, payment_*): writeable only via service-role Edge Functions.

## Indices you’ll likely want
- bookings (venue_id, date), (pass_id, date), (status, date)
- pass_inventory (pass_id, date) unique (already specified)
