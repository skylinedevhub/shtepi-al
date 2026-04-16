# Type Design Analyzer Report

**Date:** 2026-04-16
**Files analyzed:** `web/src/lib/db/schema.ts`, `web/src/lib/types.ts`, `web/src/lib/validators.ts`, `web/src/lib/db/queries.ts`

## Ratings

- **Encapsulation**: 3/10 -- All types are plain interfaces with public fields. No construction boundary enforces shape; `dbRowToListing` (`queries.ts:19`) is an unguarded mapper that coerces nulls to defaults silently.
- **Invariant Expression**: 4/10 -- Zod validator (`validators.ts:9-13`) correctly constrains `transaction_type` to `"sale" | "rent"` and `property_type` to a 7-member union, but the `Listing` interface (`types.ts:12-13`) declares both as `string`. Billing types use union literals correctly. `ListingFilters.sort` is the one correctly narrowed field.
- **Invariant Usefulness**: 6/10 -- Existing invariants (billing status enums, Zod validation on create) prevent real bugs. But the most impactful invariant -- constraining `transaction_type` across the entire stack -- is missing.
- **Invariant Enforcement**: 4/10 -- Enforcement exists only at the API boundary via Zod. Once data passes through `dbRowToListing`, all type narrowing is lost.

## Key Concerns

1. **Listing.transaction_type is `string`** (`types.ts:12`) while validators enforce `"sale" | "rent"`. A `TransactionType = "sale" | "rent"` union used in both `Listing` and `ListingFilters` would give compile-time safety across ~30 call sites.

2. **Listing.property_type is `string`** (`types.ts:13`) despite 7 known values in `validators.ts:13`. Schema uses `varchar` (`schema.ts:121`) instead of a `pgEnum`.

3. **DeveloperProject has 3 bare `string | null` status/type fields** (`types.ts:189-190`) with no enum constraint.

4. **SavedSearch.filters is `Record<string, unknown>`** (`types.ts:249`). Should reference `ListingFilters`.

5. **Nullable field sprawl on Listing**: 18 of 42 fields are nullable. Location fields could be grouped into optional `Location` sub-object. Amenity booleans could be an `Amenities` sub-object.

6. **schema.ts at 770 lines** mixes 6 domains. Splitting into `schema/core.ts`, `schema/billing.ts`, `schema/ads.ts`, `schema/projects.ts`, `schema/buyer-plus.ts`, `schema/valuation.ts` would improve navigability. Section comments already mark exact split points.

## Top 3 Recommended Changes

**A.** Extract `TransactionType = "sale" | "rent"` and `PropertyType` union types and use them in `Listing`, `ListingFilters`, `DeveloperProject`, and `validators.ts`.

**B.** Type `SavedSearch.filters` as `ListingFilters` instead of `Record<string, unknown>`.

**C.** Split `schema.ts` along domain boundaries (lines 19, 38, 101, 233, 343, 453, 492, 719).
