#!/bin/sh
# Container entrypoint. Applies database migrations and creates the cache table, then starts the server.
# Set RUN_MIGRATIONS=0 to skip (for example when migrations run as a separate job).
set -e
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  python manage.py migrate --noinput
  python manage.py createcachetable
fi
# One worker with threads keeps memory low enough for a 512 MiB instance.
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8080}" \
  --workers 1 --threads 8 --timeout 60 \
  --access-logfile -
