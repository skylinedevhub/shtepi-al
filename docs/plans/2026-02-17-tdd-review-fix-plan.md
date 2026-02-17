# TDD Review & Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all known bugs (3 failing tests, coordinate overwrite, CITY_COORDS drift) and add missing test coverage (map components), using strict TDD — failing tests first, then fixes.

**Architecture:** Five independent workstreams: (1) duashpi spider test fix, (2) COALESCE guard for PostgreSQL+SQLite upserts, (3) shared city_coords module, (4) parallel scrape workflow, (5) map component smoke tests with Vitest.

**Tech Stack:** Python/pytest (scrapy tests), Vitest (web tests), GitHub Actions YAML, PostgreSQL/SQLite SQL

---

### Task 1: Fix Duashpi Spider Test — Write Corrected Tests

**Files:**
- Modify: `scrapy_project/tests/test_spider_duashpi.py:422-435`

**Step 1: Update TestStartUrls to check START_URLS**

Replace the existing `TestStartUrls` class (lines 422-435) with:

```python
class TestStartUrls:
    """Test that START_URLS are configured correctly."""

    def test_contains_sale_url(self):
        spider = DuashpiSpider()
        assert "https://duashpi.al/shtepi-ne-shitje" in spider.START_URLS

    def test_contains_rent_url(self):
        spider = DuashpiSpider()
        assert "https://duashpi.al/shtepi-me-qera" in spider.START_URLS

    def test_start_urls_count(self):
        spider = DuashpiSpider()
        assert len(spider.START_URLS) == 2
```

**Step 2: Run tests to verify they pass**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_spider_duashpi.py::TestStartUrls -v`
Expected: 3 PASSED

---

### Task 2: Add start_requests() Impersonation Test

**Files:**
- Modify: `scrapy_project/tests/test_spider_duashpi.py` (add after TestStartUrls)

**Step 1: Write the test**

Add this class after `TestStartUrls`:

```python
class TestStartRequests:
    """Test that start_requests() produces correct requests."""

    def test_yields_requests_for_all_start_urls(self):
        spider = DuashpiSpider()
        requests = list(spider.start_requests())
        assert len(requests) == 2

    def test_requests_have_impersonate_meta(self):
        spider = DuashpiSpider()
        requests = list(spider.start_requests())
        for req in requests:
            assert req.meta.get("impersonate") == "chrome"

    def test_request_urls_match_start_urls(self):
        spider = DuashpiSpider()
        requests = list(spider.start_requests())
        urls = [r.url for r in requests]
        assert "https://duashpi.al/shtepi-ne-shitje" in urls
        assert "https://duashpi.al/shtepi-me-qera" in urls
```

**Step 2: Run tests to verify they pass**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_spider_duashpi.py::TestStartRequests -v`
Expected: 3 PASSED

**Step 3: Run full spider test suite**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_spider_duashpi.py -v`
Expected: ALL PASSED (was 3 failing, now 0)

**Step 4: Run full test suite**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest --tb=short -q`
Expected: 366 passed (363 original - 3 old broken + 3 fixed + 3 new)

**Step 5: Commit**

```bash
git add scrapy_project/tests/test_spider_duashpi.py
git commit -m "fix(tests): correct duashpi TestStartUrls to check START_URLS and add start_requests tests"
```

---

### Task 3: Create Shared city_coords Module

**Files:**
- Create: `scrapy_project/shtepi/city_coords.py`
- Test: `scrapy_project/tests/test_city_coords.py`

**Step 1: Write the failing test first**

Create `scrapy_project/tests/test_city_coords.py`:

```python
"""Tests for the shared CITY_COORDS module."""

from shtepi.city_coords import CITY_COORDS

EXPECTED_CITIES = [
    "Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër",
    "Korçë", "Elbasan", "Fier", "Berat", "Lushnjë",
    "Kamëz", "Pogradec", "Kavajë", "Lezhë", "Gjirokastër",
    "Vorë", "Golem", "Himarë", "Ksamil", "Dhërmi",
    "Përmet", "Prishtinë",
]


class TestCityCoords:
    """Verify CITY_COORDS is complete and well-formed."""

    def test_contains_all_22_cities(self):
        for city in EXPECTED_CITIES:
            assert city in CITY_COORDS, f"Missing city: {city}"

    def test_count_is_22(self):
        assert len(CITY_COORDS) == 22

    def test_coordinates_are_tuples_of_floats(self):
        for city, coords in CITY_COORDS.items():
            assert isinstance(coords, tuple), f"{city}: not a tuple"
            assert len(coords) == 2, f"{city}: not a 2-tuple"
            lat, lng = coords
            assert isinstance(lat, float), f"{city}: lat not float"
            assert isinstance(lng, float), f"{city}: lng not float"

    def test_coordinates_are_in_albania_region(self):
        """All cities should be roughly in Albania/Kosovo region."""
        for city, (lat, lng) in CITY_COORDS.items():
            assert 39.0 <= lat <= 43.0, f"{city}: latitude {lat} out of range"
            assert 19.0 <= lng <= 22.0, f"{city}: longitude {lng} out of range"
```

**Step 2: Run test to verify it fails**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_city_coords.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'shtepi.city_coords'`

**Step 3: Create the shared module**

Create `scrapy_project/shtepi/city_coords.py`:

```python
"""Canonical Albanian city center coordinates.

Single source of truth used by GeocodingPipeline, backfill_geocode.py,
and frontend city-coords.ts. 22 cities covering all known listing locations.
"""

CITY_COORDS: dict[str, tuple[float, float]] = {
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
```

**Step 4: Run test to verify it passes**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_city_coords.py -v`
Expected: 4 PASSED

**Step 5: Commit**

```bash
git add scrapy_project/shtepi/city_coords.py scrapy_project/tests/test_city_coords.py
git commit -m "feat: add shared city_coords module with 22 cities and tests"
```

---

### Task 4: Wire Shared CITY_COORDS Into Pipeline

**Files:**
- Modify: `scrapy_project/shtepi/pipelines.py:94-110` (replace inline CITY_COORDS)
- Test: `scrapy_project/tests/test_city_coords.py` (add import validation test)

**Step 1: Write failing test — pipeline imports from shared module**

Add to `scrapy_project/tests/test_city_coords.py`:

```python
class TestPipelineUsesSharedCoords:
    """Verify the pipeline uses the shared CITY_COORDS, not its own copy."""

    def test_pipeline_city_coords_is_shared(self):
        from shtepi.pipelines import CITY_COORDS as pipeline_coords
        from shtepi.city_coords import CITY_COORDS as shared_coords
        assert pipeline_coords is shared_coords
```

**Step 2: Run test to verify it fails**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_city_coords.py::TestPipelineUsesSharedCoords -v`
Expected: FAIL (pipeline has its own inline dict, not imported)

**Step 3: Update pipelines.py to import from shared module**

In `scrapy_project/shtepi/pipelines.py`:
1. Add import at top: `from shtepi.city_coords import CITY_COORDS`
2. Delete the inline `CITY_COORDS = { ... }` dict (lines 94-110)

**Step 4: Run test to verify it passes**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_city_coords.py -v`
Expected: 5 PASSED

**Step 5: Run all geocoding tests to verify no regressions**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_geocoding_pipeline.py tests/test_city_coords.py -v`
Expected: ALL PASSED

**Step 6: Commit**

```bash
git add scrapy_project/shtepi/pipelines.py scrapy_project/tests/test_city_coords.py
git commit -m "refactor: pipeline imports CITY_COORDS from shared module"
```

---

### Task 5: Wire Shared CITY_COORDS Into Backfill Script

**Files:**
- Modify: `scripts/backfill_geocode.py:42-65` (replace inline CITY_COORDS)
- Modify: `scrapy_project/tests/test_city_coords.py` (add backfill import validation)

**Step 1: Write failing test**

Add to `scrapy_project/tests/test_city_coords.py`:

```python
class TestBackfillUsesSharedCoords:
    """Verify the backfill script uses the shared CITY_COORDS."""

    def test_backfill_city_coords_is_shared(self):
        import importlib
        import sys
        # The backfill script has module-level psycopg2 side effects,
        # so we test by checking if city_coords module is referenced
        from shtepi.city_coords import CITY_COORDS as shared_coords
        # Read the backfill script and verify it imports from city_coords
        with open("../scripts/backfill_geocode.py") as f:
            content = f.read()
        assert "from shtepi.city_coords import CITY_COORDS" in content or \
               "from scrapy_project.shtepi.city_coords import CITY_COORDS" in content or \
               "sys.path" in content  # script adds to path and imports
```

**Step 2: Run test to verify it fails**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_city_coords.py::TestBackfillUsesSharedCoords -v`
Expected: FAIL (backfill has its own inline dict)

**Step 3: Update backfill script**

In `scripts/backfill_geocode.py`:
1. Add near the top (after existing imports):
```python
# Add scrapy_project to path so we can import the shared city_coords module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scrapy_project"))
from shtepi.city_coords import CITY_COORDS
```
2. Delete the inline `CITY_COORDS = { ... }` dict (lines 42-65)

**Step 4: Run test to verify it passes**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_city_coords.py -v`
Expected: 6 PASSED

**Step 5: Commit**

```bash
git add scripts/backfill_geocode.py scrapy_project/tests/test_city_coords.py
git commit -m "refactor: backfill script imports CITY_COORDS from shared module"
```

---

### Task 6: COALESCE Guard — Write Failing Test for PostgreSQL

**Files:**
- Create: `scrapy_project/tests/test_postgresql_upsert.py`

**Step 1: Write the failing test**

Create `scrapy_project/tests/test_postgresql_upsert.py`:

```python
"""Tests for PostgreSQLPipeline COALESCE guard on coordinate upsert.

These tests verify the SQL template contains COALESCE guards to prevent
NULL coordinates from overwriting existing good coordinates.
We test the SQL string directly rather than hitting a real database.
"""

import re

from shtepi.pipelines import PostgreSQLPipeline


class TestCoalesceGuard:
    """Verify the upsert SQL uses COALESCE for latitude/longitude."""

    def _get_upsert_sql(self):
        """Extract the SQL string from _flush method source."""
        import inspect
        source = inspect.getsource(PostgreSQLPipeline._flush)
        return source

    def test_latitude_uses_coalesce(self):
        """ON CONFLICT UPDATE should use COALESCE for latitude."""
        source = self._get_upsert_sql()
        # Should contain COALESCE(EXCLUDED.latitude, listings.latitude)
        # in the DO UPDATE SET section
        assert "COALESCE(EXCLUDED.latitude, listings.latitude)" in source, \
            "latitude upsert should use COALESCE to prevent NULL overwrite"

    def test_longitude_uses_coalesce(self):
        """ON CONFLICT UPDATE should use COALESCE for longitude."""
        source = self._get_upsert_sql()
        assert "COALESCE(EXCLUDED.longitude, listings.longitude)" in source, \
            "longitude upsert should use COALESCE to prevent NULL overwrite"

    def test_latitude_not_bare_excluded(self):
        """ON CONFLICT UPDATE should NOT have bare `latitude = EXCLUDED.latitude`."""
        source = self._get_upsert_sql()
        # Find the DO UPDATE SET section
        update_section = source[source.index("DO UPDATE SET"):]
        # Should not have bare assignment (without COALESCE)
        bare_pattern = r"latitude\s*=\s*EXCLUDED\.latitude\b"
        matches = re.findall(bare_pattern, update_section)
        # Filter out lines that contain COALESCE (those are fine)
        for match_text in matches:
            # Check the full line for COALESCE
            for line in update_section.split("\n"):
                if "latitude = EXCLUDED.latitude" in line and "COALESCE" not in line:
                    assert False, f"Found bare latitude = EXCLUDED.latitude without COALESCE: {line.strip()}"
```

**Step 2: Run test to verify it fails**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_postgresql_upsert.py -v`
Expected: FAIL — current code has `latitude = EXCLUDED.latitude` without COALESCE

---

### Task 7: COALESCE Guard — Fix PostgreSQL Upsert

**Files:**
- Modify: `scrapy_project/shtepi/pipelines.py:538-539`

**Step 1: Apply the COALESCE fix**

In `scrapy_project/shtepi/pipelines.py`, inside the `_flush()` method's `DO UPDATE SET` clause, replace:

```sql
                        latitude = EXCLUDED.latitude,
                        longitude = EXCLUDED.longitude,
```

with:

```sql
                        latitude = COALESCE(EXCLUDED.latitude, listings.latitude),
                        longitude = COALESCE(EXCLUDED.longitude, listings.longitude),
```

**Step 2: Run test to verify it passes**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_postgresql_upsert.py -v`
Expected: 3 PASSED

**Step 3: Run all pipeline tests**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_postgresql_upsert.py tests/test_geocoding_pipeline.py -v`
Expected: ALL PASSED

**Step 4: Commit**

```bash
git add scrapy_project/shtepi/pipelines.py scrapy_project/tests/test_postgresql_upsert.py
git commit -m "fix: COALESCE guard prevents NULL coordinates from overwriting existing values"
```

---

### Task 8: COALESCE Guard — SQLite Pipeline Too

**Files:**
- Modify: `scrapy_project/shtepi/pipelines.py:261-262` (SQLite UPDATE)
- Modify: `scrapy_project/tests/test_postgresql_upsert.py` (add SQLite test)

**Step 1: Write failing test for SQLite**

Add to `scrapy_project/tests/test_postgresql_upsert.py` (rename file later if desired):

```python
from shtepi.pipelines import SQLitePipeline


class TestSQLiteCoalesceGuard:
    """Verify SQLite UPDATE uses COALESCE for latitude/longitude."""

    def _get_update_sql(self):
        import inspect
        return inspect.getsource(SQLitePipeline.process_item)

    def test_latitude_uses_coalesce(self):
        source = self._get_update_sql()
        assert "COALESCE" in source and "latitude" in source, \
            "SQLite UPDATE should use COALESCE for latitude"

    def test_longitude_uses_coalesce(self):
        source = self._get_update_sql()
        assert "COALESCE" in source and "longitude" in source, \
            "SQLite UPDATE should use COALESCE for longitude"
```

**Step 2: Run test to verify it fails**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_postgresql_upsert.py::TestSQLiteCoalesceGuard -v`
Expected: FAIL

**Step 3: Fix SQLite UPDATE in pipelines.py**

In the SQLite `process_item` method, change the UPDATE SQL. Replace:

```sql
                    latitude = ?, longitude = ?,
```

with:

```sql
                    latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude),
```

Note: The `?` parameters stay the same — SQLite's `COALESCE(?, existing_column)` will use the new value if non-NULL, else keep the existing value.

**Step 4: Run test to verify it passes**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest tests/test_postgresql_upsert.py -v`
Expected: ALL PASSED (5 tests: 3 PostgreSQL + 2 SQLite)

**Step 5: Run full test suite**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest --tb=short -q`
Expected: ALL PASSED

**Step 6: Commit**

```bash
git add scrapy_project/shtepi/pipelines.py scrapy_project/tests/test_postgresql_upsert.py
git commit -m "fix: COALESCE guard for SQLite pipeline coordinates too"
```

---

### Task 9: Parallelize Daily Scrape Workflow

**Files:**
- Modify: `.github/workflows/scrape.yml`

**Step 1: Rewrite scrape.yml with matrix strategy**

Replace the entire file content with:

```yaml
name: Daily Scrape

on:
  schedule:
    # Every day at 03:00 UTC
    - cron: "0 3 * * *"
  workflow_dispatch: # Allow manual trigger from GitHub UI

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        spider: [merrjep, mirlir, celesi, duashpi, njoftime]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
          cache-dependency-path: scrapy_project/requirements.txt

      - name: Install dependencies
        run: pip install -r scrapy_project/requirements.txt

      - name: "Crawl: ${{ matrix.spider }}"
        working-directory: scrapy_project
        env:
          DATABASE_URL: ${{ secrets.SCRAPER_DATABASE_URL }}
        run: |
          echo "Starting ${{ matrix.spider }} at $(date -u +%H:%M:%S)"

          python -m scrapy crawl "${{ matrix.spider }}" \
            -s HTTPCACHE_ENABLED=False \
            -s LOG_LEVEL=INFO 2>&1 | tee "/tmp/${{ matrix.spider }}.log"

          count=$(grep -oP "'item_scraped_count': \K\d+" "/tmp/${{ matrix.spider }}.log" || echo "0")
          reason=$(grep -oP "'finish_reason': '\K[^']+" "/tmp/${{ matrix.spider }}.log" || echo "unknown")

          echo "Result: $count items ($reason)"

          if [ "$reason" != "finished" ] && [ "$reason" != "closespider_itemcount" ]; then
            echo "::warning::Spider ${{ matrix.spider }} finished with: $reason"
          fi
```

**Step 2: Validate YAML syntax**

Run: `python -c "import yaml; yaml.safe_load(open('.github/workflows/scrape.yml'))" && echo "YAML valid"`
Expected: "YAML valid"

**Step 3: Commit**

```bash
git add .github/workflows/scrape.yml
git commit -m "feat: parallelize daily scrape — one job per spider with 15min timeout"
```

---

### Task 10: Install Vitest DOM Dependencies for Map Tests

**Files:**
- Modify: `web/package.json` (add dev deps)
- Modify: `web/vitest.config.ts` (add jsdom environment config)

**Step 1: Install testing dependencies**

Run:
```bash
cd /home/yb97/src/projects/shtepi-al/web && npm install --save-dev @testing-library/react @testing-library/jest-dom jsdom
```

**Step 2: Update vitest.config.ts to support jsdom**

Replace `web/vitest.config.ts` with:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    environmentMatchGlobs: [
      // Use jsdom for component tests
      ["src/components/**/*.test.{ts,tsx}", "jsdom"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

**Step 3: Commit**

```bash
git add web/package.json web/package-lock.json web/vitest.config.ts
git commit -m "chore: add @testing-library/react and jsdom for component tests"
```

---

### Task 11: Map Component Smoke Tests — MapView

**Files:**
- Create: `web/src/components/__tests__/MapView.test.tsx`

**Step 1: Write the test with Leaflet mocks**

Create `web/src/components/__tests__/MapView.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";

// Mock leaflet and react-leaflet before importing the component
vi.mock("leaflet", () => {
  const divIcon = vi.fn(() => ({}));
  const point = vi.fn((x: number, y: number) => ({ x, y }));
  const latLngBounds = vi.fn(() => ({
    extend: vi.fn(),
    isValid: () => true,
  }));
  return {
    default: {
      Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
      divIcon,
      point,
      latLngBounds,
    },
    divIcon,
    point,
    latLngBounds,
  };
});

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: React.ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children?: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
}));

vi.mock("react-leaflet-cluster", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="cluster-group">{children}</div>,
}));

vi.mock("@/lib/city-coords", () => ({
  ALBANIA_CENTER: [41.15, 20.17] as [number, number],
  ALBANIA_DEFAULT_ZOOM: 7,
}));

vi.mock("@/lib/seo/slugs", () => ({
  buildListingPath: (title: string, city: string, id: string) => `/listings/${city}/${id}`,
}));

import { render, screen } from "@testing-library/react";
import MapView from "../MapView";
import type { Listing } from "@/lib/types";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "test-1",
    title: "Test Apartment",
    description: null,
    price: 100000,
    price_all: null,
    currency_original: "EUR",
    price_period: "total",
    transaction_type: "sale",
    property_type: "apartment",
    room_config: "2+1",
    area_sqm: 80,
    area_net_sqm: null,
    floor: 3,
    total_floors: 8,
    rooms: 2,
    bathrooms: 1,
    city: "Tiranë",
    neighborhood: "Blloku",
    address_raw: null,
    latitude: 41.32,
    longitude: 19.82,
    images: ["https://example.com/img.jpg"],
    image_count: 1,
    source: "test",
    source_url: "https://test.al/1",
    source_id: "1",
    poster_name: null,
    poster_phone: null,
    poster_type: null,
    is_active: true,
    origin: "scraped",
    status: "active",
    first_seen: "2026-01-01",
    last_seen: "2026-01-01",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    has_elevator: null,
    has_parking: null,
    is_furnished: null,
    is_new_build: null,
    user_id: null,
    ...overrides,
  };
}

describe("MapView", () => {
  it("renders the map container", () => {
    render(<MapView listings={[]} />);
    expect(screen.getByTestId("map-container")).toBeDefined();
  });

  it("renders markers only for listings with coordinates", () => {
    const listings = [
      makeListing({ id: "1", latitude: 41.32, longitude: 19.82 }),
      makeListing({ id: "2", latitude: null, longitude: null }),
      makeListing({ id: "3", latitude: 41.33, longitude: 19.83 }),
    ];
    render(<MapView listings={listings} />);
    const markers = screen.getAllByTestId("marker");
    expect(markers).toHaveLength(2);
  });

  it("renders zero markers for empty listings", () => {
    render(<MapView listings={[]} />);
    expect(screen.queryAllByTestId("marker")).toHaveLength(0);
  });

  it("renders zero markers when all listings lack coordinates", () => {
    const listings = [
      makeListing({ id: "1", latitude: null, longitude: null }),
      makeListing({ id: "2", latitude: null, longitude: null }),
    ];
    render(<MapView listings={listings} />);
    expect(screen.queryAllByTestId("marker")).toHaveLength(0);
  });
});
```

**Step 2: Run test**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx vitest run src/components/__tests__/MapView.test.tsx`
Expected: 4 PASSED. If any fail, fix the mocks or component to make them pass.

**Step 3: Commit**

```bash
git add web/src/components/__tests__/MapView.test.tsx
git commit -m "test: add MapView smoke tests — renders markers, filters null coords"
```

---

### Task 12: Map Component Smoke Tests — DetailMap

**Files:**
- Create: `web/src/components/__tests__/DetailMap.test.tsx`

**Step 1: Write the test**

Create `web/src/components/__tests__/DetailMap.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";

vi.mock("leaflet", () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="detail-map">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
}));

import { render, screen } from "@testing-library/react";
import DetailMap from "../DetailMap";

describe("DetailMap", () => {
  it("renders map with marker at given coordinates", () => {
    render(<DetailMap latitude={41.3275} longitude={19.8187} />);
    expect(screen.getByTestId("detail-map")).toBeDefined();
    expect(screen.getByTestId("marker")).toBeDefined();
  });

  it("renders exactly one marker", () => {
    render(<DetailMap latitude={41.3275} longitude={19.8187} />);
    expect(screen.getAllByTestId("marker")).toHaveLength(1);
  });
});
```

**Step 2: Run test**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx vitest run src/components/__tests__/DetailMap.test.tsx`
Expected: 2 PASSED

**Step 3: Commit**

```bash
git add web/src/components/__tests__/DetailMap.test.tsx
git commit -m "test: add DetailMap smoke tests"
```

---

### Task 13: Map Component Smoke Tests — MapPinPicker

**Files:**
- Create: `web/src/components/__tests__/MapPinPicker.test.tsx`

**Step 1: Write the test**

Create `web/src/components/__tests__/MapPinPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";

vi.mock("leaflet", () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="pin-picker-map">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  useMapEvents: () => null,
}));

vi.mock("@/lib/city-coords", () => ({
  ALBANIAN_CITY_COORDS: { "Tiranë": [41.3275, 19.8187] as [number, number] },
  ALBANIA_CENTER: [41.15, 20.17] as [number, number],
  CITY_ZOOM: 13,
}));

import { render, screen } from "@testing-library/react";
import MapPinPicker from "../MapPinPicker";

describe("MapPinPicker", () => {
  it("renders map without marker when no initial position", () => {
    const onChange = vi.fn();
    render(<MapPinPicker onChange={onChange} />);
    expect(screen.getByTestId("pin-picker-map")).toBeDefined();
    expect(screen.queryByTestId("marker")).toBeNull();
  });

  it("renders marker when initial coordinates are provided", () => {
    const onChange = vi.fn();
    render(<MapPinPicker latitude={41.32} longitude={19.82} onChange={onChange} />);
    expect(screen.getByTestId("marker")).toBeDefined();
  });

  it("shows Albanian instruction text", () => {
    const onChange = vi.fn();
    render(<MapPinPicker onChange={onChange} />);
    expect(screen.getByText(/Klikoni në hartë/)).toBeDefined();
  });
});
```

**Step 2: Run test**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx vitest run src/components/__tests__/MapPinPicker.test.tsx`
Expected: 3 PASSED

**Step 3: Commit**

```bash
git add web/src/components/__tests__/MapPinPicker.test.tsx
git commit -m "test: add MapPinPicker smoke tests"
```

---

### Task 14: Final Full Test Suite Verification

**Files:** None (verification only)

**Step 1: Run Python full test suite**

Run: `cd /home/yb97/src/projects/shtepi-al/scrapy_project && python -m pytest --tb=short -q`
Expected: ALL PASSED (was 363, now ~375+ with new tests)

**Step 2: Run Web full test suite**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx vitest run`
Expected: ALL PASSED (SEO tests + 9 new map component tests)

**Step 3: Verify web build**

Run: `cd /home/yb97/src/projects/shtepi-al/web && npx next build 2>&1 | tail -20`
Expected: Build succeeds, no errors

**Step 4: Final commit (if any stragglers)**

Only commit if there are unstaged changes from minor fixups during verification.

---

## Summary of Changes

| Task | What | Type |
|------|------|------|
| 1-2 | Fix duashpi TestStartUrls + add start_requests tests | Test fix |
| 3-5 | Shared city_coords module (22 cities), wired into pipeline + backfill | Refactor |
| 6-8 | COALESCE guard on PostgreSQL + SQLite upserts | Bug fix |
| 9 | Parallel daily scrape workflow | CI/CD |
| 10-13 | Map component smoke tests (MapView, DetailMap, MapPinPicker) | New tests |
| 14 | Full suite verification | Verification |
