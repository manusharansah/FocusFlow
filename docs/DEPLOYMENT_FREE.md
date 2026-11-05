# Deploying for free: Google Cloud Run and Neon

This setup costs nothing at low traffic and is allowed for a product that charges customers.

```
Browser --HTTPS--> Google Cloud Run (one container: React app + Django API) --> Neon PostgreSQL
                                                                             \--> Gmail SMTP, Stripe, Google sign-in
```

The container serves the app and the API on one address, so the sign-in cookie is first-party and the API sees the real
client IP. There is no Redis. Rate limits live in a database table, which every instance shares.

## Why these choices

- Cloud Run has a monthly free allowance of 2 million requests, 180,000 vCPU-seconds and 360,000 GiB-seconds per billing
  account ([pricing](https://cloud.google.com/run/pricing)). It scales to zero, so an idle site costs nothing. Commercial use
  is allowed. It needs a billing account with a card on file, but staying inside the allowance costs 0. Add a budget alert
  (step 6) so a surprise cannot go unnoticed. The script caps the service at one instance.
- Neon has a free plan with 0.5 GB of storage per project and compute that suspends when idle
  ([limits](https://neon.com/faqs/free-plan-limits-and-quotas)). Supabase also works (see below).
- Vercel's free Hobby plan is limited to personal, non-commercial use, and a site that takes payments needs the
  20 USD a month Pro plan ([fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)). It is fine for a demo.
- DuckDNS is not needed. Cloud Run gives you an HTTPS address. A custom domain can come later.
- Render's free database is deleted after 30 days and its free web service sleeps after 15 minutes, so it is not used.

## Accounts you need (all free to create)

1. A Google Cloud project with billing enabled.
2. A Neon account. Create a project and copy the pooled connection string (the host contains `-pooler`).
3. An SMTP account for email. The simplest is Gmail with an app password (Google Account, Security, 2-Step Verification,
   App passwords). The app refuses to start in production without an SMTP host, so verification and reset emails always work.

## Steps

1. In Google Cloud Shell (shell.cloud.google.com), clone the repository and change into it.
2. Export the settings. The values stay in your shell session and go to Secret Manager, never to the repository.
   ```
   export PROJECT=your-gcp-project-id
   export DATABASE_URL='postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/DB?sslmode=require'
   export EMAIL_HOST=smtp.gmail.com EMAIL_HOST_USER=you@gmail.com EMAIL_HOST_PASSWORD='your-app-password'
   export DEFAULT_FROM_EMAIL='FocusFlow <you@gmail.com>'
   ```
   Optional now, addable later by running the script again: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
3. Run `bash deploy/cloudrun-deploy.sh`. It enables the Google APIs, stores secrets in Secret Manager, builds the image
   from the `Dockerfile` with Cloud Build, and deploys. The first build takes several minutes.
4. The script prints your address, `https://focusflow-PROJECTNUMBER.us-central1.run.app`. Open it. Migrations ran on start.
5. Add the live addresses to the other services.
   - Stripe: webhook endpoint `ADDRESS/api/payments/webhook/` (events are listed in `docs/DEPLOYMENT.md`), then run the
     script again with the Stripe variables set.
   - Google: origin `ADDRESS` and redirect URI `ADDRESS/accounts/google/login/callback/` (see `docs/GOOGLE_SIGNIN.md`).
6. In Google Cloud, Billing, Budgets and alerts: create a budget of 1 USD with alerts at 50 and 100 percent.
7. Check the live site from any machine with Node:
   `cd frontend && CHECK_HEADERS=1 BASE_URL=ADDRESS SMOKE_USER=... SMOKE_PASS=... npm run smoke`.

## Updating

Run `bash deploy/cloudrun-deploy.sh` again after pulling new code. Existing secrets are updated in place and the session
key is kept, so nobody is signed out.

## Supabase instead of Neon

Use the Transaction pooler connection string (port 6543) as `DATABASE_URL`. The script already sets `DB_POOLER=1`, which
disables server-side cursors that transaction poolers do not support. Check Supabase's current rules for pausing inactive
free projects before relying on it for a live product.

## Using Vercel anyway

For a non-commercial demo you can host the React app on Vercel and rewrite `/api/*` and `/accounts/google/*` to Cloud Run.
This is not tested here and has two open questions: which Host header Vercel sends on an external rewrite (the OAuth callback
address depends on it) and how it forwards the client IP (rate limits depend on it). The single-container setup avoids both.

## Limits to know

- A cold start (the first request after the service was idle) takes a few seconds while the container starts, runs
  migrations and Neon wakes. This has not been measured here. An uptime monitor that calls `/api/health/` every 5 minutes
  keeps it warm, within the free allowance for light traffic.
- One instance serves all traffic, with 8 threads. That handles light use. Raise `--max-instances` when you outgrow it,
  and expect the cost to rise with it.
- `NUM_PROXIES=1` assumes Cloud Run sends the client IP as the last `X-Forwarded-For` entry. Verify it after deploying: sign in
  from two different networks and confirm they are not throttled together. Per-account login lockout protects passwords
  either way.
- The Django admin is off (`ADMIN_ENABLED=False`) because a public admin is a risk. To manage users, run the site locally with
  `DATABASE_URL` set to the Neon string and use `createsuperuser` and the admin there.
- Free tiers change. Check the pricing pages linked above before launch.

## What was and was not tested

The container's entry point and settings were run locally in production mode (Django serving the built app and API, the
database cache table, strict headers) and passed the 46-check smoke test, plus unit tests for the routing and headers.
Not tested here because this environment has no Docker daemon, no Google Cloud login and no access to Neon: the Docker
build, `deploy/cloudrun-deploy.sh` itself, Cloud Run's behaviour, and real Stripe and Google flows.
