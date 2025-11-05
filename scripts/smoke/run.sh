#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

DB_CONTAINER=${DB_CONTAINER:-supabase_db_interlude}
MEMBER_ID=${MEMBER_ID:-00000000-0000-0000-0000-000000000001}
STAFF_ID=${STAFF_ID:-00000000-0000-0000-0000-000000000002}
VENUE_ID=${VENUE_ID:-11111111-1111-1111-1111-111111111111}
PASS_ID=${PASS_ID:-22222222-2222-2222-2222-222222222222}
INVENTORY_ID=${INVENTORY_ID:-33333333-3333-3333-3333-333333333333}

echo "🔄 Preparing smoke-test fixture data..."
docker exec "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -X -U postgres -d postgres <<SQL
\set member_id '$MEMBER_ID'
\set staff_id '$STAFF_ID'
\set venue_id '$VENUE_ID'
\set pass_id '$PASS_ID'
\set inventory_id '$INVENTORY_ID'

TRUNCATE TABLE public.redemptions,
               public.booking_audit,
               public.bookings,
               public.pass_inventory,
               public.passes,
               public.venues
               RESTART IDENTITY CASCADE;

DELETE FROM auth.users
WHERE id IN (:'member_id', :'staff_id');

INSERT INTO auth.users (id, email)
VALUES
  (:'member_id', 'smoke-member@example.com'),
  (:'staff_id', 'smoke-staff@example.com');

INSERT INTO public.venues (id, name, tz)
VALUES (:'venue_id', 'Smoke Test Venue', 'America/Anguilla')
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

INSERT INTO public.pass_inventory (id, pass_id, date, cap)
VALUES (:'inventory_id', :'pass_id', current_date, 100)
ON CONFLICT (pass_id, date) DO UPDATE
SET cap = EXCLUDED.cap,
    paused = false;
SQL

echo "🧪 Running smoke scenarios..."
docker exec "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -X -U postgres -d postgres <<SQL
\set member_id '$MEMBER_ID'
\set staff_id '$STAFF_ID'
\set venue_id '$VENUE_ID'
\set pass_id '$PASS_ID'

DO \$\$
DECLARE
  v_member uuid := :'member_id';
  v_staff uuid := :'staff_id';
  v_venue uuid := :'venue_id';
  v_pass uuid := :'pass_id';

  v_booking uuid;
  v_booking2 uuid;
  v_booking3 uuid;
  v_booking4 uuid;
  v_booking5 uuid;
  v_booking6 uuid;
  v_booking7 uuid;

  v_before_cap int;
  v_after_cap int;
  v_count int;
  v_json jsonb;
  v_qr text;
BEGIN
  -- 1) Capacity decrements once
  SELECT cap INTO v_before_cap
  FROM public.pass_inventory
  WHERE pass_id = v_pass AND date = current_date;

  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"member"}', v_member), true);
  v_booking := public.fn_request_booking(v_pass, current_date, 2);

  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"venue_staff","venue_id":"%s"}', v_staff, v_venue), true);
  PERFORM public.fn_approve_booking(v_booking, now(), now() + interval '60 minutes', true);

  SELECT cap INTO v_after_cap
  FROM public.pass_inventory
  WHERE pass_id = v_pass AND date = current_date;

  IF v_after_cap <> v_before_cap - 2 THEN
    RAISE EXCEPTION 'Capacity guard failed: before %, after %', v_before_cap, v_after_cap;
  END IF;

  -- Top the inventory back up for subsequent tests.
  UPDATE public.pass_inventory
  SET cap = 100
  WHERE pass_id = v_pass AND date = current_date;

  -- 2) Illegal transition blocked
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"member"}', v_member), true);
  v_booking2 := public.fn_request_booking(v_pass, current_date, 2);

  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"venue_staff","venue_id":"%s"}', v_staff, v_venue), true);
  BEGIN
    UPDATE public.bookings
    SET status = 'redeemed'
    WHERE id = v_booking2;
    RAISE EXCEPTION 'Illegal transition did not raise';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('Invalid transition' IN SQLERRM) = 0 THEN
        RAISE;
      END IF;
  END;

  IF (SELECT status FROM public.bookings WHERE id = v_booking2) <> 'requested' THEN
    RAISE EXCEPTION 'Booking status mutated after failed transition';
  END IF;

  -- 3) Immutability after issue
  PERFORM public.fn_approve_booking(v_booking2, now(), now() + interval '60 minutes', true);
  BEGIN
    UPDATE public.bookings
    SET party_size = party_size + 1
    WHERE id = v_booking2;
    RAISE EXCEPTION 'Immutable fields were editable after issue';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('Immutable fields' IN SQLERRM) = 0 THEN
        RAISE;
      END IF;
  END;

  -- 4) Payment fields locked to service role
  BEGIN
    UPDATE public.bookings
    SET hold_amount = 12345
    WHERE id = v_booking2;
    RAISE EXCEPTION 'Staff updated payment fields without error';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('Payment/hold fields' IN SQLERRM) = 0 THEN
        RAISE;
      END IF;
  END;

  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"service_role"}', v_staff), true);
  UPDATE public.bookings
  SET hold_amount = 0
  WHERE id = v_booking2;

  -- 5) RLS visibility checks
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"member"}', v_member), true);
  SELECT count(*) INTO v_count FROM public.bookings;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Member RLS returned zero bookings';
  END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"venue_staff"}', v_staff), true);
  SELECT count(*) INTO v_count FROM public.bookings;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Staff without venue claim saw % bookings', v_count;
  END IF;
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"venue_staff","venue_id":"%s"}', v_staff, v_venue), true);
  SELECT count(*) INTO v_count FROM public.bookings;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Staff with venue claim saw zero bookings';
  END IF;
  EXECUTE 'RESET ROLE';

  -- 6) Pending verification transitions
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"member"}', v_member), true);
  v_booking3 := public.fn_request_booking(v_pass, current_date, 1);
  v_booking4 := public.fn_request_booking(v_pass, current_date, 1);

  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"venue_staff","venue_id":"%s"}', v_staff, v_venue), true);
  PERFORM public.fn_approve_booking(v_booking3, now(), now() + interval '60 minutes', true);
  PERFORM public.fn_approve_booking(v_booking4, now(), now() + interval '60 minutes', true);

  UPDATE public.bookings SET status = 'pending_verification' WHERE id = v_booking3;
  UPDATE public.bookings SET status = 'redeemed_late' WHERE id = v_booking3;

  UPDATE public.bookings SET status = 'pending_verification' WHERE id = v_booking4;
  UPDATE public.bookings SET status = 'no_show' WHERE id = v_booking4;

  IF (SELECT status FROM public.bookings WHERE id = v_booking3) <> 'redeemed_late' THEN
    RAISE EXCEPTION 'Expected redeemed_late, saw %', (SELECT status FROM public.bookings WHERE id = v_booking3);
  END IF;
  IF (SELECT status FROM public.bookings WHERE id = v_booking4) <> 'no_show' THEN
    RAISE EXCEPTION 'Expected no_show, saw %', (SELECT status FROM public.bookings WHERE id = v_booking4);
  END IF;

  -- 7) QR uniqueness + idempotent redeem
  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"member"}', v_member), true);
  v_booking5 := public.fn_request_booking(v_pass, current_date, 1);

  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"venue_staff","venue_id":"%s"}', v_staff, v_venue), true);
  v_json := public.fn_approve_booking(v_booking5, now(), now() + interval '60 minutes', true);
  v_qr := v_json ->> 'qr_jti';

  PERFORM public.fn_redeem(v_qr, 'Staff A', 'T1');

  BEGIN
    PERFORM public.fn_redeem(v_qr, 'Staff A', 'T1');
    RAISE EXCEPTION 'Duplicate redeem unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('Invalid or already used QR' IN SQLERRM) = 0 THEN
        RAISE;
      END IF;
  END;

  SELECT count(*) INTO v_count
  FROM public.redemptions WHERE booking_id = v_booking5;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Expected 1 redemption row, found %', v_count;
  END IF;

  -- 8) Inventory contention
  UPDATE public.pass_inventory
  SET cap = 1
  WHERE pass_id = v_pass AND date = current_date;

  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"member"}', v_member), true);
  v_booking6 := public.fn_request_booking(v_pass, current_date, 1);
  v_booking7 := public.fn_request_booking(v_pass, current_date, 1);

  PERFORM set_config('request.jwt.claims', format('{"sub":"%s","role":"venue_staff","venue_id":"%s"}', v_staff, v_venue), true);
  PERFORM public.fn_approve_booking(v_booking6, now(), now() + interval '60 minutes', true);

  BEGIN
    PERFORM public.fn_approve_booking(v_booking7, now(), now() + interval '60 minutes', true);
    RAISE EXCEPTION 'Capacity contention second approval unexpectedly succeeded';
  EXCEPTION
    WHEN OTHERS THEN
      IF position('Insufficient capacity' IN SQLERRM) = 0 THEN
        RAISE;
      END IF;
  END;

  SELECT cap INTO v_after_cap
  FROM public.pass_inventory
  WHERE pass_id = v_pass AND date = current_date;
  IF v_after_cap <> 0 THEN
    RAISE EXCEPTION 'Expected cap 0 after contention scenario, found %', v_after_cap;
  END IF;

  -- Restore inventory to a healthy value for manual follow-up if required.
  UPDATE public.pass_inventory
  SET cap = 100
  WHERE pass_id = v_pass AND date = current_date;
END;
\$\$;
SQL

echo "🧪 Running concurrency guard check..."
DB_CONTAINER="$DB_CONTAINER" "$ROOT_DIR/scripts/concurrency/run.sh"

echo "✅ Smoke tests passed."
