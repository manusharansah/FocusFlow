# Google sign-in

The code is complete. The "Continue with Google" button appears on the login and register pages as soon as the API has a
Google client id and secret. Without them the button is hidden and the Google routes answer 404.

## What the flow does

1. The button submits a CSRF-protected POST to `/accounts/google/login/`. The request uses the authorization-code flow with
   PKCE (S256), a random `state`, and the scopes `email` and `profile`.
2. Google returns the user to `/accounts/google/login/callback/`. django-allauth verifies the code and reads the profile.
3. A new Google user gets an account with a verified email and no password.
4. A person who already has a FocusFlow account with the same email is linked to it. This is safe only because both sides
   are verified. If the existing account was never verified, its password is deleted and its sessions are revoked, so
   someone who pre-registered another person's address cannot keep access.
5. The API then sets the same HttpOnly refresh cookie that email login uses and redirects to `/auth/callback`, where the
   app exchanges it for a short-lived access token. No token appears in a URL.
6. If anything fails, the user lands on `/login?error=oauth` with a short message.

## Set it up in Google Cloud (about 10 minutes)

1. Open [Google Cloud Console](https://console.cloud.google.com/), create or choose a project.
2. **APIs & Services, OAuth consent screen.** User type External. App name FocusFlow, a support email, your domain under
   "Authorized domains" once you have one. Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`. These
   are non-sensitive scopes, so Google does not require a verification review. Publish the app (move it from Testing to
   In production), otherwise only listed test users can sign in.
3. **APIs & Services, Credentials, Create credentials, OAuth client ID.** Application type Web application.
4. **Authorized JavaScript origins** (one per line):
   - `http://localhost:3000`
   - `https://YOUR-SITE` (your production origin, no trailing slash)
5. **Authorized redirect URIs** (one per line, exact match, trailing slash included):
   - `http://localhost:3000/accounts/google/login/callback/`
   - `https://YOUR-SITE/accounts/google/login/callback/`
6. Copy the client id and the client secret.

## Configure the API

Put these in `backend/.env` (git-ignored) or your host's environment settings. Never commit them and never paste them
into chat or an issue.

```
GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

Restart the API. Open `http://localhost:3000/login`. The button now shows.

With Vercel in front of a separate API host, rewrite both `/api/*` and `/accounts/*` to the API so the callback address
stays on your site's origin, and use that origin in the redirect URI above.

## Troubleshooting

| Symptom | Cause |
|---|---|
| No button | Client id or secret missing, or the API was not restarted |
| `redirect_uri_mismatch` from Google | The URI in the console differs from the one in the error by a port, scheme or trailing slash |
| Lands on `/login?error=oauth` | The user cancelled, the `state` expired, or the secret is wrong. Check the API log |
| Google says "Access blocked" | The consent screen is still in Testing and the user is not on the test list |
