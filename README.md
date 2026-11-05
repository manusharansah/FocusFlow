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

The feature is built. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `backend/.env` and the button appears.
Console steps, the exact redirect URIs and troubleshooting are in [docs/GOOGLE_SIGNIN.md](docs/GOOGLE_SIGNIN.md).

## Tests and checks

Smoke test (any environment, 42 checks across public pages, auth, tasks, board, billing gates, a11y, mobile):
`cd frontend && BASE_URL=https://your-site SMOKE_USER=... SMOKE_PASS=... SMOKE_PREMIUM_USER=... npm run smoke`
(first time: `npx playwright install chromium`; use `CHECK_HEADERS=1` against the production edge).

```bash
cd backend  && DEBUG=True python manage.py test
cd frontend && npm run lint && npm test && npm run build
```

CI (`.github/workflows/ci.yml`) also runs `manage.py check --deploy`, `pip-audit`, `npm audit` and gitleaks.

## Production

See [docs/DEPLOYMENT_FREE.md](docs/DEPLOYMENT_FREE.md) for the free setup, [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the settings reference, and [docs/SECURITY.md](docs/SECURITY.md).
`docker compose up --build` gives a production-like stack (Postgres, gunicorn, nginx with CSP).

## Documentation

- [docs/API.md](docs/API.md) - endpoint reference
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - how auth, billing and data fit together
- [docs/SECURITY.md](docs/SECURITY.md) - threat model, controls, incident checklist
- [docs/GOOGLE_SIGNIN.md](docs/GOOGLE_SIGNIN.md) - Google sign-in setup
- [docs/DEPLOYMENT_FREE.md](docs/DEPLOYMENT_FREE.md) - free deployment on Google Cloud Run and Neon (start here to go live)
- [docs/DEPLOYMENT_AWS.md](docs/DEPLOYMENT_AWS.md) - paid alternative: one AWS server with HTTPS
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - environment, domains, Stripe/Google/email setup, backups
- [docs/ROADMAP.md](docs/ROADMAP.md) - services needed to compete internationally

## Design credits

The UI is our own implementation. Its neutral colour scale, radius and dark-theme values follow
[shadcn-admin](https://github.com/satnaing/shadcn-admin) (MIT, Copyright (c) 2024 Sat Naing); the KPI colour tiles and the
greeting/radial/area-chart layout were inspired by the Skydash and Sneat admin template previews. Inter is bundled via
`@fontsource-variable/inter` (SIL OFL) and served from our own origin, so the strict CSP needs no third-party hosts.
