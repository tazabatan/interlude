## Email infrastructure

Transactional email is delivered with [Resend](https://resend.com) and React Email templates. Configure the following variables in `web/.env.local` (or the respective deployment secret store):

```
RESEND_API_KEY=...
EMAIL_FROM_ADDRESS=notices@example.com
EMAIL_FROM_NAME=Interlude
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
