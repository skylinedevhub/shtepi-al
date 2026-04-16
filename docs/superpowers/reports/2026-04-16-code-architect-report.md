# Code Architect Report

**Date:** 2026-04-16
**Files analyzed:** `web/src/lib/db/queries.ts`, `web/src/app/listings/page.tsx`

## TARGET 1: queries.ts Decomposition

### Module Split

```
web/src/lib/db/
  queries.ts              <- BECOMES barrel re-export only (no logic)
  queries/
    _utils.ts             <- internal: dbRowToListing, buildFilterConditions (not re-exported)
    listings.ts           <- getListings, getMapListings, getNeighborhoods, getListingById,
                             getListingByShortId, searchListings, getStats,
                             getAllActiveListingSlugs, getListingGroupInfo,
                             getPriceHistory, getPendingListings, updateListingStatus
                             + re-exports: ListingGroupMember, PriceHistoryEntry,
                               PendingListingsResponse, ListingSlugRow
    favorites.ts          <- getUserFavorites, isFavorited, toggleFavorite, getUserFavoriteIds
    agencies.ts           <- getAgencies, getAgencyBySlug, getAgencyListings
                             + re-exports: AgencyWithCount, AgenciesResponse
    admin.ts              <- getAdminStats, getUserProfile
                             + re-exports: AdminStats
```

**`queries/_utils.ts`** — never imported by consumers, only by sibling domain files:
- `DbRow` type
- `dbRowToListing(row: DbRow): Listing`
- `buildFilterConditions(filters: ListingFilters)`

**`queries.ts` after refactor** — pure re-export barrel:
```ts
export * from "./queries/listings";
export * from "./queries/favorites";
export * from "./queries/agencies";
export * from "./queries/admin";
```

All 26 existing import sites continue working without any change.

### Cross-domain Dependency Map

- `listings.ts` imports: `_utils`, `./drizzle`, `./schema`, `./seed`, `react`, `drizzle-orm`
- `favorites.ts` imports: `_utils`, `./drizzle`, `./schema`, `drizzle-orm`
- `agencies.ts` imports: `_utils`, `./drizzle`, `./schema`, `drizzle-orm`, `react`
- `admin.ts` imports: `_utils`, `./drizzle`, `./schema`, `drizzle-orm`

`_utils.ts` is the only shared dependency. No circular imports possible.

### Migration Sequence

1. Create `queries/_utils.ts` — move `dbRowToListing` and `buildFilterConditions`
2. Create `queries/listings.ts` — move lines 97-489
3. Create `queries/favorites.ts` — move lines 493-579
4. Create `queries/agencies.ts` — move lines 715-931
5. Create `queries/admin.ts` — move lines 583-711
6. Replace `queries.ts` body with four `export *` lines
7. Run tests — zero changes expected

## TARGET 2: listings/page.tsx Decomposition

### Components to Extract

All land in `web/src/app/listings/_components/` and `_hooks/`.

| Component | Props | Lines |
|---|---|---|
| `SkeletonCard.tsx` | None | ~15 |
| `EmptyState.tsx` | `{ onClear: () => void }` | ~25 |
| `FetchErrorState.tsx` | `{ onRetry: () => void }` | ~25 |
| `ViewToggle.tsx` | `{ viewMode, onGrid, onMap, onMapHover }` | ~40 |
| `SortSelect.tsx` | `{ value, onChange, variant, className? }` | ~35 |
| `MapOverlayControls.tsx` | `{ currentSort, onSort, onSwitchToGrid, ... }` | ~170 |
| `MapListingsPanel.tsx` | `{ listings, total, loading, hasMore, panelOpen, ... }` | ~145 |
| `useListingsFetch.ts` (hook) | `(searchParams)` → `{ listings, total, loading, ... }` | ~60 |
| `useMapPins.ts` (hook) | `(viewMode, searchParams, mapBbox)` → `{ mapListings, ... }` | ~45 |

### Key Design Decisions

- `EmptyState` takes `onClear` prop instead of internal `useRouter` — makes it testable without router context
- `SortSelect` uses `variant` prop to handle 3 near-duplicate sort selects (grid, map overlay, map mobile)
- `useListingsFetch` is the highest-value extraction — moves all fetch state + callbacks out of the 650-line component
- `useMapPins` isolates bbox-aware pin fetching from listing fetching
- `GridIcon` and `MapIcon` become private to `ViewToggle.tsx`
- `SORT_OPTIONS` moves inside `SortSelect.tsx`

### Resulting page.tsx

~120 lines after extraction: state declarations, two hook calls, two conditional render branches assembling pre-built components.

### File Tree

```
web/src/app/listings/
  page.tsx                         <- ~120 lines after extraction
  _components/
    SkeletonCard.tsx               <- ~15 lines
    EmptyState.tsx                 <- ~25 lines
    FetchErrorState.tsx            <- ~25 lines
    ViewToggle.tsx                 <- ~40 lines
    SortSelect.tsx                 <- ~35 lines
    MapOverlayControls.tsx         <- ~170 lines
    MapListingsPanel.tsx           <- ~145 lines
  _hooks/
    useListingsFetch.ts            <- ~60 lines
    useMapPins.ts                  <- ~45 lines
```

### Migration Sequence

1. SkeletonCard → 2. EmptyState → 3. FetchErrorState → 4. SortSelect → 5. ViewToggle → 6. useListingsFetch → 7. useMapPins → 8. MapOverlayControls → 9. MapListingsPanel → 10. Update page.tsx → 11. Run tests
