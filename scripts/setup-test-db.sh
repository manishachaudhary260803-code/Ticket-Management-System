#!/usr/bin/env bash
# Run once before e2e tests to ensure the test database exists.
# Uses sudo to connect as the postgres superuser on the correct socket.
set -e

DB="ticket_db_test"
SOCKET="/var/run/postgresql"
PORT=5432
OWNER=$(whoami)

if psql -h "$SOCKET" -p "$PORT" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB'" | grep -q 1; then
  echo "[setup-test-db] $DB already exists — skipping"
  exit 0
fi

echo "[setup-test-db] Creating $DB (you may be prompted for your sudo password)..."
sudo -u postgres psql -h "$SOCKET" -p "$PORT" -c "CREATE DATABASE $DB OWNER $OWNER"
echo "[setup-test-db] $DB created."
