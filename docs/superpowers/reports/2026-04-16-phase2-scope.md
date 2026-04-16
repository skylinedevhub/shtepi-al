# Phase 2 Scope — Synthesized from Phase 1 Reports

**Date:** 2026-04-16

## Refactoring Actions (from code-architect report)

### Action 1: Split queries.ts into domain modules

**Source:** `web/src/lib/db/queries.ts` (931 lines)

Create directory `web/src/lib/db/queries/` with:

| File | Exports | Source lines |
|---|---|---|
| `_utils.ts` | `DbRow`, `dbRowToListing`, `buildFilterConditions` | 17-95 |
| `listings.ts` | `getListings`, `getMapListings`, `getNeighborhoods`, `getListingById`, `getListingByShortId`, `searchListings`, `getStats`, `getAllActiveListingSlugs`, `getListingGroupInfo`, `getPriceHistory`, `getPendingListings`, `updateListingStatus` + types | 97-489 |
| `favorites.ts` | `getUserFavorites`, `isFavorited`, `toggleFavorite`, `getUserFavoriteIds` | 493-579 |
| `agencies.ts` | `getAgencies`, `getAgencyBySlug`, `getAgencyListings` + types | 715-931 |
| `admin.ts` | `getAdminStats`, `getUserProfile` + types | 583-711 |

Replace `queries.ts` body with barrel re-exports.

### Action 2: Decompose listings/page.tsx

**Source:** `web/src/app/listings/page.tsx` (768 lines)

Create `_components/` and `_hooks/` directories:

**Components:**
- `SkeletonCard.tsx` — no props
- `EmptyState.tsx` — `{ onClear: () => void }`
- `FetchErrorState.tsx` — `{ onRetry: () => void }`
- `ViewToggle.tsx` — `{ viewMode, onGrid, onMap, onMapHover }` (contains GridIcon, MapIcon)
- `SortSelect.tsx` — `{ value, onChange, variant, className? }` (contains SORT_OPTIONS)
- `MapOverlayControls.tsx` — large prop interface for overlay controls
- `MapListingsPanel.tsx` — `{ listings, total, loading, hasMore, panelOpen, ... }`

**Hooks:**
- `useListingsFetch.ts` — `(searchParams)` → fetch state + callbacks
- `useMapPins.ts` — `(viewMode, searchParams, mapBbox)` → pin state

Target: page.tsx reduced to ~120 lines.

## Error Handling Fixes (from silent-failure-hunter report)

### Fix 1: Webhook transient error handling (CRITICAL)
**File:** `web/src/app/api/webhooks/stripe/route.ts`
- Lines 611-660: Stop returning 200 on all errors. Return 500 for transient errors (DB unreachable) so Stripe retries.
- Lines 83-84, 183-184, 275-276, 348-349, 388-389, 492-493: Add error logging to bare `if (!db) return;` guards, then throw to trigger 500 response.

### Fix 2: GeocodingPipeline error handling (CRITICAL)
**File:** `scrapy_project/shtepi/pipelines.py`
- Lines 182-184: Replace bare `except Exception` with specific catches (`requests.RequestException`, `(KeyError, ValueError)`). Add WARNING logging.
- Lines 172-179: Do not cache 429/5xx responses. Log non-200 status codes.

### Fix 3: PostgreSQLPipeline reconnect logging (WARNING)
**File:** `scrapy_project/shtepi/pipelines.py`
- Lines 428-430: Log at DEBUG before `pass`.
- Lines 438-444: Log connection error before reconnect.
- Lines 634-635: Catch only `psycopg2.Error` in `_maybe_log_price_change`.
- Lines 688-690: Log in `_cross_source_dedup` connection check.

## Type Improvements (from type-design-analyzer report — NOT in Phase 2 scope)

These are documented for a follow-up branch:
- Extract `TransactionType = "sale" | "rent"` union type
- Extract `PropertyType` union type (7 values)
- Type `SavedSearch.filters` as `ListingFilters`
- Consider splitting `schema.ts` by domain

**Rationale for deferral:** Type narrowing changes touch 30+ files and require careful migration. The refactoring actions above are mechanical splits that don't change behavior. Mixing both risks a massive diff.

## Spider Follow-ups (from spider-reviewer report — NOT in Phase 2 scope)

Documented for a separate branch:
- C1: celesi missing `price_period`
- C2: njoftime raw Albanian `transaction_type`
- C3: 8 spiders return `"studio"` not in normalizer map
- W1-W5: pagination guards, poster_type defaults, dead code, unused imports
