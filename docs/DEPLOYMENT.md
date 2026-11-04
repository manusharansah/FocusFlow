# Deployment

## Topology (recommended)

One public hostname, e.g. `https://app.example.com`, serving the SPA and proxying `/api`, `/accounts`, `/static` to the API
(see `frontend/nginx.conf`). One origin means first-party cookies, no CORS and the strictest CSP.
If you must split domains, keep them on the same registrable domain (`app.` / `api.`), keep `SameSite=Lax`, and set
`CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS`; the Google form post also needs to target the API host.

## Steps

1. Provision PostgreSQL (managed, with PITR backups) and set `DATABASE_URL`.
2. Copy `backend/.env.example` to `.env` (or set variables in your host). Required: `SECRET_KEY`, `ALLOWED_HOSTS`,
   `FRONTEND_URL`, `BACKEND_URL`, `DATABASE_URL`. Set `BEHIND_PROXY=True` when TLS terminates upstream.
3. `docker compose up --build -d` (or run the two images on your platform). Migrations run on boot in compose; run
   `python manage.py migrate` as a release step elsewhere.
4. Create the first admin: `python manage.py createsuperuser`.
5. **Stripe**: create the product with a monthly and yearly recurring Price; set the two price ids; add a webhook endpoint
   `https://app.example.com/api/payments/webhook/` for `checkout.session.completed`, `customer.subscription.*`,
   `invoice.paid`, `invoice.payment_failed`; enable the Customer Portal; enable Stripe Tax and set `STRIPE_AUTOMATIC_TAX=True`
   once tax registrations are configured. Enable Adaptive Pricing/local payment methods in Stripe for international buyers.
6. **Google**: redirect URI `https://app.example.com/accounts/google/login/callback/`; set client id/secret.
7. **E-mail**: set `EMAIL_HOST*` to a transactional provider (SES, Postmark, Resend SMTP) and configure SPF, DKIM, DMARC.
8. **Monitoring**: set `SENTRY_DSN`; alert on `/api/health/` and on 5xx rate; review webhook delivery failures in Stripe.
9. **Backups**: daily logical dump plus PITR; test a restore quarterly.
10. Run `python manage.py check --deploy` (CI does this) before each release.

## Scaling notes

Stateless API; add workers/instances freely. Use Redis (`REDIS_URL`) for shared rate limiting. Static files are served by
WhiteNoise; put a CDN in front of `/assets/` and `/static/` if traffic warrants.
