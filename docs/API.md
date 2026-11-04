# API reference

Base path `/api`. JSON only. Authenticated endpoints need `Authorization: Bearer <access>`.
Errors: `{"detail": "..."}` or `{"field": ["..."]}`. Lists are paginated (`count`, `next`, `previous`, `results`; `?page_size=` up to 200).

## Users
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/users/register/` | - | `{username,email,password}`; always 201 (no account enumeration); sends verification e-mail |
| POST | `/users/login/` | - | `{email,password}` -> `{access,user}` + HttpOnly refresh cookie. 403 `email_not_verified` until the address is verified; 429 after repeated failures |
| POST | `/users/token/refresh/` | cookie | rotates refresh cookie, returns `{access,user}` |
| POST | `/users/logout/` | cookie | blacklists refresh token |
| GET/PATCH/DELETE | `/users/profile/` | yes | PATCH `{username}`; DELETE `{password}` erases the account |
| GET | `/users/export/` | yes | full personal data export |
| POST | `/users/verify-email/` | - | `{uid,token}` |
| POST | `/users/resend-verification/` | - | `{email}`; uniform response; 3 per address per hour |
| POST | `/users/password-reset/` | - | `{email}`; uniform response |
| POST | `/users/password-reset/confirm/` | - | `{uid,token,password}` |
| GET | `/users/csrf/` | - | returns `{csrfToken, google}` for the Google form |

## Tasks (`/tasks/`)
`GET /tasks/?status=&priority=&search=&completed=&page=`, `POST`, `GET|PATCH|DELETE /tasks/{id}/`.
Fields: `title` (<=200), `description`, `priority` (low|medium|high), `status` (todo|in_progress|done), `due_date`;
`completed` mirrors `status`. Free users: 403 after 10 tasks.

`POST /tasks/focus-session/` `{duration_minutes 1-180, completed, task?}` and `GET /tasks/focus-sessions/` - Premium.

## Analytics
`GET /analytics/stats/` - totals, priority split, 7-day completion; `focus_data` for Premium.

## Payments
| Method | Path | Notes |
|---|---|---|
| GET | `/payments/plans/` | public; prices read from Stripe |
| POST | `/payments/create-checkout/` | `{plan: monthly|yearly}`; requires verified e-mail -> `{checkout_url}` |
| POST | `/payments/portal/` | -> `{url}` Stripe Customer Portal |
| POST | `/payments/verify-payment/` | `{session_id}`; only the session owner |
| POST | `/payments/webhook/` | Stripe only (signature verified) |

`GET /health/` - liveness.
