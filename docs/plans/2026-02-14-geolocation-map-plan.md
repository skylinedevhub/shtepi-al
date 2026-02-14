# Geolocation & Map View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real coordinates to listings (spider-scraped → Nominatim geocoded → city fallback) and display them as clustered individual markers on the map, with a detail page map and a form pin picker.

**Architecture:** Three-tier coordinate resolution in the Scrapy pipeline. Frontend uses react-leaflet-cluster for marker clustering. MapPinPicker component for user-created listings. No PostGIS, no spatial indexes, no distance search.

**Tech Stack:** Scrapy, Python requests (Nominatim), Leaflet/react-leaflet, react-leaflet-cluster, Drizzle ORM, Next.js 14

**Worktree:** `/home/yb97/src/projects/shtepi-al/.worktrees/geolocation-map` (branch: `feature/geolocation-map`)

**Design doc:** `docs/plans/2026-02-14-geolocation-map-design.md`

---

## Task 1: Add latitude/longitude to Scrapy ListingItem

**Files:**
- Modify: `scrapy_project/shtepi/items.py:35-38` (Location section)

**Step 1: Add fields**

In `scrapy_project/shtepi/items.py`, add after `address_raw = scrapy.Field()` (line 38):

```python
    latitude = scrapy.Field()      # float, WGS84
    longitude = scrapy.Field()     # float, WGS84
```

**Step 2: Verify**

Run: `cd scrapy_project && python -c "from shtepi.items import ListingItem; i = ListingItem(); i['latitude'] = 41.33; i['longitude'] = 19.82; print(i)"`
Expected: Item prints with latitude=41.33, longitude=19.82

**Step 3: Commit**

```bash
git add scrapy_project/shtepi/items.py
git commit -m "feat: add latitude/longitude fields to ListingItem"
```

---

## Task 2: Add latitude/longitude to SQLite schema

**Files:**
- Modify: `db/schema.sql:31-34` (Location section)

**Step 1: Add columns**

In `db/schema.sql`, add after `address_raw TEXT,` (line 34):

```sql
    latitude REAL,
    longitude REAL,
```

**Step 2: Verify syntax**

Run: `cd scrapy_project && python -c "import sqlite3; conn = sqlite3.connect(':memory:'); conn.executescript(open('../db/schema.sql').read()); print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add db/schema.sql
git commit -m "feat: add latitude/longitude columns to SQLite schema"
```

---

## Task 3: Update storage pipelines to store lat/lng

**Files:**
- Modify: `scrapy_project/shtepi/pipelines.py`
  - SQLitePipeline UPDATE (lines 157-202): add latitude, longitude
  - SQLitePipeline INSERT (lines 207-272): add latitude, longitude
  - PostgreSQLPipeline params dict (lines 347-380): add latitude, longitude
  - PostgreSQLPipeline INSERT SQL (lines 383-442): add latitude, longitude columns + UPSERT

**Step 1: Update SQLitePipeline UPDATE query**

In the UPDATE SQL (line 158), add after `address_raw = ?,` (within the SET clause, after the `city = ?, neighborhood = ?, address_raw = ?,` block):

```sql
                    latitude = ?, longitude = ?,
```

And in the corresponding params tuple, add after `item.get("address_raw"),` (line 189):

```python
                    item.get("latitude"),
                    item.get("longitude"),
```

**Step 2: Update SQLitePipeline INSERT query**

In the INSERT column list (line 208), add after `city, neighborhood, address_raw,`:

```sql
                    latitude, longitude,
```

In the VALUES placeholders, add two more `?, ?` in the corresponding position.

In the params tuple, add after `item.get("address_raw"),` (line 257):

```python
                    item.get("latitude"),
                    item.get("longitude"),
```

**Step 3: Update PostgreSQLPipeline params dict**

In the `params` dict (line 347), add after `"address_raw": item.get("address_raw"),` (line 369):

```python
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
```

**Step 4: Update PostgreSQLPipeline INSERT SQL**

In the INSERT column list (line 384), add after `city, neighborhood, address_raw,`:

```sql
                        latitude, longitude,
```

In the VALUES list, add in corresponding position:

```sql
                        %(latitude)s, %(longitude)s,
```

In the ON CONFLICT DO UPDATE SET clause, add after `address_raw = EXCLUDED.address_raw,`:

```sql
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
```

**Step 5: Verify**

Run: `cd scrapy_project && python -c "from shtepi.pipelines import SQLitePipeline, PostgreSQLPipeline; print('Import OK')"`
Expected: `Import OK`

**Step 6: Commit**

```bash
git add scrapy_project/shtepi/pipelines.py
git commit -m "feat: store latitude/longitude in both SQLite and PostgreSQL pipelines"
```

---

## Task 4: Create GeocodingPipeline

**Files:**
- Modify: `scrapy_project/shtepi/pipelines.py` (add new class after NormalizationPipeline, before DedupPipeline)
- Modify: `scrapy_project/shtepi/settings.py:28-33` (add to ITEM_PIPELINES)

**Step 1: Write the test**

Create `scrapy_project/tests/test_geocoding_pipeline.py`:

```python
"""Tests for GeocodingPipeline."""

import pytest
from unittest.mock import patch, MagicMock

from shtepi.items import ListingItem
from shtepi.pipelines import GeocodingPipeline


# ─── City fallback ─────────────────────────────────────────────


class TestCityFallback:
    """When no address data and no spider coords, use city center."""

    def setup_method(self):
        self.pipeline = GeocodingPipeline()
        self.spider = MagicMock()

    def test_tirane_fallback(self):
        item = ListingItem(
            source="test", source_id="1", source_url="http://test.al/1",
            title="Test", transaction_type="sale",
            city="Tiranë", images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result["latitude"] == pytest.approx(41.3275, abs=0.001)
        assert result["longitude"] == pytest.approx(19.8187, abs=0.001)

    def test_durres_fallback(self):
        item = ListingItem(
            source="test", source_id="2", source_url="http://test.al/2",
            title="Test", transaction_type="sale",
            city="Durrës", images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result["latitude"] == pytest.approx(41.3246, abs=0.001)
        assert result["longitude"] == pytest.approx(19.4565, abs=0.001)

    def test_unknown_city_no_coords(self):
        item = ListingItem(
            source="test", source_id="3", source_url="http://test.al/3",
            title="Test", transaction_type="sale",
            city="UnknownVillage", images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result.get("latitude") is None
        assert result.get("longitude") is None

    def test_no_city_no_coords(self):
        item = ListingItem(
            source="test", source_id="4", source_url="http://test.al/4",
            title="Test", transaction_type="sale",
            images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result.get("latitude") is None
        assert result.get("longitude") is None


# ─── Spider-provided coords passthrough ────────────────────────


class TestSpiderCoordsPassthrough:
    """When spider already provides lat/lng, skip geocoding."""

    def setup_method(self):
        self.pipeline = GeocodingPipeline()
        self.spider = MagicMock()

    def test_passthrough(self):
        item = ListingItem(
            source="test", source_id="5", source_url="http://test.al/5",
            title="Test", transaction_type="sale",
            city="Tiranë", images=["http://img.al/1.jpg"],
            latitude=41.35, longitude=19.85,
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result["latitude"] == 41.35
        assert result["longitude"] == 19.85


# ─── Nominatim geocoding ───────────────────────────────────────


class TestNominatimGeocoding:
    """When address_raw or neighborhood available, try Nominatim."""

    def setup_method(self):
        self.pipeline = GeocodingPipeline()
        self.spider = MagicMock()

    @patch("shtepi.pipelines.requests.get")
    def test_geocode_with_neighborhood(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"lat": "41.3285", "lon": "19.8200"}
        ]
        mock_get.return_value = mock_response

        item = ListingItem(
            source="test", source_id="6", source_url="http://test.al/6",
            title="Test", transaction_type="sale",
            city="Tiranë", neighborhood="Blloku",
            images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result["latitude"] == pytest.approx(41.3285, abs=0.0001)
        assert result["longitude"] == pytest.approx(19.82, abs=0.0001)
        mock_get.assert_called_once()

    @patch("shtepi.pipelines.requests.get")
    def test_geocode_with_address_raw(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"lat": "41.3300", "lon": "19.8100"}
        ]
        mock_get.return_value = mock_response

        item = ListingItem(
            source="test", source_id="7", source_url="http://test.al/7",
            title="Test", transaction_type="sale",
            city="Tiranë", address_raw="Rruga Myslym Shyri",
            images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        assert result["latitude"] == pytest.approx(41.33, abs=0.001)

    @patch("shtepi.pipelines.requests.get")
    def test_nominatim_empty_response_falls_back_to_city(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_get.return_value = mock_response

        item = ListingItem(
            source="test", source_id="8", source_url="http://test.al/8",
            title="Test", transaction_type="sale",
            city="Tiranë", neighborhood="SomeObscurePlace",
            images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        # Falls back to city center
        assert result["latitude"] == pytest.approx(41.3275, abs=0.001)

    @patch("shtepi.pipelines.requests.get")
    def test_nominatim_error_falls_back_to_city(self, mock_get):
        mock_get.side_effect = Exception("Network error")

        item = ListingItem(
            source="test", source_id="9", source_url="http://test.al/9",
            title="Test", transaction_type="sale",
            city="Tiranë", neighborhood="Blloku",
            images=["http://img.al/1.jpg"],
        )
        result = self.pipeline.process_item(item, self.spider)
        # Falls back to city center
        assert result["latitude"] == pytest.approx(41.3275, abs=0.001)

    @patch("shtepi.pipelines.requests.get")
    def test_cache_avoids_duplicate_requests(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"lat": "41.3285", "lon": "19.8200"}
        ]
        mock_get.return_value = mock_response

        item1 = ListingItem(
            source="test", source_id="10", source_url="http://test.al/10",
            title="Test1", transaction_type="sale",
            city="Tiranë", neighborhood="Blloku",
            images=["http://img.al/1.jpg"],
        )
        item2 = ListingItem(
            source="test", source_id="11", source_url="http://test.al/11",
            title="Test2", transaction_type="sale",
            city="Tiranë", neighborhood="Blloku",
            images=["http://img.al/1.jpg"],
        )
        self.pipeline.process_item(item1, self.spider)
        self.pipeline.process_item(item2, self.spider)
        # Only one HTTP call — second was cached
        assert mock_get.call_count == 1
```

**Step 2: Run test to verify it fails**

Run: `cd scrapy_project && python -m pytest tests/test_geocoding_pipeline.py -v`
Expected: FAIL — `GeocodingPipeline` doesn't exist yet

**Step 3: Implement GeocodingPipeline**

Add `import requests` and `import time` at the top of `scrapy_project/shtepi/pipelines.py` (with the other imports).

Add this class after `NormalizationPipeline` (after line 87) and before `DedupPipeline`:

```python
# City center coordinates for fallback geocoding
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


class GeocodingPipeline:
    """Resolve latitude/longitude for listings.

    Priority:
    1. Spider-provided coords (passthrough)
    2. Nominatim geocoding from address/neighborhood + city
    3. City center fallback from CITY_COORDS
    """

    def __init__(self):
        self._cache = {}       # address_key → (lat, lng) or None
        self._last_request = 0  # timestamp for rate limiting

    def process_item(self, item, spider):
        # 1. Already has coordinates from spider
        if item.get("latitude") and item.get("longitude"):
            return item

        city = item.get("city")
        address = item.get("address_raw") or item.get("neighborhood")

        # 2. Try Nominatim if we have address-level data
        if address and city:
            coords = self._geocode(address, city)
            if coords:
                item["latitude"], item["longitude"] = coords
                return item

        # 3. Fall back to city center
        if city and city in CITY_COORDS:
            item["latitude"], item["longitude"] = CITY_COORDS[city]
            return item

        return item

    def _geocode(self, address, city):
        """Geocode address via Nominatim with caching and rate limiting."""
        cache_key = f"{address}|{city}".lower()
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Rate limit: 1 req/sec
        now = time.time()
        elapsed = now - self._last_request
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)

        try:
            resp = requests.get(
                NOMINATIM_URL,
                params={"q": f"{address}, {city}, Albania", "format": "json", "limit": 1},
                headers=NOMINATIM_HEADERS,
                timeout=10,
            )
            self._last_request = time.time()

            if resp.status_code == 200:
                data = resp.json()
                if data:
                    coords = (float(data[0]["lat"]), float(data[0]["lon"]))
                    self._cache[cache_key] = coords
                    return coords

            self._cache[cache_key] = None
            return None

        except Exception:
            self._cache[cache_key] = None
            return None
```

**Step 4: Register in settings.py**

In `scrapy_project/shtepi/settings.py`, update ITEM_PIPELINES (lines 28-33) to insert GeocodingPipeline at priority 250 (after Normalization at 200, before Dedup at 300):

```python
ITEM_PIPELINES = {
    "shtepi.pipelines.ValidationPipeline": 100,
    "shtepi.pipelines.NormalizationPipeline": 200,
    "shtepi.pipelines.GeocodingPipeline": 250,
    "shtepi.pipelines.DedupPipeline": 300,
    _store_pipeline: 400,
}
```

**Step 5: Run tests**

Run: `cd scrapy_project && python -m pytest tests/test_geocoding_pipeline.py -v`
Expected: All tests PASS

**Step 6: Run full test suite**

Run: `cd scrapy_project && python -m pytest tests/ -v`
Expected: All 352+ tests PASS (no regressions)

**Step 7: Commit**

```bash
git add scrapy_project/shtepi/pipelines.py scrapy_project/shtepi/settings.py scrapy_project/tests/test_geocoding_pipeline.py
git commit -m "feat: add GeocodingPipeline with Nominatim + city fallback"
```

---

## Task 5: Investigate and extract coordinates from spiders

**Files:**
- Modify: Each spider in `scrapy_project/shtepi/spiders/` (5 spiders)
- Test fixtures may need updating

**Context:** None of the 5 spiders currently extract lat/lng. You need to investigate each source site's listing detail pages for embedded map data. This is a research-heavy task.

**Step 1: Investigate each source site**

For each spider (merrjep, celesi, mirlir, njoftime, duashpi), visit 2-3 listing detail pages using Playwright browser or curl and look for:

1. **Google Maps iframes** — look for `<iframe>` with `maps.google` or `google.com/maps` in src. Extract `!2d{lng}!3d{lat}` or `@{lat},{lng}` from the URL.
2. **Data attributes** — `data-lat`, `data-lng`, `data-latitude`, `data-longitude` on any element.
3. **JavaScript variables** — search page source for patterns like `lat:`, `lng:`, `latitude:`, `longitude:`, `LatLng(`, `coordinates`.
4. **JSON-LD / Schema.org** — look for `<script type="application/ld+json">` with `geo` or `latitude`/`longitude` fields.
5. **OpenStreetMap embeds** — look for OSM iframe URLs with lat/lng params.

**Step 2: For each spider that has extractable coordinates, add extraction logic**

In the spider's `parse_detail()` (or `parse_listing()` / `parse_thread()`), add coordinate extraction. Example pattern:

```python
# Extract coordinates from Google Maps iframe
map_iframe = response.css('iframe[src*="google.com/maps"]::attr(src)').get()
if map_iframe:
    import re
    lat_lng = re.search(r'!3d([-\d.]+)!2d([-\d.]+)', map_iframe)
    if lat_lng:
        item["latitude"] = float(lat_lng.group(1))
        item["longitude"] = float(lat_lng.group(2))
```

**Step 3: For spiders WITHOUT extractable coordinates, do nothing**

The GeocodingPipeline will handle these via Nominatim/city fallback. Don't force it.

**Step 4: Update test fixtures if extraction was added**

If a spider now extracts lat/lng, update the corresponding test fixture HTML to include the map element, and add test assertions for the coordinates.

**Step 5: Run full test suite**

Run: `cd scrapy_project && python -m pytest tests/ -v`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add scrapy_project/shtepi/spiders/ scrapy_project/tests/
git commit -m "feat: extract coordinates from spider source pages where available"
```

---

## Task 6: Add latitude/longitude to frontend Listing type

**Files:**
- Modify: `web/src/lib/types.ts:1-37` (Listing interface)
- Modify: `web/src/lib/db/queries.ts:14-52` (dbRowToListing function)
- Modify: `web/src/lib/validators.ts:3-31` (listingCreateSchema)
- Modify: `web/src/app/api/listings/route.ts:113-147` (POST handler values)

**Step 1: Add to Listing interface**

In `web/src/lib/types.ts`, add after `address_raw: string | null;` (line 23):

```typescript
  latitude: number | null;
  longitude: number | null;
```

**Step 2: Add to dbRowToListing mapping**

In `web/src/lib/db/queries.ts`, add after `address_raw: row.addressRaw,` in the dbRowToListing function:

```typescript
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
```

**Step 3: Add to Zod validator**

In `web/src/lib/validators.ts`, add after `address_raw: z.string().max(500).optional(),` (line 23):

```typescript
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
```

**Step 4: Add to API POST handler**

In `web/src/app/api/listings/route.ts`, add to the `.values({...})` block (after `addressRaw: data.address_raw,`, line 132):

```typescript
      latitude: data.latitude,
      longitude: data.longitude,
```

**Step 5: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No type errors

**Step 6: Commit**

```bash
git add web/src/lib/types.ts web/src/lib/db/queries.ts web/src/lib/validators.ts web/src/app/api/listings/route.ts
git commit -m "feat: add latitude/longitude to frontend Listing type and API"
```

---

## Task 7: Install react-leaflet-cluster and update MapView

**Files:**
- Modify: `web/package.json` (new dependency)
- Modify: `web/src/components/MapView.tsx` (replace city aggregates with individual clustered markers)

**Step 1: Install dependency**

Run: `cd web && npm install react-leaflet-cluster`

**Step 2: Rewrite MapView**

Replace `web/src/components/MapView.tsx` with individual markers + clustering. Key changes:

- Import `MarkerClusterGroup` from `react-leaflet-cluster`
- Import `leaflet.markercluster/dist/MarkerCluster.css` and `leaflet.markercluster/dist/MarkerCluster.Default.css`
- Filter listings to only those with `latitude` and `longitude`
- Each listing gets its own `<Marker>` at `[latitude, longitude]`
- Wrap all markers in `<MarkerClusterGroup>` with custom icon creator matching navy/gold theme
- Each marker popup shows: first image (if available), price, room_config, area, link to detail page
- FitBounds adapts to individual marker positions
- If no listings have coordinates, fall back to the existing city-aggregate view (graceful degradation)

```tsx
"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/lib/types";
import {
  ALBANIA_CENTER,
  ALBANIA_DEFAULT_ZOOM,
} from "@/lib/city-coords";

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewProps {
  listings: Listing[];
}

function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count > 50 ? 56 : count > 10 ? 48 : 40;
  const fontSize = count > 50 ? 16 : count > 10 ? 14 : 12;

  return L.divIcon({
    html: `<div style="
      width: ${size}px; height: ${size}px; border-radius: 50%;
      background: #1B2A4A; border: 3px solid #D4A843;
      display: flex; align-items: center; justify-content: center;
      color: #FDF8F0; font-weight: 700; font-size: ${fontSize}px;
      box-shadow: 0 4px 12px rgba(27,42,74,0.4);
    ">${count}</div>`,
    className: "cluster-marker",
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, positions]);
  return null;
}

function ListingPopup({ listing }: { listing: Listing }) {
  const img = listing.images[0];
  const price = listing.price
    ? `€${listing.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`
    : "Pa çmim";
  const suffix = listing.price_period === "monthly" ? "/muaj" : "";
  const details = [listing.room_config, listing.area_sqm ? `${listing.area_sqm} m²` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <a
      href={`/listings/${listing.id}`}
      style={{ display: "block", textDecoration: "none", color: "inherit", width: 220 }}
    >
      {img && (
        <img
          src={img}
          alt=""
          style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: "8px 8px 0 0" }}
        />
      )}
      <div style={{ padding: 10 }}>
        <div style={{ fontWeight: 700, color: "#1B2A4A", fontSize: 16 }}>
          {price}
          <span style={{ fontWeight: 400, color: "#8B8178", fontSize: 12 }}>{suffix}</span>
        </div>
        {details && (
          <div style={{ fontSize: 12, color: "#8B8178", marginTop: 4 }}>{details}</div>
        )}
        {listing.neighborhood && (
          <div style={{ fontSize: 12, color: "#8B8178", marginTop: 2 }}>{listing.neighborhood}</div>
        )}
      </div>
    </a>
  );
}

export default function MapView({ listings }: MapViewProps) {
  const geoListings = listings.filter(
    (l): l is Listing & { latitude: number; longitude: number } =>
      l.latitude != null && l.longitude != null
  );

  const positions: [number, number][] = geoListings.map((l) => [l.latitude, l.longitude]);

  return (
    <MapContainer
      center={ALBANIA_CENTER}
      zoom={ALBANIA_DEFAULT_ZOOM}
      className="h-full w-full rounded-2xl"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={positions} />
      <MarkerClusterGroup iconCreateFunction={createClusterIcon} maxClusterRadius={60}>
        {geoListings.map((listing) => (
          <Marker key={listing.id} position={[listing.latitude, listing.longitude]}>
            <Popup maxWidth={240} minWidth={220}>
              <ListingPopup listing={listing} />
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
```

**Step 3: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add web/package.json web/package-lock.json web/src/components/MapView.tsx
git commit -m "feat: upgrade MapView with individual markers and clustering"
```

---

## Task 8: Add map to listing detail page

**Files:**
- Modify: `web/src/app/listings/[id]/page.tsx:129-137` (Location section)

**Step 1: Add dynamic import for detail map**

At the top of the file (after existing imports), add:

```tsx
import dynamic from "next/dynamic";
const DetailMap = dynamic(() => import("@/components/DetailMap"), { ssr: false });
```

**Step 2: Create DetailMap component**

Create `web/src/components/DetailMap.tsx`:

```tsx
"use client";

import L from "leaflet";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface DetailMapProps {
  latitude: number;
  longitude: number;
}

export default function DetailMap({ latitude, longitude }: DetailMapProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={15}
      className="h-[300px] w-full rounded-2xl"
      scrollWheelZoom={false}
      dragging={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} />
    </MapContainer>
  );
}
```

**Step 3: Add map to Location section**

In `web/src/app/listings/[id]/page.tsx`, replace the Location section (lines 129-137) with:

```tsx
      {/* Location */}
      <div className="mt-6">
        <h2 className="font-display text-lg font-semibold text-navy">Vendndodhja</h2>
        <p className="mt-1 text-warm-gray">
          {[listing.neighborhood, listing.city, listing.address_raw]
            .filter(Boolean)
            .join(", ")}
        </p>
        {listing.latitude != null && listing.longitude != null && (
          <div className="mt-3">
            <DetailMap latitude={listing.latitude} longitude={listing.longitude} />
          </div>
        )}
      </div>
```

**Step 4: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No type errors

**Step 5: Commit**

```bash
git add web/src/components/DetailMap.tsx web/src/app/listings/[id]/page.tsx
git commit -m "feat: add map to listing detail page"
```

---

## Task 9: Create MapPinPicker component for listing form

**Files:**
- Create: `web/src/components/MapPinPicker.tsx`
- Modify: `web/src/components/ListingForm.tsx`

**Step 1: Create MapPinPicker component**

Create `web/src/components/MapPinPicker.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  ALBANIAN_CITY_COORDS,
  ALBANIA_CENTER,
  CITY_ZOOM,
} from "@/lib/city-coords";

// Fix icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapPinPickerProps {
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  onChange: (lat: number, lng: number) => void;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPinPicker({ city, latitude, longitude, onChange }: MapPinPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    latitude != null && longitude != null ? [latitude, longitude] : null
  );

  const cityCoords = city ? ALBANIAN_CITY_COORDS[city] : null;
  const center: [number, number] = position ?? cityCoords ?? ALBANIA_CENTER;
  const zoom = position || cityCoords ? CITY_ZOOM : 7;

  const handleClick = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng]);
      onChange(lat, lng);
    },
    [onChange]
  );

  return (
    <div>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-[250px] w-full rounded-xl border border-warm-gray-light"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={handleClick} />
        {position && (
          <Marker
            position={position}
            draggable={true}
            eventHandlers={{
              dragend(e) {
                const marker = e.target as L.Marker;
                const latlng = marker.getLatLng();
                setPosition([latlng.lat, latlng.lng]);
                onChange(latlng.lat, latlng.lng);
              },
            }}
          />
        )}
      </MapContainer>
      <p className="mt-1 text-xs text-warm-gray">
        {position
          ? "Vendndodhja u caktua. Mund ta tërhiqni pikën për ta ndryshuar."
          : "Klikoni në hartë për të vendosur vendndodhjen."}
      </p>
    </div>
  );
}
```

**Step 2: Integrate into ListingForm**

In `web/src/components/ListingForm.tsx`:

1. Add dynamic import at the top:
```tsx
import dynamic from "next/dynamic";
const MapPinPicker = dynamic(() => import("@/components/MapPinPicker"), { ssr: false });
```

2. Add `latitude` and `longitude` to the `FormData` interface (after `address_raw`):
```typescript
  latitude: number | null;
  longitude: number | null;
```

3. Add to initial state (after `address_raw: ""`):
```typescript
    latitude: null,
    longitude: null,
```

4. Add to the form submission data (in handleSubmit, alongside the other numeric fields):
```typescript
      latitude: formData.latitude,
      longitude: formData.longitude,
```

5. Add the MapPinPicker in the Location fieldset, after the address_raw input:
```tsx
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-navy">
                Vendndodhja në hartë
              </label>
              <div className="mt-1">
                <MapPinPicker
                  city={formData.city}
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onChange={(lat, lng) => setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
                />
              </div>
            </div>
```

**Step 3: Verify build**

Run: `cd web && npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add web/src/components/MapPinPicker.tsx web/src/components/ListingForm.tsx
git commit -m "feat: add map pin picker to listing form"
```

---

## Task 10: Update seed data and verify end-to-end

**Files:**
- Modify: `web/src/lib/db/seed.ts` (verify rowToListing handles lat/lng)
- Verify: Full build and seed fallback path

**Step 1: Verify seed.ts handles new fields**

The `rowToListing()` in `seed.ts` uses `...row` spread — it will automatically include `latitude`/`longitude` if present in seed data. Existing seed data without these fields will have them as `undefined`, which is fine since the Listing interface allows `null`.

Check that `rowToListing` in `seed.ts` doesn't need changes. If the spread handles it cleanly, no change needed. If TypeScript complains, add explicit mapping:

```typescript
    latitude: (row.latitude as number) ?? null,
    longitude: (row.longitude as number) ?? null,
```

**Step 2: Verify full build**

Run: `cd web && npm run build`
Expected: Build succeeds

**Step 3: Verify the app runs**

Run: `cd web && npm run dev` (briefly, then Ctrl+C)
Expected: App starts without errors

**Step 4: Run full scrapy test suite**

Run: `cd scrapy_project && python -m pytest tests/ -v`
Expected: All tests pass

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: ensure seed data handles latitude/longitude fields"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Add lat/lng to ListingItem | items.py |
| 2 | Add lat/lng to SQLite schema | db/schema.sql |
| 3 | Update storage pipelines | pipelines.py |
| 4 | Create GeocodingPipeline + tests | pipelines.py, settings.py, test_geocoding_pipeline.py |
| 5 | Investigate + extract spider coordinates | spiders/*.py |
| 6 | Add lat/lng to frontend types + API | types.ts, queries.ts, validators.ts, route.ts |
| 7 | Install cluster + rewrite MapView | MapView.tsx, package.json |
| 8 | Detail page map | DetailMap.tsx, page.tsx |
| 9 | Map pin picker for form | MapPinPicker.tsx, ListingForm.tsx |
| 10 | Verify seed + end-to-end | seed.ts, full build |
