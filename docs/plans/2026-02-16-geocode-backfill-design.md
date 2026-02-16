# Geocode Backfill Design

## Problem
The map UI is fully built (MapView with clustering, popups, split-panel layout) but existing listings in Supabase have null latitude/longitude. The GeocodingPipeline handles new crawls, but listings scraped before geocoding was added need a one-time backfill.

## Solution
A standalone Python script (`scripts/backfill_geocode.py`) triggered via a manual GitHub Action (`geocode-backfill.yml`).

### Script behavior
1. Connect to Supabase via `DATABASE_URL`
2. Fetch all listings where `latitude IS NULL OR longitude IS NULL`
3. For each listing, resolve coordinates in priority order:
   - **Nominatim geocoding** from `address_raw` or `neighborhood` + `city` + `, Albania` (1 req/sec rate limit)
   - **City-center fallback** from `CITY_COORDS` dict (reused from `pipelines.py`)
4. Batch-UPDATE rows (batch size: 50)
5. Print summary: nominatim count, city-center count, failed count

### GitHub Action
- `workflow_dispatch` only (manual trigger, one-time use)
- `timeout-minutes: 180` (generous — at 1 req/sec, 1000 listings = ~17 min)
- Uses `secrets.SCRAPER_DATABASE_URL` (same as scrape workflows)
- Single job, same Python setup pattern as existing workflows

### After this runs
The existing `GeocodingPipeline` (priority 250 in the Scrapy pipeline chain) already geocodes every new crawl. No ongoing action needed.

## Files to create
1. `scripts/backfill_geocode.py` — the backfill script (~70 lines)
2. `.github/workflows/geocode-backfill.yml` — manual GitHub Action

## Files unchanged
- `MapView.tsx` — already filters to listings with lat/lon
- `pipelines.py` — GeocodingPipeline already handles future crawls
- `schema.ts` — latitude/longitude columns already exist
