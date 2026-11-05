#!/usr/bin/env bash
# Deploys FocusFlow to Google Cloud Run. Run it in Google Cloud Shell (shell.cloud.google.com) from the repository root.
#
#   export PROJECT=your-gcp-project-id
#   export DATABASE_URL='postgresql://user:pass@host/db?sslmode=require'     # Neon pooled connection string
#   export EMAIL_HOST=smtp.gmail.com EMAIL_HOST_USER=you@gmail.com EMAIL_HOST_PASSWORD='app-password'
#   export DEFAULT_FROM_EMAIL='FocusFlow <you@gmail.com>'
#   # optional: STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_ID_MONTHLY STRIPE_PRICE_ID_YEARLY
#   #           GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
#   bash deploy/cloudrun-deploy.sh
#
# Secrets go to Secret Manager, never into the command line, the image or the repository.
# The service is capped at one instance and scales to zero, which keeps usage inside the free allowance.
set -euo pipefail

: "${PROJECT:?set PROJECT to your Google Cloud project id}"
: "${DATABASE_URL:?set DATABASE_URL to your Neon or Supabase connection string}"
: "${EMAIL_HOST:?set EMAIL_HOST (an SMTP server is required in production)}"
REGION="${REGION:-us-central1}"
SERVICE="${SERVICE:-focusflow}"

gcloud config set project "$PROJECT" > /dev/null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com

# The public URL is predictable, so the app can be configured before its first start.
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
PUBLIC_URL="https://${SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"

put_secret() {  # name value
  local name="$1" value="$2"
  if gcloud secrets describe "$name" > /dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- > /dev/null
  else
    printf '%s' "$value" | gcloud secrets create "$name" --replication-policy=automatic --data-file=- > /dev/null
  fi
}

# Keep an existing SECRET_KEY: changing it signs every user out.
if ! gcloud secrets describe focusflow-secret-key > /dev/null 2>&1; then
  put_secret focusflow-secret-key "$(python3 -c 'import secrets; print(secrets.token_urlsafe(64))')"
fi
put_secret focusflow-database-url "$DATABASE_URL"
SECRETS="SECRET_KEY=focusflow-secret-key:latest,DATABASE_URL=focusflow-database-url:latest"
add_secret() {  # ENV_NAME secret-name
  local env_name="$1" secret_name="$2" value="${!1:-}"
  [ -n "$value" ] || return 0
  put_secret "$secret_name" "$value"
  SECRETS="$SECRETS,${env_name}=${secret_name}:latest"
}
add_secret EMAIL_HOST_PASSWORD focusflow-email-password
add_secret STRIPE_SECRET_KEY focusflow-stripe-secret
add_secret STRIPE_WEBHOOK_SECRET focusflow-stripe-webhook
add_secret GOOGLE_CLIENT_SECRET focusflow-google-secret

ENVVARS="DEBUG=False,PUBLIC_URL=${PUBLIC_URL},BEHIND_PROXY=True,NUM_PROXIES=1,USE_DB_CACHE=True,DB_POOLER=${DB_POOLER:-1},ADMIN_ENABLED=False"
ENVVARS="$ENVVARS,EMAIL_HOST=${EMAIL_HOST},EMAIL_PORT=${EMAIL_PORT:-587},EMAIL_USE_TLS=True"
for name in EMAIL_HOST_USER DEFAULT_FROM_EMAIL STRIPE_PRICE_ID_MONTHLY STRIPE_PRICE_ID_YEARLY GOOGLE_CLIENT_ID; do
  value="${!name:-}"
  [ -n "$value" ] && ENVVARS="$ENVVARS,${name}=${value}"
done

# The service account that runs the container must be allowed to read the secrets.
RUNTIME_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
for secret in $(gcloud secrets list --format='value(name)' --filter='name~focusflow-'); do
  gcloud secrets add-iam-policy-binding "$secret" --member="serviceAccount:${RUNTIME_SA}" \
    --role=roles/secretmanager.secretAccessor > /dev/null
done

gcloud run deploy "$SERVICE" --source . --region "$REGION" --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --memory 512Mi --cpu 1 --concurrency 40 --timeout 60 \
  --set-env-vars "^|^${ENVVARS//,/|}" --set-secrets "$SECRETS"

echo
echo "Deployed: ${PUBLIC_URL}"
echo "Google redirect URI : ${PUBLIC_URL}/accounts/google/login/callback/   (origin: ${PUBLIC_URL})"
echo "Stripe webhook URL  : ${PUBLIC_URL}/api/payments/webhook/"
echo "Health check        : ${PUBLIC_URL}/api/health/"
