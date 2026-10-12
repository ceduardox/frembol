#!/bin/bash
set -e

trap 'echo "An error occurred. Exiting..."; exit 1' ERR

cmd="$@"

# Construct DATABASE_URL from environment variables if not already set
if [ -z "$DATABASE_URL" ]; then
  if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_HOST" ]; then
    export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "WARNING: Neither DATABASE_URL nor POSTGRES_* environment variables are set."
  echo "Skipping migrations and proceeding to start application..."
else
  echo "Waiting for PostgreSQL to be ready..."
  max_retries=15
  count=0
  until pg_isready -d "$DATABASE_URL" -q; do
    count=$((count + 1))
    if [ $count -ge $max_retries ]; then
      echo "WARNING: PostgreSQL is still unreachable after 30s. Skipping database migrations..."
      break
    fi
    echo "PostgreSQL is unavailable - sleeping 2s (attempt $count/$max_retries)..."
    sleep 2
  done

  if [ $count -lt $max_retries ]; then
    echo "PostgreSQL is ready!"
    app_dir="$PWD"
    cd "$app_dir/tools"

    echo "Applying database migrations..."
    if ! npx prisma migrate deploy 2>/dev/null; then
      # P3005: existing DB without migration history (from db push).
      # Create empty migration table so migrate deploy can run.
      # 0_init is fully idempotent — safe on any DB state.
      echo "Existing database detected. Creating migration table..."
      npx prisma db execute --stdin <<< 'CREATE TABLE IF NOT EXISTS "_prisma_migrations" ("id" VARCHAR(36) PRIMARY KEY NOT NULL, "checksum" VARCHAR(64) NOT NULL, "finished_at" TIMESTAMPTZ, "migration_name" VARCHAR(255) NOT NULL, "logs" TEXT, "rolled_back_at" TIMESTAMPTZ, "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "applied_steps_count" INTEGER NOT NULL DEFAULT 0)'
      npx prisma migrate deploy
    fi
    echo "Migrations applied successfully!"

    cd "$app_dir"
  fi
fi

# Photo embedding is the one thing here that depends on a native module, and
# sharp's prebuilt binaries need an x86-64-v2 CPU. Some virtualised hosts do not
# advertise one — Proxmox's default kvm64 processor model, for instance, reports
# a baseline x86-64 even on modern hardware. Report it at boot rather than
# leaving it to be found when a certificate comes out without its photos.
# Never fatal: everything else in the app works without it.
if ! sharp_error=$(node -e "require('sharp')" 2>&1); then
  echo "WARNING: sharp could not be loaded. Inspection certificates will render without photos."
  echo "$sharp_error" | sed 's/^/  /'
fi

echo "Starting application..."
exec $cmd
