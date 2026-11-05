# Deploying to AWS (one server)

This is the cheapest setup that is still reliable for a first production launch. One small server runs everything
behind Caddy, which gets and renews the HTTPS certificate by itself.

```
Browser --HTTPS--> Caddy (ports 80, 443) --/api, /accounts/google--> Django (gunicorn) --> PostgreSQL
                      |                                                  \--> Redis (rate limits)
                      \--> built React app (static files)
```

The whole site, including the API, answers on one address. That keeps the sign-in cookie first-party, needs no CORS, and
lets the API see each visitor's real IP address for rate limiting (`NUM_PROXIES=1`).

## Cost (estimate, check current AWS prices)

A `t4g.small` instance (2 vCPU, 2 GB RAM) in us-east-1 costs about 12 USD a month. A 30 GB disk adds about 2.5 USD and the
public IPv4 address about 3.7 USD. Plan on 15 to 20 USD a month in total. A 1 GB instance is too small for Postgres, Redis
and the API together.

## What is needed

1. An AWS account and an IAM user whose access key has the policy in `deploy/iam-deployer-policy.json`. Add the key to this
   cloud environment as environment secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (and `AWS_DEFAULT_REGION`), then
   start a new session. Never paste the key into chat. Delete the IAM user after the first deploy, or keep it for updates.
2. A domain name. Any of these works.
   - A domain you own, with an A record to the server's Elastic IP. Best for the Google consent screen and Stripe.
   - A free DuckDNS name. Create it at duckdns.org, then keep the token only on the server (`deploy/duckdns-update.sh`).
   - A name derived from the IP, such as `203-0-113-5.sslip.io`. It needs no account and works within minutes, so it is
     a good way to go live first and change the domain later.
3. Production values in `deploy/backend.env`: `SECRET_KEY`, an SMTP provider for email, Stripe keys, and the Google client
   id and secret. See `deploy/backend.env.example`.

## Steps

1. Create the server: Ubuntu 24.04 on arm64, a security group that allows ports 22, 80 and 443 (22 only from your own IP),
   an Elastic IP, IMDSv2 required, an instance role with `AmazonSSMManagedInstanceCore` so commands can run without SSH.
2. Run `deploy/bootstrap-ubuntu.sh` once. It installs Docker, a firewall, automatic security updates and 2 GB of swap.
3. Copy the repository to `/opt/focusflow`, create `deploy/.env` and `deploy/backend.env`, then run
   `docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build`.
4. Point the domain at the Elastic IP before the first start, so Caddy can get its certificate.
5. Create the first admin user:
   `docker compose -f deploy/docker-compose.prod.yml exec backend python manage.py createsuperuser`.
6. Add the live addresses in the other services.
   - Stripe webhook endpoint: `https://DOMAIN/api/payments/webhook/` with the events listed in `docs/DEPLOYMENT.md`.
   - Google redirect URI: `https://DOMAIN/accounts/google/login/callback/` and the origin `https://DOMAIN`.
7. Verify the live site: `cd frontend && CHECK_HEADERS=1 BASE_URL=https://DOMAIN SMOKE_USER=... SMOKE_PASS=... npm run smoke`.
   The security-header checks only run with `CHECK_HEADERS=1`.

## Operations

- Backups: the `backup` service writes a daily dump to `deploy/backups` and keeps 14 days. Also copy it off the server, for
  example with a nightly `aws s3 cp` to a private bucket, and test a restore once.
- Updates: `git pull`, then rerun the `up -d --build` command. The `migrate` service runs migrations first.
- Logs: `docker compose -f deploy/docker-compose.prod.yml logs -f backend caddy`.
- Monitoring: add an uptime check on `https://DOMAIN/api/health/` and set `SENTRY_DSN` for error reports.
- Rollback: check out the previous commit and rerun the same command. Database changes are not rolled back automatically.

## Limits of this setup

One server means a reboot or a failed disk causes downtime, and the database lives on the same machine. That is acceptable
for a launch. When traffic or revenue justifies it, move the database to Amazon RDS, put the API behind a load balancer on
two instances, and keep Caddy or switch to CloudFront.
