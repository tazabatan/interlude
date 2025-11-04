# Interlude — MVP Spec (technical)
Products: MIN_SPEND (restaurants) and DAY_PASS (hotels). Both HOLD_ONLY, pay-at-venue.

Data (essential tables):
- venues, passes, pass_inventory, bookings, redemptions, booking_audit, due_jobs,
  venue_ledger, invoices, invoice_line_items, ops/idempotency.

Key fields & state machine (server-enforced):
requested → approved → issued
issued → (scan) redeemed → (cancel hold)
issued → (close) pending_verification
pending_verification → (late scan | confirm attended) redeemed_late → (cancel hold)
pending_verification → (deadline) no_show → (capture hold)
Any → cancelled (policy-gated; auto-void/cancel if hold exists)

Payments (Stripe holds only):
- SetupIntent on approval; authorise T-1 14:00 America/Anguilla (manual capture PI).
- On scan: cancel hold. After 24h pending: capture hold.
- Ledger on capture: +venue_credit_no_show 90%, +platform_admin_no_show 10%.

Decision Desk (MVP):
- Today: Approvals (set arrival window), Arrivals (scanner + manual code), Pending 24h (Late scan, Confirm attended, handle guest claims).
- Controls: Auto-approve toggle, Cap editor per date, Pause/Resume, Force authorize now.
- Export CSV optional.

Emails:
- Approval, Day-of reminder, No-scan (with “I attended”), Hold heads-up/release/charge, Weekly statement.

Week 7–8 billing (manual first):
- Statement generator (HTML/PDF), invoices tables, admin **preview → send → paid** workflow.
