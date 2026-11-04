# Roadmap: services needed to compete internationally

Prioritised by what blocks adoption or revenue first. "Included" = shipped in this repository.

## Included now
Email+password and Google sign-in, e-mail verification, password reset, tasks with list/board/search/filters, focus timer,
analytics, Stripe subscriptions (monthly/yearly, Customer Portal, webhooks), data export and account deletion, rate limiting,
security headers, CI with dependency and secret scanning, Docker deployment.

## P0 - before charging real customers
1. **Legal entity + policies**: finalised Privacy Policy, Terms, DPA, refund policy, cookie notice if analytics added.
2. **Tax & invoicing**: Stripe Tax (VAT/GST/sales tax), invoices with tax ids, receipts by e-mail.
3. **Transactional e-mail** with SPF/DKIM/DMARC and bounce handling.
4. **Observability**: Sentry, uptime checks, structured logs, Stripe webhook alerting.
5. **Backups + restore drills**, staging environment, migration runbook.

## P1 - table stakes of the category (what Todoist/TickTick/Asana users expect)
1. **Two-factor authentication** (TOTP with QR enrolment, recovery codes) and passkeys.
2. **Projects/lists, labels, subtasks, recurring tasks, reminders** (email + web push).
3. **Calendar view and calendar sync** (Google/Outlook/ICS feed).
4. **Teams/workspaces**: invites, roles, assignees, comments, activity log, seat-based billing.
5. **Mobile**: installable PWA (manifest included) then native/React Native; offline queue with sync.
6. **Notifications centre** and per-user preferences.
7. **Import/export**: CSV/JSON, Todoist/Trello/Asana importers.
8. **Public REST API tokens + webhooks**, OpenAPI docs.

## P2 - international and enterprise
1. **Internationalisation**: i18n of UI, RTL, locale-aware dates/currency (currency formatting already locale-aware), local payment methods and Adaptive Pricing in Stripe.
2. **Data residency options** (EU region), GDPR tooling: consent log, DSAR workflow, retention policy.
3. **SSO (SAML/OIDC), SCIM**, audit logs, admin console, SOC 2 / ISO 27001 programme.
4. **Accessibility**: WCAG 2.2 AA audit (keyboard board interactions, screen-reader live regions).
5. **Integrations**: Slack, Google Drive, GitHub/Jira, Zapier/Make.
6. **AI assistance**: task breakdown, scheduling suggestions, weekly summaries (opt-in, with clear data handling).
7. **Status page, SLA, support desk, in-app help**.
