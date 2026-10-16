#!/usr/bin/env bash
# Backs up the Postgres database and the uploads directory.
# Usage: ./scripts/backup.sh [output-dir]
#
# Intended to run on the host (or inside the `app` container via `docker compose exec`)
# on a daily cron. Reads DATABASE_URL from the environment or .env.
set -euo pipefail

OUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$OUT_DIR"

if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  export "$(grep -E '^DATABASE_URL=' .env | xargs)"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set. Export it or add it to .env." >&2
  exit 1
fi

DB_DUMP="$OUT_DIR/db_${TIMESTAMP}.sql.gz"
echo "Dumping database to $DB_DUMP ..."
pg_dump "$DATABASE_URL" | gzip > "$DB_DUMP"

UPLOADS_DIR="${UPLOADS_DIR:-./uploads}"
if [ -d "$UPLOADS_DIR" ]; then
  UPLOADS_TAR="$OUT_DIR/uploads_${TIMESTAMP}.tar.gz"
  echo "Archiving uploads to $UPLOADS_TAR ..."
  tar -czf "$UPLOADS_TAR" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
fi

echo "Backup complete: $OUT_DIR"
echo "Keep backups off-box (e.g. synced to another machine or object storage) — a copy on the same disk doesn't protect against disk failure."
