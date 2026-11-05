# One container for the whole product: Django serves the API and the built React app on one address.
# Used by Google Cloud Run (`gcloud run deploy --source .` finds this file) and any other container host.
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FRONTEND_DIST=/app/frontend_dist
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
COPY --from=web /web/build /app/frontend_dist
COPY deploy/start.sh /app/start.sh
RUN useradd -r -u 10001 app && chown -R app /app && chmod +x /app/start.sh
USER app
# collectstatic only needs enough settings to import; no real secrets are baked into the image.
RUN SECRET_KEY=build PUBLIC_URL=https://build.invalid EMAIL_HOST=build python manage.py collectstatic --noinput
CMD ["/app/start.sh"]
