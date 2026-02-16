#!/usr/bin/env python3
"""One-time backfill: add latitude/longitude to listings missing geo data.

Usage:
    DATABASE_URL=postgresql://... python scripts/backfill_geocode.py [--limit N]

Geocodes via Nominatim (1 req/sec rate limit) with city-center fallback.
Safe to re-run — only touches rows where latitude IS NULL.
"""

import argparse
import os
import sys
import time

import psycopg2
import requests

# City name normalization (from scrapy_project/shtepi/normalizers.py CITY_MAP)
CITY_MAP = {
    "tirane": "Tiranë", "tirana": "Tiranë", "tiranë": "Tiranë", "tirané": "Tiranë",
    "durres": "Durrës", "durrës": "Durrës", "durrs": "Durrës",
    "vlore": "Vlorë", "vlorë": "Vlorë", "vlora": "Vlorë",
    "sarande": "Sarandë", "sarandë": "Sarandë", "saranda": "Sarandë",
    "shkoder": "Shkodër", "shkodër": "Shkodër", "shkodra": "Shkodër",
    "korce": "Korçë", "korçë": "Korçë", "korca": "Korçë",
    "elbasan": "Elbasan", "fier": "Fier", "berat": "Berat",
    "lushnje": "Lushnjë", "lushnjë": "Lushnjë",
    "pogradec": "Pogradec", "kamez": "Kamëz", "kamëz": "Kamëz",
    "vore": "Vorë", "vorë": "Vorë", "golem": "Golem",
    "kavaje": "Kavajë", "kavajë": "Kavajë",
    "lezhe": "Lezhë", "lezhë": "Lezhë",
    "gjirokaster": "Gjirokastër", "gjirokastër": "Gjirokastër",
    "himare": "Himarë", "himarë": "Himarë",
    "ksamil": "Ksamil", "dhermi": "Dhërmi", "dhërmi": "Dhërmi",
    "permet": "Përmet", "përmet": "Përmet",
    "prishtine": "Prishtinë", "prishtinë": "Prishtinë",
    "shqiperi": "Shqipëri",
}

# Same coords as scrapy_project/shtepi/pipelines.py CITY_COORDS + extras from DB
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
    "Vorë": (41.3939, 19.6522),
    "Golem": (41.2514, 19.4756),
    "Himarë": (40.1008, 19.7453),
    "Ksamil": (39.7831, 20.0003),
    "Dhërmi": (40.1525, 19.6097),
    "Përmet": (40.2336, 20.3517),
    "Prishtinë": (42.6629, 21.1655),
}


def normalize_city(raw):
    """Normalize city name — strip scraping artifacts and map to canonical form."""
    if not raw:
        return None
    cleaned = raw.strip()
    # Strip "Vendndodhja në hartë" suffix (merrjep.al artifact)
    cleaned = cleaned.replace("Vendndodhja në hartë", "").strip()
    key = cleaned.lower()
    # Remove common prefixes
    for prefix in ("qyteti ", "qyteti i ", "në "):
        if key.startswith(prefix):
            key = key[len(prefix):]
    return CITY_MAP.get(key, cleaned)

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
    parser = argparse.ArgumentParser(description="Backfill geocode data for listings")
    parser.add_argument("--limit", type=int, default=0, help="Max listings to process (0 = all)")
    args = parser.parse_args()

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    # Fetch listings missing coordinates (newest first so most-visible listings get geocoded first)
    query = (
        "SELECT id, city, neighborhood, address_raw "
        "FROM listings "
        "WHERE latitude IS NULL OR longitude IS NULL "
        "ORDER BY created_at DESC NULLS LAST"
    )
    if args.limit:
        query += f" LIMIT {args.limit}"
    cur.execute(query)
    rows = cur.fetchall()
    print(f"Found {len(rows)} listings to process")

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

    for listing_id, raw_city, neighborhood, address_raw in rows:
        lat, lon = None, None
        city = normalize_city(raw_city)
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
