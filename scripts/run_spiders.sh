#!/usr/bin/env bash
# Run all Tier 1 spiders sequentially
# Intended for cron: 0 */6 * * * /path/to/run_spiders.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"
DB_PATH="$PROJECT_DIR/db/shtepi.db"

mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/scrape_$TIMESTAMP.log"

export SQLITE_DB_PATH="$DB_PATH"

cd "$PROJECT_DIR/scrapy_project"

echo "[$TIMESTAMP] Starting spider run" | tee -a "$LOG_FILE"

# Initialize DB if needed
if [ ! -f "$DB_PATH" ]; then
    echo "Initializing database..." | tee -a "$LOG_FILE"
    sqlite3 "$DB_PATH" < "$PROJECT_DIR/db/schema.sql"
fi

# Run each spider
for spider in merrjep celesi mirlir njoftime; do
    echo "[$(date +%H:%M:%S)] Running $spider spider..." | tee -a "$LOG_FILE"
    scrapy crawl "$spider" --logfile "$LOG_DIR/${spider}_$TIMESTAMP.log" 2>&1 || {
        echo "[$(date +%H:%M:%S)] WARNING: $spider spider failed" | tee -a "$LOG_FILE"
    }
done

echo "[$(date +%H:%M:%S)] Spider run complete" | tee -a "$LOG_FILE"

# Cleanup old logs (keep 7 days)
find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
