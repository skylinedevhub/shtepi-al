# Property Valuation Tool — Design Spec

**Date:** 2026-04-13
**Status:** Approved
**Source:** Ported from [fagalliu/pashalegalservices](https://github.com/fagalliu/pashalegalservices) calculator

## Overview

Integrate the Albanian property valuation calculator (based on government cadastral data and the DevInfProna reference pricing system) into ShtëpiAL as a user-facing tool at `/vleresimi`. Design the valuation engine as a pure TypeScript module so it can be reused for Phase 2 internal automated market analysis.

### Two Phases

1. **Phase 1 (this spec):** User-facing calculator. Users enter property details (cadastral zone, area, type, build year) and get government-reference-based market value + reference value in ALL (Albanian Lek).
2. **Phase 2 (future):** Internal admin tool. Batch-run the valuation engine against scraped listings to compare government reference values vs. actual market prices. Admin-only dashboard.

## Architecture

### New Database Tables

All tables use Drizzle ORM, defined in `web/src/lib/db/schema.ts`.

#### 1. `cadastral_zones` — Zone reference data

| Column | Type | Notes |
|--------|------|-------|
| `zk_numer` | integer, PK | Zone number (from DevInfProna) |
| `zk_emer` | text | Zone name |
| `display_label` | text | Human-readable label for dropdown |
| `building_price_zone_id` | integer, nullable | Pre-computed FK — which building price zone contains this zone's centroid |

#### 2. `building_price_zones` — Price zones for buildings (Lek/m²)

| Column | Type | Notes |
|--------|------|-------|
| `id` | serial, PK | Auto-increment |
| `price_banimi` | integer, nullable | Residential (Lek/m²) |
| `price_tregtimi` | integer, nullable | Commercial (Lek/m²) |
| `price_industriale` | integer, nullable | Industrial (Lek/m²) |
| `price_bujqesore_blegtorale` | integer, nullable | Agricultural buildings (Lek/m²) |

Prices extracted from HTML `pershkrim` field at import time (no runtime HTML parsing).

#### 3. `land_prices` — Land prices per zone (Lek/m²)

| Column | Type | Notes |
|--------|------|-------|
| `zk_numer` | integer, PK | FK to cadastral_zones |
| `truall` | real, nullable | Uncultivated land |
| `kullote` | real, nullable | Pasture |
| `bujqesore` | real, nullable | Agricultural |
| `pyll` | real, nullable | Forest |

#### 4. `property_valuations` — Saved calculation results

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | |
| `zk_numer` | integer | Zone used |
| `property_no` | text, nullable | Optional property number |
| `area_sqm` | real | Input area |
| `build_year` | integer | Input year |
| `property_type` | text | Valuation property type key |
| `market_value_all` | real | Calculated market value (ALL) |
| `reference_value_all` | real | Reference value (ALL) |
| `breakdown` | JSONB | Full coefficient details |
| `listing_id` | UUID, nullable | FK to listings — Phase 2 link |
| `created_at` | timestamp | |

### Valuation Engine

**Location:** `web/src/lib/valuation/engine.ts`

Pure function — no DB access, no side effects. Caller provides base price from DB lookup.

```typescript
// Types
type BuildingType = 'ndertese_banimi' | 'ndertese_tregtimi_sherbimi' | 'ndertese_industriale' | 'ndertese_bujqesore_blegtorale';
type LandType = 'truall' | 'kullote' | 'bujqesore' | 'pyll';
type ValuationPropertyType = BuildingType | LandType;

interface ValuationInput {
  basePriceLekPerSqm: number;  // Looked up by caller
  areaSqm: number;
  buildYear: number;
  propertyType: ValuationPropertyType;
  zkNumer: number;             // For position coefficient
}

interface ValuationBreakdown {
  base_price: number;
  type_coef: number;
  position_coef: number;
  depreciation_coef: number;
  price_m2_adjusted: number;
}

interface ValuationResult {
  market_value: number;        // ALL
  reference_value: number;     // ALL
  suggestion: string | null;   // Albanian text
  breakdown: ValuationBreakdown;
}

function calculateValuation(input: ValuationInput): ValuationResult;
```

**Formula** (identical to Pasha source):
```
price_m2_adjusted = base_price * type_coef * position_coef * depreciation_coef
market_value = area * price_m2_adjusted
reference_value = area * base_price * 0.85
```

**Coefficients:**
- `type_coef`: Fixed per property type (0.60 – 1.05), from `VALUATION_PROPERTY_TYPES` constant
- `position_coef`: Knuth hash of zone number, mapped to [0.85, 1.15]
- `depreciation_coef`: Age-based step function (buildings only): <=5yr: 0.98, <=10: 0.95, <=20: 0.90, <=30: 0.85, <=40: 0.82, >40: 0.80

**Suggestion logic:**
If `|market_value - reference_value| / reference_value >= 0.15`:
- market > reference: "Kjo prone mund te kerkoje rivleresim prane ASHK..."
- market < reference: "Per dokumentacion ligjor mund te perdoret vlera e references..."

### Property Type Mapping (Phase 2)

ShtëpiAL listing types → valuation types:

| ShtëpiAL `property_type` | Valuation `property_type` |
|--------------------------|---------------------------|
| apartment | ndertese_banimi |
| house | ndertese_banimi |
| villa | ndertese_banimi |
| studio | ndertese_banimi |
| commercial | ndertese_tregtimi_sherbimi |
| garage | ndertese_industriale |
| land | truall |

### API Endpoints

#### `GET /api/valuation/zones`
Returns cadastral zone list for form dropdown. Cached 24h (revalidate).
No auth required. Rate limited: 30 req/min.

Response: `{ zones: Array<{ zk_numer: number; display_label: string }> }`

#### `POST /api/valuation/calculate`
Calculates valuation, saves to `property_valuations` table.
No auth required (public tool). CSRF validated. Rate limited: 20 req/hr.

Request body:
```json
{
  "zk_numer": 1001,
  "property_no": "123/45",
  "area_sqm": 150,
  "build_year": 2010,
  "property_type": "ndertese_banimi"
}
```

Response:
```json
{
  "market_value": 10260000,
  "reference_value": 10200000,
  "suggestion": null,
  "breakdown": { ... }
}
```

### Frontend

#### Route: `/vleresimi` (Albanian: "valuation")
- `web/src/app/vleresimi/page.tsx` — Server component with metadata
- `web/src/app/vleresimi/ValuationCalculator.tsx` — Client component
- `web/src/app/vleresimi/error.tsx` — Error boundary (Albanian)

#### UI Layout
Two-column responsive layout (matches Pasha's calculator.html pattern):
- **Left:** Input form — zone selector (searchable dropdown), area, build year, property type, submit
- **Right:** Results — market value (large, prominent), reference value, suggestion (if applicable), breakdown accordion
- Mobile: stacks to single column

#### Navigation
Add "Vleresimi" link after "Agjensitë" in both:
- `DesktopNav.tsx` — NavLink to `/vleresimi`
- `MobileMenu.tsx` — NavLink to `/vleresimi`

#### Design
- Brand palette (navy, cream, terracotta, gold, warm-gray)
- All text Albanian
- MVP disclaimer footer (matching Pasha's approach)
- Responsive, accessible (labels, ARIA)

### Data Import Script

**Location:** `scripts/import_cadastral_data.py`

Reads Pasha's 3 JSON data files, pre-processes, and inserts into Supabase:

1. Parse `zonat_kadastrale_attributes_list.json` → `cadastral_zones` rows
2. Parse `vlera_e_ndertesave_attributes_list.json`:
   - Extract building price zone polygons
   - Parse HTML `pershkrim` fields → clean numeric prices per property type
   - Insert into `building_price_zones`
3. For each cadastral zone, compute centroid and find containing building price zone (Shapely)
   - Update `cadastral_zones.building_price_zone_id`
4. Parse `vlera_e_tokes_attributes_list.json` → `land_prices` rows

**Dependencies:** shapely, beautifulsoup4, psycopg2 (already in Pasha's requirements)

### Seed/Fallback Strategy

Consistent with ShtëpiAL patterns: if `getDb()` returns null (no DATABASE_URL), valuation endpoints return a hardcoded sample result for development. The UI still renders.

### Testing Strategy

- **Unit tests (Vitest):** Valuation engine pure function — coefficients, depreciation, edge cases, suggestion logic
- **API route tests:** Zone list endpoint, calculate endpoint (validation, CSRF, rate limit)
- **Component tests:** Form rendering, submission, result display, error states
- **Python tests (pytest):** Import script data parsing, HTML extraction, zone mapping

### Phase 2 Design Hooks

Built now, used later:
- `property_valuations.listing_id` FK ready for batch analysis
- `LISTING_TO_VALUATION_TYPE` mapping exported from engine
- Engine is a pure function — trivially callable in batch
- Future: reverse geocode listing coords → nearest cadastral zone → run engine → compare
