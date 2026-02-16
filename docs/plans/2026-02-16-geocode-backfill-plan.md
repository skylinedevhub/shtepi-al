# Geocode Backfill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Backfill latitude/longitude for all existing Supabase listings so the map view shows pins.

**Architecture:** A standalone Python script connects to Supabase via psycopg2, fetches listings with null coordinates, geocodes each via Nominatim (1 req/sec) with city-center fallback, and batch-updates rows. A manual GitHub Action wraps the script.

**Tech Stack:** Python 3.12, psycopg2-binary, requests, GitHub Actions

---

### Task 1: Create the backfill script

**Files:**
- Create: `scripts/backfill_geocode.py`

**Step 1: Create `scripts/backfill_geocode.py`**

The script reuses the same geocoding logic as `scrapy_project/shtepi/pipelines.py:GeocodingPipeline` (lines 116-184) and the same `CITY_COORDS` dict (lines 94-110). It uses `psycopg2` (same as `scripts/migrate-sqlite-to-pg.py`).

```python
#!/usr/bin/env python3
"""One-time backfill: add latitude/longitude to listings missing geo data.

Usage:
    DATABASE_URL=postgresql://... python scripts/backfill_geocode.py

Geocodes via Nominatim (1 req/sec rate limit) with city-center fallback.
Safe to re-run — only touches rows where latitude IS NULL.
"""

import os
import sys
import time

import psycopg2
import requests

# Same coords as scrapy_project/shtepi/pipelines.py CITY_COORDS
CITY_COORDS = {
    "Tiranë": (41.3275, 19.8187),
    "Durrës": (41.3246, 19.4565),
    "Vlorë": (40.4660, 19.4913),
    "Sarandë": (39.8661, 20.0050),
    "Shkodër": (42.0693, 19.5126),
    "Korçë": (40.6186, 20.7808),
    "Elbasan": (41.1125, 20.0822),
    "Fier": (40.7239, 19.5563),
    "Berat": (40.7058, 19.9522),
    "Lushnjë": (40.9419, 19.7050),
    "Kamëz": (41.3817, 19.7600),
    "Pogradec": (40.9025, 20.6525),
    "Kavajë": (41.1856, 19.5569),
    "Lezhë": (41.7836, 19.6436),
    "Gjirokastër": (40.0758, 20.1389),
}

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {"User-Agent": "ShtëpiAL/1.0 (real estate aggregator)"}

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    # Try loading from .env.local (same pattern as run_spiders.sh)
    env_file = os.path.join(os.path.dirname(__file__), "..", "web", ".env.local")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    DATABASE_URL = line.strip().split("=", 1)[1]
                    break

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set and not found in web/.env.local")
    sys.exit(1)


def geocode_nominatim(address, city, cache, last_request_time):
    """Geocode via Nominatim with caching and 1 req/sec rate limit."""
    cache_key = f"{address}|{city}".lower()
    if cache_key in cache:
        return cache[cache_key], last_request_time

    elapsed = time.time() - last_request_time
    if elapsed < 1.0:
        time.sleep(1.0 - elapsed)

    try:
        resp = requests.get(
            NOMINATIM_URL,
            params={"q": f"{address}, {city}, Albania", "format": "json", "limit": 1},
            headers=NOMINATIM_HEADERS,
            timeout=10,
        )
        last_request_time = time.time()

        if resp.status_code == 200:
            data = resp.json()
            if data:
                coords = (float(data[0]["lat"]), float(data[0]["lon"]))
                cache[cache_key] = coords
                return coords, last_request_time

        cache[cache_key] = None
        return None, last_request_time
    except Exception:
        cache[cache_key] = None
        return None, last_request_time


def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Fetch listings missing coordinates
    cur.execute(
        "SELECT id, city, neighborhood, address_raw "
        "FROM listings "
        "WHERE latitude IS NULL OR longitude IS NULL"
    )
    rows = cur.fetchall()
    print(f"Found {len(rows)} listings without coordinates")

    if not rows:
        print("Nothing to do.")
        cur.close()
        conn.close()
        return

    cache = {}
    last_req = 0.0
    nominatim_count = 0
    city_center_count = 0
    failed_count = 0
    updates = []

    for listing_id, city, neighborhood, address_raw in rows:
        lat, lon = None, None
        address = address_raw or neighborhood

        # Priority 1: Nominatim geocoding
        if address and city:
            coords, last_req = geocode_nominatim(address, city, cache, last_req)
            if coords:
                lat, lon = coords
                nominatim_count += 1

        # Priority 2: City-center fallback
        if lat is None and city and city in CITY_COORDS:
            lat, lon = CITY_COORDS[city]
            city_center_count += 1

        if lat is not None:
            updates.append((lat, lon, listing_id))
        else:
            failed_count += 1

        # Batch update every 50 rows
        if len(updates) >= 50:
            cur.executemany(
                "UPDATE listings SET latitude = %s, longitude = %s WHERE id = %s",
                updates,
            )
            conn.commit()
            print(f"  Updated {len(updates)} rows...")
            updates = []

    # Flush remaining
    if updates:
        cur.executemany(
            "UPDATE listings SET latitude = %s, longitude = %s WHERE id = %s",
            updates,
        )
        conn.commit()
        print(f"  Updated {len(updates)} rows...")

    print(f"\n=== Summary ===")
    print(f"Nominatim geocoded: {nominatim_count}")
    print(f"City-center fallback: {city_center_count}")
    print(f"Failed (no city): {failed_count}")
    print(f"Total updated: {nominatim_count + city_center_count}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
```

**Step 2: Verify script syntax**

Run: `python -c "import ast; ast.parse(open('scripts/backfill_geocode.py').read()); print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add scripts/backfill_geocode.py
git commit -m "feat: add geocode backfill script for existing listings"
```

---

### Task 2: Create the GitHub Action

**Files:**
- Create: `.github/workflows/geocode-backfill.yml`

**Step 1: Create `.github/workflows/geocode-backfill.yml`**

Follow the same pattern as `.github/workflows/scrape-seed.yml` (manual trigger, Python 3.12, pip cache, `SCRAPER_DATABASE_URL` secret). The script needs `psycopg2-binary` and `requests` — both are already in `scrapy_project/requirements.txt`.

```yaml
name: Geocode Backfill (One-Time)

on:
  workflow_dispatch: # Manual trigger only

jobs:
  backfill:
    runs-on: ubuntu-latest
    timeout-minutes: 180

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
          cache-dependency-path: scrapy_project/requirements.txt

      - name: Install dependencies
        run: pip install psycopg2-binary requests

      - name: Run geocode backfill
        env:
          DATABASE_URL: ${{ secrets.SCRAPER_DATABASE_URL }}
        run: python scripts/backfill_geocode.py
```

**Step 2: Validate YAML syntax**

Run: `python -c "import yaml; yaml.safe_load(open('.github/workflows/geocode-backfill.yml')); print('OK')" 2>/dev/null || python3 -c "print('pyyaml not installed, skip')"`

**Step 3: Commit**

```bash
git add .github/workflows/geocode-backfill.yml
git commit -m "ci: add manual geocode backfill GitHub Action"
```

---

### Task 3: Verify end-to-end (dry run)

**Step 1: Check that the script loads and connects**

Run locally to verify it finds the DB and counts rows:

```bash
# Source DATABASE_URL from .env.local
export DATABASE_URL=$(grep '^DATABASE_URL=' web/.env.local | cut -d= -f2-)
python scripts/backfill_geocode.py
```

Expected output (something like):
```
Found N listings without coordinates
  Updated 50 rows...
  ...
=== Summary ===
Nominatim geocoded: X
City-center fallback: Y
Failed (no city): Z
Total updated: X+Y
```

**Step 2: Verify map shows pins**

Open the deployed site or `npm run dev` in `web/`, navigate to `/listings`, switch to map view. Pins should now appear.

**Step 3: Final commit (design doc)**

```bash
git add docs/plans/2026-02-16-geocode-backfill-design.md docs/plans/2026-02-16-geocode-backfill-plan.md
git commit -m "docs: add geocode backfill design and plan"
```
