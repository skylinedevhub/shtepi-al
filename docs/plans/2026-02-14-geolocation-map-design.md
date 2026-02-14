# Geolocation & Map View Design

**Date:** 2026-02-14
**Branch:** `feature/geolocation-map`
**Status:** Approved

## Goal

Add real coordinates to listings and show them as individual markers on the map. Three coordinate sources (in priority order): spider-scraped, Nominatim geocoded, city-level fallback.

## Scope

### In Scope
- Add `latitude`/`longitude` fields to Scrapy `ListingItem`
- Extract coordinates from source listing pages (embedded maps, data attributes, JS variables)
- New `GeocodingPipeline` stage: Nominatim geocoding for listings with street/neighborhood but no coordinates
- City-level fallback using existing `city-coords.ts` data
- Upgrade `MapView` to show individual listing markers (replacing city aggregates)
- Marker clustering via `react-leaflet-cluster`
- Detail page map showing property location
- Listing form click-on-map pin picker for user-created listings

### Out of Scope
- Distance-based search / "listings near me"
- PostGIS / spatial indexes
- Reverse geocoding (coordinates → address)
- Address autocomplete

## Data Layer

### Scrapy Item
Add to `ListingItem` in `items.py`:
```python
latitude = scrapy.Field()
longitude = scrapy.Field()
```

### Database
No migration needed — `latitude` and `longitude` columns already exist in the listings table (schema.ts lines 69-70).

### Frontend Types
Add `latitude` and `longitude` (both `number | null`) to the `Listing` interface in `types.ts`.

## Spider Coordinate Extraction

Each spider should be investigated for available geo data on source pages:
- Embedded Google Maps iframes with lat/lng in URL
- `data-lat`/`data-lng` HTML attributes
- JavaScript variables containing coordinates
- Structured data (JSON-LD, microdata)

Spiders set `latitude`/`longitude` on the item when available. When not available, leave them as `None` for the geocoding pipeline to handle.

## GeocodingPipeline

New pipeline stage in `pipelines.py`, runs after `NormalizationPipeline` but before storage pipelines.

Logic:
1. If item already has `latitude` and `longitude` → skip
2. If item has `address_raw` or `neighborhood` + `city` → geocode via Nominatim (`{address}, {city}, Albania`)
3. If geocoding fails or no address data → fall back to city-coords lookup
4. Rate-limited to 1 request/second (Nominatim usage policy)
5. Cache results to avoid re-geocoding identical addresses

Nominatim endpoint: `https://nominatim.openstreetmap.org/search`
Parameters: `q={address}, Albania`, `format=json`, `limit=1`
User-Agent: `ShtëpiAL/1.0 (real estate aggregator)`

## Frontend Changes

### MapView (Browse Page)
- Replace city-aggregate markers with individual listing markers
- Wrap markers in `<MarkerClusterGroup>` (from `react-leaflet-cluster`)
- Each marker popup shows: listing image, price, room config, link to detail page
- Listings without coordinates are not shown on the map
- Cluster styling matches existing navy/gold theme

### Detail Page Map
- Show a ~300px tall Leaflet map on the listing detail page when lat/lng are available
- Single marker at the property location
- Centered and zoomed to ~15

### Listing Form Pin Picker
- Add a Leaflet map to the listing creation/edit form
- Initially centered on the selected city (or Albania center)
- Click to drop a pin, pin is draggable
- Stores lat/lng in form state
- Optional — users can submit without setting a location
- Shows "Vendndodhja u caktua" (Location set) confirmation

## Dependencies

### New npm packages
- `react-leaflet-cluster` — MarkerClusterGroup for react-leaflet

### Existing (already installed)
- `leaflet` v1.9.4
- `react-leaflet` v4.2.1
- `@types/leaflet` v1.9.21

### Python (already available)
- `requests` (for Nominatim HTTP calls in GeocodingPipeline)

## Pipeline Order

```
ValidationPipeline → NormalizationPipeline → GeocodingPipeline → DedupPipeline → StoragePipeline
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `scrapy_project/shtepi/items.py` | Modify | Add latitude/longitude fields |
| `scrapy_project/shtepi/pipelines.py` | Modify | Add GeocodingPipeline |
| `scrapy_project/shtepi/settings.py` | Modify | Add GeocodingPipeline to ITEM_PIPELINES |
| `scrapy_project/shtepi/spiders/*.py` | Modify | Extract coordinates where available |
| `web/src/lib/types.ts` | Modify | Add lat/lng to Listing interface |
| `web/src/lib/db/queries.ts` | Modify | Include lat/lng in query results |
| `web/src/components/MapView.tsx` | Modify | Individual markers + clustering |
| `web/src/app/listings/[id]/page.tsx` | Modify | Add detail page map |
| `web/src/components/ListingForm.tsx` | Modify | Add map pin picker |
| `web/src/components/MapPinPicker.tsx` | Create | Reusable map pin picker component |
