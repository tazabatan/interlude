## Email infrastructure

Transactional email is delivered with [Resend](https://resend.com) and React Email templates. Configure the following variables in `web/.env.local` (or the respective deployment secret store):

```
RESEND_API_KEY=...
EMAIL_FROM_ADDRESS=notices@example.com
EMAIL_FROM_NAME=Interlude
EMAIL_REPLY_TO=support@interludepass.com
# optional: skip network delivery locally
EMAIL_DELIVERY_DISABLED=true
```

In development you can preview or send sample emails via `POST /api/dev/emails/preview`:

```json
{
  "template": "booking-approved",
  "email": "you@example.com",
  "send": true
}
```

- `template`: `booking-approved`, `day-of-reminder`, `hold-status`, or `no-scan`
- `variant`: (`hold-status` only) `authorized`, `released`, or `captured`
- `send`: when true, delivers the email; otherwise the endpoint responds with HTML/text for inspection

The endpoint is disabled automatically when `NODE_ENV === 'production'`.

### Automated triggers

- Secure the internal dispatcher with `INTERNAL_EMAIL_SECRET` (set this value in `web/.env.local` and in your Supabase function env so the edge functions can authenticate).
- Supabase edge functions post to `POST /api/internal/email/dispatch` using that bearer token. Point them at your running app with `EMAIL_DISPATCH_URL` (for local dev use `http://127.0.0.1:3000`).
- When `EMAIL_DELIVERY_DISABLED=true`, Next will skip network delivery but still log the attempt; Supabase functions silently no-op if either the dispatch URL or secret is missing.
- All automated replies will default to `EMAIL_REPLY_TO` unless a specific template overrides it. Keep this pointing at a monitored mailbox (e.g. `support@interludepass.com`).

### Provider notes

- Resend is already configured for `mail.interludepass.com`. Make sure the domain stays verified (SPF/DKIM) and that the Resend API key you supply has access to the EU region if you're using the Ireland endpoint.
- Before sending real traffic, run `POST /api/dev/emails/preview` with `{"template":"booking-approved","send":true,"email":"your@interludepass.com"}` to confirm headers show SPF/DKIM/DMARC pass.
