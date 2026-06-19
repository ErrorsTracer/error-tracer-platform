#!/bin/sh
set -e

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  bun run db:migrate
fi

if [ "${RUN_DB_SEEDS:-true}" = "true" ]; then
  echo "Running database seeds..."
  bun run db:seed:run
fi

exec "$@"
