# Interlude Build Plan and Schedule

1) Scope & principles (locked)

- Wedge: private, QR-verified access; mandatory no-show holds.
- Gating: Members + signed Guest+ hotel links. No public browse.
- Stack: Next.js (App Router) + Tailwind/shadcn, Supabase (DB/Auth/Storage/Edge), Stripe (UK account) for holds only, Resend/SendGrid for email, Sentry.
- Anguilla rule: Pay at venue for all products; the platform only runs the no-show hold. Venue is MoR for guest spend.
- Venue terms (explicit): captured no-show fees are 90% credited to the venue / 10% retained by Interlude (admin), auto-netted on weekly statements.

2) Products (both pay-at-venue)

**Min-Spend Pass (restaurants/beach clubs)**

- Venue sets min_spend; guest pays bill at venue.
- Mandatory hold per person (for example, USD 25–50).

**Day Pass (hotels)**

- Venue shows price (display-only); guest pays at venue.
- Mandatory hold (for example, 25–50% of price, capped at USD 100 per person).

**Economics**

- Platform fee: 10% of redeemed bookings, billed to venue weekly.
- Captured no-show: 10% retained, 90% venue credit (netted on statement).

3) Core flows (hold-only)

- Request → Approve (manual or auto) → Issue (QR + arrival window).
- T-1 14:00 (America/Anguilla): authorize hold.
- Scan: cancel hold → Redeemed.
- No scan at close: Pending Verification (24h).
- Late scan or confirm attended ⇒ cancel hold → Redeemed late.
- Guest “I attended” claim (manual review) ⇒ pause capture until staff resolves.
- Else at deadline ⇒ No-show ⇒ capture hold.

**Guest copy**

> Pay at the venue. We will place a $X no-show hold the day before. Your pass is guaranteed during [arrival window].

4) Payments (Stripe used only for holds)

- On approval: SetupIntent (save card) + consent snapshot.
- T-1 14:00: manual-capture PaymentIntent for hold_amount = per_person × party_size.
- Scan: cancel PaymentIntent.
- 24h post-close (if unresolved): capture PaymentIntent.
- On capture: ledger entries +90% venue credit, +10% platform admin.

5) Data model (essential)

- `venues` (id, name, tz=America/Anguilla, billing_customer_id, billing_pm_id, is_test_venue).
- `passes` (id, venue_id, kind=MIN_SPEND|DAY_PASS, pricing_mode=HOLD_ONLY, currency=USD, min_spend_amount for MIN_SPEND, display_price_text for hotel copy, requires_hold=true, no_show_amount_per_person, status, visibility=members|guest_only|both|private, auto_approve_enabled, default_arrival_window_minutes).
- `pass_inventory` (pass_id, date, cap, paused).
- `bookings` (id, user_id, venue_id, pass_id, date, party_size, status=requested|approved|issued|redeemed|redeemed_late|pending_verification|no_show|cancelled|declined, hold_amount, hold_currency, payment_method_ref, payment_intent_ref, hold_status=none|authorized|canceled|captured, arrival_window_start, arrival_window_end, qr_jti, hotel_code, has_guest_claim default false, created_at).
- `redemptions` (booking_id, redeemed_at, redeemed_by, server_name, table_ref, bill_photo_url).
- `booking_audit` (booking_id, from_status, to_status, actor, meta, created_at).
- `due_jobs` (id, job_type, booking_id, run_at, status, attempts, last_error, claimed_at, created_at).
- `venue_ledger` (id, venue_id, type in {fee_due, venue_credit_no_show, platform_admin_no_show, refund, adjustment}, amount_cents, currency, booking_id, created_at).
- `invoices` (id, venue_id, period_start, period_end, total_cents, currency, status=draft|sent|paid|void, pdf_url, payment_intent_id nullable).
- `invoice_line_items` (id, invoice_id, ledger_id, description, amount_cents).
- `ops_idempotency` (key unique, meta).

6) State machine (server-enforced)

- requested → approved → issued.
- issued → (scan) redeemed → (cancel hold).
- issued → (close) pending_verification.
- pending_verification → (late scan | confirm attended) redeemed_late → (cancel hold).
- pending_verification → (deadline) no_show → (capture hold).
- Any → cancelled (policy-gated; auto-void/cancel if hold exists).

Capacity consumed at approve/issue (transactional lock on `pass_inventory`). Amounts/currency immutable once issued; every transition audited.

7) Security & RLS

- Roles: member, venue_staff, venue_manager, admin, service.
- Members only see own bookings; venue staff only their venue.
- All hold/payment fields service-role only.
- Rate-limit book/redeem endpoints.

8) Decision Desk (slim)

**Today**

- Approvals (Approve/Decline + set arrival window).
- Arrivals (scanner via zxing-js + manual code; capture server/table).
- Pending 24h: Late scan / Confirm attended; Guest claim badge with bill photo; action resolves claim (manual review).

**Controls (manager)**

- Auto-approve on/off, cap editor per date, pause/resume, force authorize now (audited).
- Export CSV optional (`/api/export`).

9) Guest app

- Explore (gated) → Venue detail → Request (date, party size).
- Approval → Wallet (QR) with arrival window + banners: “Hold T-1”, “Hold active; releases on scan”.
- Self-serve cancel within policy (auto-void/cancel if hold exists).
- No-scan email includes “I attended” link (upload receipt photo / add server and table).

10) RPCs (SQL; security-definer; idempotent)

- `fn_request_booking(pass_id, date, party_size)`.
- `fn_approve_booking(booking_id, window_start, window_end)` → consume cap, set hold fields, issue QR, schedule T-1 job.
- `fn_decline_booking(booking_id, reason)`.
- `fn_redeem(qr_jti, server_name?, table_ref?)` → mark redeemed; enqueue hold_cancel.
- `fn_mark_attended(booking_id, note)` → pending → redeemed_late; cancel hold.
- Controls: `fn_set_daily_cap(pass_id, date, cap)`, `fn_toggle_pass_status(pass_id, status)`, `fn_update_pass(pass_id, {min_spend, no_show_amount, display_copy})` (forward-only).
- Maintenance: `fn_release_expired_holds()`.

11) Edge functions and jobs

**Edge functions**

- `stripe_setup_intent(booking_id)`.
- `hold_authorize(booking_id)`.
- `hold_cancel(booking_id, source)`.
- `hold_capture(booking_id)`.
- `stripe_webhook` (sync hold_status idempotently).
- `send_email(type, booking_id)`.
- `generate_statements()` → compile weekly statements (HTML/PDF), create invoices (draft), admin preview and send workflow, email.

**Cron / worker (every minute)**

- Claim `due_jobs` with `FOR UPDATE SKIP LOCKED` → process → retry with backoff → dead-letter and alert after N failures.
- Jobs: `authorize_hold` at T-1 14:00, `capture_after_24h`.

12) Ledger, invoices and weekly statements (manual first, with preview)

- On redeemed: add `fee_due` = 10% of venue-defined price/min_spend (snapshot).
- On no-show capture: add `venue_credit_no_show` (90%) and `platform_admin_no_show` (10%).
- W7–W8 (statement preview workflow):
  - Generate draft statement (HTML/PDF) from ledger for the period.
  - Admin review in UI (totals, sample bookings, math).
  - Mark as “sent” → lock invoice, send email with PDF/link.
  - Mark as “paid” when venue pays (bank/card), storing reference.
- Manual invoices for first 3–5 venues (no auto-charge yet).
- Net due = fees − credits; venue pays via bank transfer or optional card link.
- W9+ (optional, venue #6+): add auto-charge (store billing customer and payment method; set `payment_intent_id` on invoice).

13) Emails (Resend/SendGrid; SPF/DKIM/DMARC)

- Approval (arrival window, hold consent).
- Day-of reminder.
- No-scan notice (24h link to “I attended”).
- Hold events: heads-up T-1, release on scan, charge on no-show.
- Weekly statement/invoice email to venues.

14) Analytics (minimum)

- Events: request, approved, issued, qr_scanned, redeemed, pending_verification, redeemed_late, no_show, hold_authorized, hold_canceled, hold_captured, invoice_sent, invoice_paid.
- Properties: venue_id, pass_kind, party_size, hold_amount, arrival_window_minutes, approval_latency_ms, cap_remaining.

15) Build sequence (11 weeks, solo)

- W1 — Foundation: schema and migrations, state guards, RLS, auth, audit triggers, basic tests.
- W2 — Core rails: RPCs (request/approve/decline/redeem), QR issue, scanner stub, idempotency table, gating skeleton.
- W3 — Hold engine: SetupIntent save, manual-capture PaymentIntent, webhook scaffold, due_jobs worker, authorize/cancel/capture happy paths.
- W4 — Desk and controls: Approvals/Arrivals/Pending, auto-approve, cap editor, pause/resume, force authorize now, arrival window defaults, concurrency tests.
- W5 — Guest app: gated Explore → Venue detail → Request → Approval → Wallet (QR); banners; cancel within policy; accessibility.
- W6 — Emails and deliverability: SPF/DKIM/DMARC, templates wired, inbox tests (Gmail/Outlook).
- W7 (1.5–2 weeks) — Ledger and statements (manual + preview): venue ledger, statement generator (HTML/PDF), invoices tables, admin preview and send workflow, statement emails. Manual invoicing for first 3–5 venues.
- W8 — Guest+ and attribution + first statements sent: signed hotel tokens, enforce visibility, bookings carry hotel_code, simple hotel ledger view, send first statements (after preview), reconcile one paid invoice.
- W9 — (Optional) auto-charge rollout: add auto-charge for venue #6+ (store billing customer and payment method, create PaymentIntent on invoice); fallback to manual.
- W10 — Hardening: Playwright tests for RLS isolation, hold flows including retries, time-zone fixtures (America/Anguilla), rate limits, `/api/health`, Sentry.
- W11 — Polish and launch prep: scanner UX (iOS/Android), offline fallback code, duplicate scan idempotency, CSV export, venue one-pagers, kiosk guide, production checklist, seeded dry-run.

16) Go/No-Go gates (definition of done)

- Gate A (W3): authorize/cancel/capture works end-to-end; idempotent; audited.
- Gate B (W4): auto-approve + caps + pause under concurrency; arrival windows correct.
- Gate C (end W8): two venues received statements (after preview); one manual invoice paid; ledger matches UI and statements.
- Gate D (W9, optional): auto-charge successful for one venue; fallback to manual verified.
- Gate E (W10): tests green; health and Sentry solid; emails inbox.

17) Risks & guardrails

- Timezone bugs: compute with America/Anguilla; unit-test UTC conversions.
- Cron reliability: exponential backoff; alert on three or more failures; dead-letter queue.
- Venue abuse: 24h guest verification + manual review of “I attended” + late scan + confirm attended; monitor disputed no-show rate to auto-restrict auto-approve.
- Security: all hold/payment mutations via service-role; strict RLS; rate-limit public endpoints.

18) Phase-2 options (post-MVP)

- Restaurant MoR lane via WiPay/FAC (only after local legal confirms GST posture).
- “Release to members” (T-24 overflow).
- Dynamic holds; dispute tooling; PMS integrations.

