# Interlude — Project Brief (one pager)
Goal: Private, QR-verified day access + min-spend passes for hotels/restaurants.
Country: Anguilla. Guests pay at venue. Platform only runs no-show holds.

Non-negotiables:
- Pay-at-venue only (MVP). Venue is MoR for spend.
- Mandatory no-show holds (authorize T-1 14:00 America/Anguilla, cancel on scan, capture after 24h if unresolved).
- 90/10 no-show split: 90% credited to venue, 10% platform admin.
- Weekly venue statements (manual invoices first), with preview step.
- Members + signed Guest+ links. No public browse.
- Stack: Next.js (App Router), Tailwind/shadcn, Supabase (DB/Auth/Storage/Edge), Stripe (holds only), Resend/SendGrid, Sentry.

Definition of done (MVP): Guest flow (request→issue→scan), Desk (Approve/Scan/Pending 24h), hold engine (auth/cancel/capture), statements (preview→send), tests for RLS & flows.
