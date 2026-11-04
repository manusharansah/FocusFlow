# FocusFlow

Task management with a focus timer and analytics. Django REST API + React (Vite) SPA, Stripe subscriptions, Google sign-in.

| | Free | Premium |
|---|---|---|
| Tasks | up to 10 | unlimited |
| List and board views, basic insights | yes | yes |
| Focus timer + session history | - | yes |
| Advanced insights (focus trends) | - | yes |

## Repository layout

```
backend/    Django 5.2 + DRF API (users, tasks, payments, analytics)
frontend/   React 19 + Vite SPA
docs/       SECURITY, DEPLOYMENT, API, ARCHITECTURE, ROADMAP
```

## Local development

Requirements: Python 3.12+, Node 20+.

```bash
# API  (http://localhost:8000)
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set DEBUG=True and FRONTEND_URL/BACKEND_URL=http://localhost:3000 for local work
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# SPA  (http://localhost:3000, proxies /api and /accounts to the API)
cd frontend
npm install
npm start
```

Always open the app at `http://localhost:3000`. The dev server proxies the API, so the app and API share an
origin exactly like production (the refresh-token cookie is first-party and HttpOnly).

Verification and password-reset emails print to the API console unless `EMAIL_HOST` is configured.

### Stripe (test mode)

1. Create two recurring Prices (monthly, yearly) and put their ids in `STRIPE_PRICE_ID_MONTHLY/YEARLY`.
2. `stripe listen --forward-to localhost:8000/api/payments/webhook/` and copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
3. Pay with `4242 4242 4242 4242`, any future date, any CVC.

The pricing page reads amounts and currency from Stripe, so what users see is what they are charged.
Premium access is granted only by verified Stripe webhooks (or by re-reading the session from Stripe), never by client input.

### Google sign-in

Create an OAuth client in Google Cloud Console, authorised redirect URI
`{your origin}/accounts/google/login/callback/`, then set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
The button only appears when both are set.

## Tests and checks

```bash
cd backend  && DEBUG=True python manage.py test
cd frontend && npm run lint && npm test && npm run build
```

CI (`.github/workflows/ci.yml`) additionally runs `manage.py check --deploy`, `pip-audit`, `npm audit` and gitleaks.

## Production

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) and [docs/SECURITY.md](docs/SECURITY.md).
`docker compose up --build` gives a production-like stack (Postgres, gunicorn, nginx with CSP).

## Documentation

- [docs/API.md](docs/API.md) - endpoint reference
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - how auth, billing and data fit together
- [docs/SECURITY.md](docs/SECURITY.md) - threat model, controls, incident checklist
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - environment, domains, Stripe/Google/email setup, backups
- [docs/ROADMAP.md](docs/ROADMAP.md) - services needed to compete internationally
