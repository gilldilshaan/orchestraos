#!/bin/sh
set -e

echo "Running database migrations..."
if alembic upgrade head; then
  echo "Migrations applied."
else
  echo "WARNING: migrations failed. Starting anyway - database features will be unavailable."
fi

PORT="${PORT:-8000}"
echo "Starting API server on port ${PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
