# Architecture

```
Browser (React SPA)  --same origin-->  nginx  --/api, /accounts-->  Django (gunicorn)  -->  PostgreSQL
                                          \--> static SPA assets          \--> Stripe (API + webhooks), Google OAuth, SMTP
```

## Authentication

- **Local accounts**: `POST /api/users/login/` returns a 15-minute **access token** (kept in JS memory only) and sets a
  14-day **refresh token** as an `HttpOnly; Secure; SameSite=Lax` cookie scoped to `/api/users/`.
- **Refresh** rotates and blacklists the refresh token each time (reuse of an old token fails).
- **Google**: a CSRF-protected form POST starts django-allauth. After consent, `/api/users/oauth-complete/` converts the
  short-lived allauth session into the same refresh cookie, destroys the session, and redirects to `/auth/callback`,
  where the SPA exchanges the cookie for an access token. Accounts are never auto-linked by e-mail.
- Nothing credential-like is stored in `localStorage`.

## Billing

Source of truth is **Stripe**. `User.is_premium` is a cache derived from subscription status (`active`/`trialing`).

1. `POST /payments/create-checkout/ {plan}` - server maps `plan` to a Price id from env (client never sends amounts).
2. Stripe Checkout (hosted) collects payment, tax and billing address.
3. Webhook `/payments/webhook/` (signature verified, idempotent via `StripeEvent`) updates the user and records invoices.
4. The success page calls `/payments/verify-payment/`, which re-reads the session from Stripe and refuses sessions whose
   `client_reference_id` is not the caller. It only speeds up UX; the webhook is authoritative.
5. Users manage/cancel in the Stripe Customer Portal (`/payments/portal/`).

## Data model

`User` (billing mirror fields, `email_verified`), `Task` (status, priority, due date, `completed_at`),
`FocusSession`, `Payment` (immutable invoice ledger), `StripeEvent` (webhook idempotency). Cascade delete from `User`
implements account erasure; payments keep a null user so financial records survive for accounting.

## Throttling

DRF scoped throttles: `auth` 10/min (login/register/confirmations), `refresh` 60/min, `sensitive` 5/hour (e-mail sending),
`payments` 20/hour, plus anon/user defaults. Set `REDIS_URL` so limits are shared across workers.
