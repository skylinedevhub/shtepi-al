#!/usr/bin/env bash
# Run production spiders against Neon PostgreSQL
# Usage: DATABASE_URL="postgresql://..." ./scripts/run_spiders.sh
# Cron:  0 */6 * * * DATABASE_URL="postgresql://..." /path/to/run_spiders.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/scrape_$TIMESTAMP.log"

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL environment variable required" | tee -a "$LOG_FILE"
    exit 1
fi

cd "$PROJECT_DIR/scrapy_project"

# Production spiders (celesi excluded — Cloudflare blocks Scrapy)
SPIDERS="merrjep mirlir njoftime duashpi"

echo "[$TIMESTAMP] Starting spider run (PostgreSQL)" | tee -a "$LOG_FILE"
echo "  Spiders: $SPIDERS" | tee -a "$LOG_FILE"

TOTAL=0
FAILED=0

for spider in $SPIDERS; do
    echo "[$(date +%H:%M:%S)] Running $spider spider..." | tee -a "$LOG_FILE"
    if DATABASE_URL="$DATABASE_URL" scrapy crawl "$spider" \
        --logfile "$LOG_DIR/${spider}_$TIMESTAMP.log" 2>&1; then
        TOTAL=$((TOTAL + 1))
        echo "[$(date +%H:%M:%S)] $spider completed" | tee -a "$LOG_FILE"
    else
        FAILED=$((FAILED + 1))
        echo "[$(date +%H:%M:%S)] WARNING: $spider spider failed" | tee -a "$LOG_FILE"
    fi
done

echo "[$(date +%H:%M:%S)] Spider run complete: $TOTAL succeeded, $FAILED failed" | tee -a "$LOG_FILE"

# Cleanup old logs (keep 7 days)
find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
