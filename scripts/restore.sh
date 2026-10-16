#!/usr/bin/env bash
# Restores a database dump produced by backup.sh.
# Usage: ./scripts/restore.sh path/to/db_TIMESTAMP.sql.gz
#
# WARNING: this overwrites the target database. Confirm DATABASE_URL points
# at the right database before running.
set -euo pipefail

DUMP_FILE="${1:?Usage: ./scripts/restore.sh path/to/db_TIMESTAMP.sql.gz}"

if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  export "$(grep -E '^DATABASE_URL=' .env | xargs)"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Export it or add it to .env." >&2
  exit 1
fi

echo "About to restore $DUMP_FILE into: $DATABASE_URL"
read -p "This will overwrite existing data. Continue? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

gunzip -c "$DUMP_FILE" | psql "$DATABASE_URL"
echo "Restore complete."
