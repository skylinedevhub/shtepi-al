# TDD Review & Fix Design

**Date:** 2026-02-17
**Approach:** Strict TDD — write failing tests first, then fix code to make them pass

## Problem Statement

Multiple bugs and gaps discovered during comprehensive project review:
- 3 failing spider tests (duashpi START_URLS mismatch)
- Coordinate overwrite bug in PostgreSQL upsert (data loss on every daily scrape)
- CITY_COORDS drift between pipeline (15 cities) and backfill script (22 cities)
- Daily scrape workflow runs sequentially (hung spider blocks all)
- Zero test coverage for map components

## Section 1: Duashpi Spider Test Fix

**Bug:** `DuashpiSpider` uses `START_URLS` (uppercase custom attr) with a `start_requests()` override to inject `meta={"impersonate": "chrome"}`. Tests check `spider.start_urls` (Scrapy's built-in, always `[]`).

**TDD Steps:**
1. Update `TestStartUrls` to check `spider.START_URLS`
2. Add test: `start_requests()` yields requests with `impersonate: chrome` meta
3. Verify all 363 tests pass

**Rationale for test update (not spider change):** The `start_requests()` override is necessary to inject `impersonate` meta for anti-bot bypass. Renaming to `start_urls` would lose this capability.

## Section 2: Coordinate Overwrite Bug (COALESCE Guard)

**Bug:** `PostgreSQLPipeline._flush()` upsert includes `latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude`. When a re-scrape produces NULL coordinates (Nominatim failure + no city fallback), it overwrites previously good coordinates.

**TDD Steps:**
1. Write failing test: upsert with `latitude=None` on existing row with coordinates → existing coordinates preserved
2. Write failing test: upsert with new coordinates on existing row → new coordinates applied
3. Fix: Change upsert to `COALESCE(EXCLUDED.latitude, listings.latitude)` for both columns
4. Both tests pass

**Files:** `scrapy_project/shtepi/pipelines.py`, `scrapy_project/tests/test_postgresql_pipeline.py` (or new)

## Section 3: CITY_COORDS Consistency

**Bug:** Pipeline's `CITY_COORDS` has 15 cities. Backfill script has 22 (adds Vorë, Golem, Himarë, Ksamil, Dhërmi, Përmet, Prishtinë). Listings in those 7 cities get no fallback during live scraping.

**TDD Steps:**
1. Extract canonical city coords to shared module `scrapy_project/shtepi/city_coords.py`
2. Write test: pipeline and backfill import from same source (no drift possible)
3. Write test: canonical list includes all 22 cities
4. Update pipeline and backfill to import from shared module
5. Tests pass

**Files:** New `scrapy_project/shtepi/city_coords.py`, update `pipelines.py` and `scripts/backfill_geocode.py`

## Section 4: Parallel Scrape Workflow

**Change:** Restructure `.github/workflows/scrape.yml` to use matrix strategy (one job per spider), matching the pattern in `scrape-seed.yml`.

**Steps:**
1. Define matrix: `spider: [merrjep, mirlir, celesi, duashpi, njoftime]`
2. Each job gets its own 15-minute timeout
3. One spider failing doesn't block others
4. Validate YAML syntax

**Files:** `.github/workflows/scrape.yml`

## Section 5: Map Component Smoke Tests

**Gap:** Zero test coverage for `MapView.tsx`, `DetailMap.tsx`, `MapPinPicker.tsx`.

**TDD Steps:**
1. Set up Jest + React Testing Library for map components (mock Leaflet)
2. Write tests:
   - `MapView`: renders, filters out null-coord listings, handles empty array
   - `DetailMap`: renders with valid coords
   - `MapPinPicker`: renders, calls onChange on marker drag
3. Implement any fixes needed to make tests pass

**Files:** New `web/src/components/__tests__/MapView.test.tsx`, etc.

## Success Criteria

- [ ] All 363+ tests pass (0 failures)
- [ ] Coordinate overwrite impossible (COALESCE verified by test)
- [ ] CITY_COORDS single source of truth (22 cities)
- [ ] Daily scrape runs spiders in parallel
- [ ] Map components have smoke test coverage
