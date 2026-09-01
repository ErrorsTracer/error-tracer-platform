#!/bin/sh
set -eu

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  bun run db:migrate
fi

if [ "${RUN_DB_SEEDS:-true}" = "true" ]; then
  echo "Running pending database seeds..."
  bun run db:seed:run
fi

echo "Database initialization complete. Starting backend..."
exec "$@"
