#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER=${DB_CONTAINER:-supabase_db_interlude}

VENUE_ID=${VENUE_ID:-11111111-2222-3333-4444-555555555555}
PASS_ID=${PASS_ID:-5d0ba2c3-e1f2-42c2-9d77-c6a13d90e517}

echo "🌱 Seeding demo venue + pass data into $DB_CONTAINER..."

docker exec "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -X -U postgres -d postgres <<SQL
INSERT INTO public.venues (id, name, tz, is_test_venue)
VALUES ('${VENUE_ID}', 'Seed Venue', 'America/Anguilla', true)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    tz = EXCLUDED.tz,
    is_test_venue = EXCLUDED.is_test_venue;

INSERT INTO public.passes (
  id,
  venue_id,
  kind,
  pricing_mode,
  currency,
  min_spend_amount,
  display_price_text,
  no_show_amount_per_person,
  requires_hold,
  status,
  visibility,
  auto_approve_enabled,
  default_arrival_window_minutes,
  default_arrival_start_local,
  service_hours_open_local,
  service_hours_close_local,
  arrival_grace_minutes,
  default_daily_cap
)
VALUES (
  '${PASS_ID}',
  '${VENUE_ID}',
  'MIN_SPEND',
  'HOLD_ONLY',
  'USD',
  25000,
  'Spend $250 at Seed Venue',
  5000,
  true,
  'active',
  'members',
  true,
  90,
  '12:00',
  '09:00',
  '18:00',
  30,
  50
)
ON CONFLICT (id) DO UPDATE SET
  venue_id = EXCLUDED.venue_id,
  kind = EXCLUDED.kind,
  min_spend_amount = EXCLUDED.min_spend_amount,
  display_price_text = EXCLUDED.display_price_text,
  no_show_amount_per_person = EXCLUDED.no_show_amount_per_person,
  status = EXCLUDED.status,
  visibility = EXCLUDED.visibility,
  default_arrival_window_minutes = EXCLUDED.default_arrival_window_minutes,
  default_arrival_start_local = EXCLUDED.default_arrival_start_local,
  service_hours_open_local = EXCLUDED.service_hours_open_local,
  service_hours_close_local = EXCLUDED.service_hours_close_local,
  arrival_grace_minutes = EXCLUDED.arrival_grace_minutes,
  default_daily_cap = EXCLUDED.default_daily_cap;

DELETE FROM public.pass_inventory
WHERE pass_id = '${PASS_ID}';

INSERT INTO public.pass_inventory (id, pass_id, date, cap, paused)
SELECT gen_random_uuid(), '${PASS_ID}', (current_date + offs), 100, false
FROM generate_series(0, 30) AS offs;
SQL

echo "✅ Demo venue + pass seeded."
