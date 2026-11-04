# Security

## Controls implemented

| Area | Control |
|---|---|
| Secrets | All config via environment; app refuses to start without `SECRET_KEY` unless `DEBUG=True`; `.env`, databases and bytecode are git-ignored; CI runs gitleaks |
| Transport | HSTS (1y, preload), SSL redirect, secure cookies, proxy header support |
| Headers | CSP (`default-src 'self'`), `nosniff`, `X-Frame-Options: DENY`, Referrer-Policy, COOP, Permissions-Policy |
| Sessions | Short-lived access token in memory; rotating, blacklisted, HttpOnly refresh cookie; logout revokes |
| Passwords | Django PBKDF2, min 10 chars, common/numeric/similarity validators, single-use reset tokens (1h) |
| Enumeration | Uniform responses for register and password reset; generic login error |
| Abuse | Scoped rate limiting on auth, e-mail, payments; 256 KB body limit |
| Authorisation | Every query is scoped to `request.user`; foreign keys validated (a focus session cannot reference another user's task) |
| Mass assignment | Billing and verification fields are read-only everywhere; admin shows them read-only |
| Payments | Server-side price ids, verified webhooks, idempotent events, ownership check on session lookup, no card data touches our servers |
| Privacy | Data export and account erasure endpoints; Stripe subscription cancelled on erase |
| Errors | No `str(exception)` returned to clients; logs never contain bodies, tokens or card data |
| Admin | Path configurable via `ADMIN_URL`; put it behind VPN/SSO in production |

## Findings fixed from the original code

1. `db.sqlite3` (5 real accounts, password hashes, a Google OAuth client secret, 3 payments) and `.pyc` files were committed.
2. `is_premium` was writable on public registration: anyone could register as Premium.
3. `/payments/verify-payment/` accepted any Stripe session id for any user (IDOR + replay), had no webhook, and one-time
   `payment` mode was sold as "per month".
4. `DEBUG=True`, hard-coded fallback `SECRET_KEY`, localhost URLs, insecure cookies.
5. Logout called a non-existent endpoint; Google login never produced a JWT; tokens lived in `localStorage`.
6. Dashboard route was not protected; error messages leaked server exceptions.

## Actions you must take (cannot be done from code)

1. **Rotate the Google OAuth client secret** and any Stripe keys ever used with this repo - the old database is in git history.
2. **Purge history**: `git filter-repo --path backend/db.sqlite3 --invert-paths` then force-push, and have collaborators re-clone.
   Treat the 5 exposed password hashes as compromised: force a password reset for those users.
3. Set `ADMIN_URL`, restrict admin access, enable 2FA on Stripe, Google, hosting and GitHub accounts.
4. Configure backups with tested restores (see DEPLOYMENT.md).
5. Replace the placeholder legal text and contact addresses in Privacy/Terms with your registered entity details.

## Reporting a vulnerability

Email security@your-domain.example. Please do not open public issues for vulnerabilities.
