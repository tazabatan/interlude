#!/usr/bin/env bash
set -euo pipefail

# Optional overrides for local runs
DB_CONTAINER=${DB_CONTAINER:-supabase_db_interlude}
MEMBER_ID=${MEMBER_ID:-44444444-4444-4444-4444-444444444444}
STAFF_ID=${STAFF_ID:-55555555-5555-5555-5555-555555555555}
VENUE_ID=${VENUE_ID:-66666666-6666-6666-6666-666666666666}
PASS_ID=${PASS_ID:-77777777-7777-7777-7777-777777777777}
INVENTORY_ID=${INVENTORY_ID:-88888888-8888-8888-8888-888888888888}

DATE=${DATE_OVERRIDE:-$(date +%F)}

echo "🔄 Preparing concurrency test fixtures..."
docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -X -U postgres -d postgres <<SQL
\set member_id '$MEMBER_ID'
\set staff_id '$STAFF_ID'
\set venue_id '$VENUE_ID'
\set pass_id '$PASS_ID'
\set inventory_id '$INVENTORY_ID'
\set booking_date '$DATE'

DELETE FROM public.booking_audit
WHERE booking_id IN (SELECT id FROM public.bookings WHERE pass_id = :'pass_id');

DELETE FROM public.redemptions
WHERE booking_id IN (SELECT id FROM public.bookings WHERE pass_id = :'pass_id');

DELETE FROM public.bookings
WHERE pass_id = :'pass_id';

DELETE FROM public.pass_inventory
WHERE id = :'inventory_id' OR (pass_id = :'pass_id' AND date = :'booking_date');

DELETE FROM public.passes
WHERE id = :'pass_id';

DELETE FROM public.venues
WHERE id = :'venue_id';

DELETE FROM auth.users
WHERE id IN (:'member_id', :'staff_id');

INSERT INTO auth.users (id, email)
VALUES
  (:'member_id', 'concurrency-member@example.com'),
  (:'staff_id', 'concurrency-staff@example.com');

INSERT INTO public.venues (id, name, tz)
VALUES (:'venue_id', 'Concurrency Test Venue', 'America/Anguilla')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    tz   = EXCLUDED.tz;

INSERT INTO public.passes (
  id, venue_id, kind, pricing_mode, no_show_amount_per_person,
  requires_hold, visibility, auto_approve_enabled
)
VALUES (:'pass_id', :'venue_id', 'MIN_SPEND', 'HOLD_ONLY', 2500, true, 'members', false)
ON CONFLICT (id) DO UPDATE
SET venue_id   = EXCLUDED.venue_id,
    kind       = EXCLUDED.kind,
    visibility = EXCLUDED.visibility;

INSERT INTO public.pass_inventory (id, pass_id, date, cap, paused)
VALUES (:'inventory_id', :'pass_id', :'booking_date', 1, false)
ON CONFLICT (pass_id, date) DO UPDATE
SET id = :'inventory_id',
    cap = EXCLUDED.cap,
    paused = false;
SQL

echo "🧾 Creating two pending bookings that contend for the same cap..."
BOOKING_ONE=$(
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -X -At -U postgres -d postgres <<SQL
SET ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"member"}', '$MEMBER_ID'),
  false
);
SELECT public.fn_request_booking('$PASS_ID', '$DATE', 1);
RESET ROLE;
SQL
)

BOOKING_TWO=$(
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -X -At -U postgres -d postgres <<SQL
SET ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"member"}', '$MEMBER_ID'),
  false
);
SELECT public.fn_request_booking('$PASS_ID', '$DATE', 1);
RESET ROLE;
SQL
)

extract_uuid() {
  echo "$1" | awk '/^[0-9a-fA-F-]{36}$/ {print; exit}'
}

BOOKING_ONE=$(extract_uuid "$BOOKING_ONE")
BOOKING_TWO=$(extract_uuid "$BOOKING_TWO")

if [[ -z "$BOOKING_ONE" || -z "$BOOKING_TWO" ]]; then
  echo "❌ Failed to create bookings for concurrency test."
  exit 1
fi

echo "   - booking one: $BOOKING_ONE"
echo "   - booking two: $BOOKING_TWO"

echo "🚦 Launching concurrent approvals (expect exactly one to succeed)..."
LOG_ONE=$(mktemp)
LOG_TWO=$(mktemp)

set +e
docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -X -U postgres -d postgres <<SQL >"$LOG_ONE" 2>&1 &
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"service_role"}', '$STAFF_ID'),
  true
);
SELECT pg_sleep(0.2);
SELECT public.fn_approve_booking('$BOOKING_ONE', now(), now() + interval '60 minutes', true);
RESET ROLE;
COMMIT;
SQL
PID_ONE=$!

docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -X -U postgres -d postgres <<SQL >"$LOG_TWO" 2>&1 &
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  format('{"sub":"%s","role":"service_role"}', '$STAFF_ID'),
  true
);
SELECT pg_sleep(0.2);
SELECT public.fn_approve_booking('$BOOKING_TWO', now(), now() + interval '60 minutes', true);
RESET ROLE;
COMMIT;
SQL
PID_TWO=$!

wait "$PID_ONE"
STATUS_ONE=$?
wait "$PID_TWO"
STATUS_TWO=$?
set -e

echo "📄 Session 1 exit code: $STATUS_ONE"
echo "📄 Session 2 exit code: $STATUS_TWO"

echo "🧾 Session 1 log:"
cat "$LOG_ONE"
echo "🧾 Session 2 log:"
cat "$LOG_TWO"

if [[ $STATUS_ONE -eq 0 && $STATUS_TWO -eq 0 ]]; then
  echo "❌ Both approvals succeeded; capacity guard failed."
  exit 1
fi

if [[ $STATUS_ONE -ne 0 && $STATUS_TWO -ne 0 ]]; then
  echo "❌ Both approvals failed; expected exactly one success."
  exit 1
fi

echo "🔍 Verifying resulting state..."
docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -X -U postgres -d postgres <<SQL
\set booking_one '$BOOKING_ONE'
\set booking_two '$BOOKING_TWO'
\set pass_id '$PASS_ID'
\set booking_date '$DATE'

SELECT id, status
FROM public.bookings
WHERE id IN (:'booking_one', :'booking_two')
ORDER BY id;

SELECT cap
FROM public.pass_inventory
WHERE pass_id = :'pass_id' AND date = :'booking_date';
SQL

SUCCESSFUL_BOOKING=$(docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -X -At -U postgres -d postgres <<SQL
SELECT id
FROM public.bookings
WHERE id IN ('$BOOKING_ONE', '$BOOKING_TWO') AND status = 'issued';
SQL
)

if [[ -z "$SUCCESSFUL_BOOKING" ]]; then
  echo "❌ No booking ended in 'issued'; concurrency guard result unexpected."
  exit 1
fi

echo "✅ Concurrency test passed. Booking $SUCCESSFUL_BOOKING captured the single available cap."
