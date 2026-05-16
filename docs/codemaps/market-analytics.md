# Market Analytics & Intel Portal

Aggregates listing data into daily city-level price metrics. Powers the B2B
intel product sold to banks, private investors, and developers — €199/mo
dashboard, €499/mo API (`docs/plans/` for revenue context).

The product is split across two Vercel projects in the same monorepo:

- `web/` — runs the daily snapshot cron and one-shot backfill (writes
  `market_snapshots`). Public site at shtepial.al has **no** market-data
  surface.
- `data-portal/` — separate Next.js app on its own domain
  (`intel.shtepial.al` / `shtepial-intel.vercel.app`). Reads the same DB
  read-only. Invite-only via `b2b_users` table.
- `packages/analytics` — shared TS lib (`@repo/analytics`) consumed by both.

## Shared package: `@repo/analytics`

Pure TS, no Next.js dependency. Both apps import via npm workspaces.

### Geocoords
- `packages/analytics/src/geocoords/cities.ts` — `ALBANIAN_CITY_COORDS`,
  22 entries. Re-exported by `web/src/lib/city-coords.ts` so existing
  call sites are unchanged.
- `packages/analytics/src/geocoords/nearest-city.ts` —
  - `haversineKm(lat1, lng1, lat2, lng2)`
  - `getCityFromCoords(lat, lng, maxKm = 25) → { city, distanceKm } | null`
  - Pure. Used by snapshot compute to assign a listing's city from its
    geocoords (sidesteps the scraped `city` text field).

### Snapshots
- `packages/analytics/src/snapshots/types.ts` — `ListingForSnapshot`,
  `SnapshotRow` interfaces.
- `packages/analytics/src/snapshots/compute.ts` — `computeSnapshotRows(date,
  listings)`. Pure. For each listing emits 4 facet rows:
  `(NULL, NULL)`, `(NULL, propertyType)`, `(city, NULL)`,
  `(city, propertyType)`. Skips city facets when `getCityFromCoords` returns
  null. Median is exact (not interpolated); avg ignores `area_sqm ≤ 0`.
- `packages/analytics/src/snapshots/persist.ts` — `upsertSnapshotRows(db,
  rows)`. `INSERT ... ON CONFLICT (snapshot_date, COALESCE(city, ''),
  transaction_type, COALESCE(property_type, '')) DO UPDATE`.
- `packages/analytics/src/snapshots/daily.ts` — `writeDailySnapshot(db,
  today?)`. Reads currently-active listings, computes today's rows, upserts.
  Invoked by the cron route.
- `packages/analytics/src/snapshots/backfill.ts` — `backfillSnapshots(db,
  opts)`. Walks `MIN(listings.first_seen)` → today (or `opts.startDate` →
  `opts.endDate`). For each day, "active on D" = `first_seen ≤ D AND
  (last_seen IS NULL OR last_seen ≥ D)`. Price on D = latest `price_history`
  row with `recorded_at ≤ D`, else `listings.price`. Idempotent.

### Queries
- `packages/analytics/src/queries/trends.ts` —
  - `TrendPoint`, `PriceTrend`, `TrendQuery` interfaces
  - `getPriceTrends(db, { city, transactionType, propertyType?, days })`
  - `city = null` → national rollup (uses `WHERE city IS NULL`, not
    equality). Same for `propertyType`. Seed fallback returns empty points
    array when `db` is null.
- `packages/analytics/src/queries/overview.ts` —
  - `getMarketOverview(db) → { cities, total_listings,
    national_avg_price_sqm, generated_at }`
  - City-level avg €/m² (sale), median price, sale/rent counts, avg rent
    €/m², rent yield %. National avg is sale-count weighted.
  - Moved here from the deleted `web/src/lib/analytics/market.ts`.

### Tests
- `packages/analytics/src/geocoords/nearest-city.test.ts` (7 cases)
- `packages/analytics/src/snapshots/compute.test.ts` (5 cases)
- `packages/analytics/src/queries/trends.test.ts` (3 cases)
- 15 tests total, Vitest node environment.

## Pipeline (on `web/`)

### Daily cron
- `web/src/app/api/cron/market-snapshot/route.ts` — `GET` handler, Node
  runtime, `force-dynamic`. Auth: `Authorization: Bearer ${CRON_SECRET}`.
  Calls `writeDailySnapshot(getDb())`. Returns `{ rowsWritten }`.
- `web/vercel.json` — `crons: [{ path: "/api/cron/market-snapshot",
  schedule: "0 2 * * *" }]`. Runs 02:00 UTC, ~1h after the daily scrape.
- Tests: `web/src/app/api/cron/market-snapshot/route.test.ts` (3 cases —
  401 anon, 401 wrong token, 200 with token).

### Backfill (one-shot)
- `web/scripts/backfill-market-snapshots.ts` — invoked via
  `npm run -w @shtepial/web backfill:snapshots`. Refuses to run without
  `DATABASE_URL`. Logs per-day progress.
- First run: 2026-05-16, populated 11,133 rows for 2026-02-11 → today.

## Schema

### `market_snapshots` (migration 0014)
```sql
CREATE TABLE market_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  city TEXT NULL,              -- NULL = national rollup
  transaction_type TEXT NOT NULL,
  property_type TEXT NULL,     -- NULL = all property types
  listing_count INTEGER NOT NULL,
  avg_price_eur NUMERIC(12, 2),
  median_price_eur NUMERIC(12, 2),
  avg_price_sqm_eur NUMERIC(10, 2),
  median_price_sqm_eur NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_market_snapshots_unique
  ON market_snapshots (snapshot_date, COALESCE(city, ''),
                       transaction_type, COALESCE(property_type, ''));
CREATE INDEX idx_market_snapshots_lookup
  ON market_snapshots (city, transaction_type, snapshot_date DESC);
```

The COALESCE-expression unique index lets PG treat NULL rollups as
collidable on re-run; without it, PG's "NULL never equals NULL" semantics
would create duplicate rollup rows on every reinsert.

### `b2b_users` (migration 0014)
```sql
CREATE TABLE b2b_users (
  user_id UUID PRIMARY KEY,    -- matches auth.users.id
  organization TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  plan_slug TEXT,
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```
Augments Supabase Auth. A user with a session but no `b2b_users` row hits
403 at the middleware. No anonymous fallback, no signup route.

### Drizzle exports
Both tables also exported via `web/src/lib/db/schema.ts` as
`marketSnapshots`, `b2bUsers`.

## `data-portal/` app

Separate Next.js 14 workspace `@shtepial/data-portal`. Tailwind, Vitest,
Recharts. Robots disallow all. Transpiles `@repo/analytics` via
`next.config.js`.

### Auth gate
- `data-portal/middleware.ts` —
  - `/login` and `/api/v1/*` pass through.
  - Anonymous → 307 redirect to `/login`.
  - Authenticated user without a `b2b_users` row → 403.
  - 4 tests in `data-portal/middleware.test.ts`.
- `data-portal/src/lib/supabase/{server,client}.ts` — `@supabase/ssr`
  server-component-safe client. Reads
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (clean values — see
  Operational Notes on the `\n` env-var pitfall).
- `data-portal/src/lib/b2b-user.ts` — `getB2bUser(userId)`.
- `data-portal/src/lib/db.ts` — Drizzle/postgres-js client with
  `prepare: false` (Supabase pooler safe).

### Dashboard UI
- `data-portal/src/app/page.tsx` — session-aware redirect:
  `/login` if anon, `/dashboard` if authed.
- `data-portal/src/app/login/{page.tsx,LoginForm.tsx}` — Supabase
  email+password (no signup). Albanian copy: "Hyni në llogarinë tuaj",
  "Llogaritë krijohen vetëm me ftesë".
- `data-portal/src/app/dashboard/page.tsx` — server component. Parallel
  `Promise.all([getPriceTrends, getMarketOverview])`. Falls back to empty
  state when no snapshots present.
- `data-portal/src/app/dashboard/DashboardControls.tsx` — client; URL-
  driven city dropdown + sale/rent toggle (router.push on change).
- `data-portal/src/app/dashboard/PriceChart.tsx` — client; Recharts
  `LineChart` of `avgPriceSqmEur` over up to 730 days (default 180). Brand
  terracotta line, navy axes, cream backdrop.

### B2B API v1
- `data-portal/src/lib/api-key-auth.ts` — `authenticateApiKey(req)`.
  Checks `x-api-key` or `Authorization: Bearer` against
  `api_keys.key_hash = encode(digest($token, 'sha256'), 'hex')`. Requires
  the `pgcrypto` extension (already enabled — `gen_random_uuid()` uses it
  throughout migrations). Filters out `is_active = false` and expired keys.
- `data-portal/src/app/api/v1/trends/route.ts` —
  `GET /api/v1/trends?city=…&transaction_type=sale|rent&days=1..730`.
  Returns a `PriceTrend`. `Cache-Control: public, s-maxage=300,
  stale-while-revalidate=600`.
- `data-portal/src/app/api/v1/cities/route.ts` —
  `GET /api/v1/cities`. Returns a `MarketOverview`.

## Data flow

```
spiders (11 active) ──┐
                      │  PostgresPipeline writes listings + price_history
                      ▼
              Postgres (Supabase prod)
                      │
                      │ Vercel Cron 02:00 UTC daily
                      ▼
   web/ /api/cron/market-snapshot ──→ writeDailySnapshot(db)
                      │
                      ▼
          market_snapshots (UPSERT)
                      ▲
                      │  read-only
   ┌──────────────────┼──────────────────────────────┐
   │                  │                              │
   data-portal /dashboard          data-portal /api/v1/{trends,cities}
   (Supabase session +              (API-key authed against
    b2b_users gate)                  api_keys.key_hash)
```

## Operational notes

### Env vars must be pristine
The `\n` trap: Vercel env values stored via the CLI `vercel env add NAME
production --value "$x"` from bash double-quoted vars will preserve any
literal backslash-n (2 chars) in the value. Next.js runtime does not
unescape these — `process.env.NEXT_PUBLIC_SUPABASE_URL` will end with
`\n`, making the URL invalid, and the Supabase client will fail silently
with `Invalid URL` → form shows "Email ose fjalëkalim i pasaktë". Diagnose
with `vercel env pull` + `od -c` on the last bytes; fix with `vercel env
rm` + `vercel env add --value` using a JSON-parsed, trimmed value.

### Provisioning a B2B customer
```
-- 1. Create the Supabase Auth user (Dashboard → Authentication → Add user,
--    OR POST /auth/v1/admin/users via the service role key)
-- 2. Insert into b2b_users:
INSERT INTO b2b_users (user_id, organization, role, plan_slug)
VALUES ('<auth-user-uuid>', 'Bank of Albania', 'viewer', 'intel-dashboard');
```

### Issuing an API key
```sql
-- Generate a token client-side (e.g. randomBytes(32).toString('base64url')).
-- Store only its SHA-256 hash:
INSERT INTO api_keys (id, user_id, key_hash, key_prefix, name, scopes, is_active)
VALUES (
  gen_random_uuid(),
  '<b2b-user-uuid>',
  encode(digest('<plain-token>', 'sha256'), 'hex'),
  substring('<plain-token>' from 1 for 8),
  'Bank of Albania - Production',
  '["trends","cities"]'::jsonb,
  true
);
-- Hand the customer the plain token (you'll never see it again).
```

### Backfilling after a schema or city-list change
`npm run -w @shtepial/web backfill:snapshots` is idempotent. Re-run any
time the snapshot compute logic changes — the COALESCE-keyed unique
index ensures upserts replace prior rows for the same facet.

## Known trade-offs (documented as v1 acceptable)

- **Nearest-centroid miscategorisation** — Tirana-suburb listings can
  match `Kamëz` (also a centroid in the 22-city list). 25km cap limits
  blast radius. Polygon-based assignment is a documented follow-up.
- **Backfill price fidelity** — for listings with no `price_history` rows
  before day D, backfill assumes today's price held throughout. Real
  movement on edited listings is captured exactly via the latest-row
  subquery.
- **Mean sensitive to outliers** — the dashboard chart shows `avg_price_sqm`
  which can spike on low-count days. Median (`median_price_sqm_eur`) is
  written to every snapshot row but not yet plotted.

## Extension points

- **Plot median alongside mean** — `PriceChart.tsx` would take a second
  `<Line dataKey="medianPriceSqmEur" />`. No backend changes.
- **Property-type slice in UI** — schema and compute already produce these
  rows; add a dropdown filter to `DashboardControls.tsx`.
- **Neighborhood rollups** — extend compute to facet on
  `listings.neighborhood` (column already populated by spiders). Add a
  third dimension to the `market_snapshots` table or a sibling table.
- **PDF/CSV export** — Vercel Functions route on `data-portal/` returning
  `text/csv` or a PDF rendered via a headless Chromium worker.
- **Self-serve checkout** — `b2b_users` row currently has `plan_slug` but
  no Stripe link. Add a Stripe customer portal route on `data-portal/`
  that creates a subscription and writes `plan_slug` on success.

## Cross-references

- Spec: `docs/superpowers/specs/2026-05-16-market-intel-portal-design.md`
- Plan: `docs/superpowers/plans/2026-05-16-market-intel-portal.md`
- Migration: `web/src/lib/db/migrations/0014_market_snapshots.sql`
- API keys table (consumed by `/api/v1/*` auth):
  `web/src/lib/db/migrations/0013_add_api_keys.sql`
- Public site CLAUDE.md: see "Market Data" section under Revenue Model
