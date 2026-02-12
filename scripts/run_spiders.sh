#!/usr/bin/env bash
# Run production spiders against Neon PostgreSQL
# Usage: ./scripts/run_spiders.sh              (loads DATABASE_URL from .env.local)
#        DATABASE_URL="..." ./scripts/run_spiders.sh  (explicit)
# Cron:  0 */6 * * * DATABASE_URL="..." /path/to/run_spiders.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$LOG_DIR/scrape_$TIMESTAMP.log"

# Auto-load DATABASE_URL from .env.local if not already set
if [ -z "${DATABASE_URL:-}" ]; then
    ENV_FILE="$PROJECT_DIR/.env.local"
    if [ -f "$ENV_FILE" ]; then
        DB_LINE=$(grep '^DATABASE_URL=' "$ENV_FILE" || true)
        if [ -n "$DB_LINE" ]; then
            # Strip quotes and export
            export DATABASE_URL=$(echo "$DB_LINE" | sed 's/^DATABASE_URL=//' | sed 's/^"//' | sed 's/"$//')
        fi
    fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL not set and not found in .env.local" | tee -a "$LOG_FILE"
    exit 1
fi

cd "$PROJECT_DIR/scrapy_project"

# Production spiders (celesi excluded — Cloudflare blocks Scrapy)
SPIDERS="merrjep mirlir njoftime duashpi"

echo "=== ShtëpiAL Spider Run ===" | tee -a "$LOG_FILE"
echo "  Time:    $TIMESTAMP" | tee -a "$LOG_FILE"
echo "  Spiders: $SPIDERS" | tee -a "$LOG_FILE"
echo "  Target:  PostgreSQL (Neon)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

SUCCEEDED=0
FAILED=0
TOTAL_ITEMS=0

for spider in $SPIDERS; do
    SPIDER_LOG="$LOG_DIR/${spider}_$TIMESTAMP.log"
    echo "[$(date +%H:%M:%S)] Running $spider..." | tee -a "$LOG_FILE"

    if DATABASE_URL="$DATABASE_URL" scrapy crawl "$spider" \
        -s HTTPCACHE_ENABLED=False \
        -s LOG_FILE="$SPIDER_LOG" \
        2>&1; then

        # Extract item count from Scrapy stats in the log
        ITEMS=$(grep -oP "'item_scraped_count': \K[0-9]+" "$SPIDER_LOG" 2>/dev/null || echo "0")
        TOTAL_ITEMS=$((TOTAL_ITEMS + ITEMS))
        SUCCEEDED=$((SUCCEEDED + 1))
        echo "[$(date +%H:%M:%S)] $spider: $ITEMS listings scraped" | tee -a "$LOG_FILE"
    else
        FAILED=$((FAILED + 1))
        echo "[$(date +%H:%M:%S)] $spider: FAILED (see $SPIDER_LOG)" | tee -a "$LOG_FILE"
    fi
done

echo "" | tee -a "$LOG_FILE"
echo "=== Summary ===" | tee -a "$LOG_FILE"
echo "  Spiders: $SUCCEEDED succeeded, $FAILED failed" | tee -a "$LOG_FILE"
echo "  Listings scraped: $TOTAL_ITEMS" | tee -a "$LOG_FILE"
echo "  Logs: $LOG_DIR/*_$TIMESTAMP.log" | tee -a "$LOG_FILE"

# Cleanup old logs (keep 7 days)
find "$LOG_DIR" -name "*.log" -mtime +7 -delete 2>/dev/null || true
