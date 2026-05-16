# Market Intel Portal — Design Spec

**Date:** 2026-05-16
**Status:** Implemented (pending production rollout)
**Supersedes:** [`market-analytics.md`](./market-analytics.md) (audit notes)

## Overview

Stand up a separate B2B product — `data-portal/` — that sells proprietary Albanian real-estate market data (price-movement graphs, city metrics, API access) to banks, private investors, and developers. It lives on its own domain, has no public link or sitemap entry from `shtepial.al`, and is gated behind invite-only auth.

The public site is unchanged except for **removing the leak surface**: the existing `/data` and `/data/dashboard` routes on `web/` are deleted. The proprietary product is no longer reachable from anywhere on the public site.

Both apps share a single database, a single git repo, and a workspace package (`@repo/analytics`) containing the snapshot pipeline, geocoord utilities, and trend query layer. They deploy as **two independent Vercel projects** from the same monorepo.

### Why two Vercel projects, not Vercel Services

`experimentalServices` is too new — its config shape has shifted at least once and stable references are sparse. Two Vercel projects pointed at the same monorepo is the boring, battle-tested pattern. The cost is env-var duplication (handled by `vercel env pull`); the benefit is that future edits ground against stable, well-documented primitives.

## Architecture

### Monorepo conversion

`web/` is currently a standalone Next.js app with no root `package.json`. Step one is converting to an npm workspace:

```
shtepi-al/
├── package.json                    # NEW — root, workspaces: ["web", "data-portal", "packages/*"]
├── package-lock.json               # NEW — hoisted
├── web/                            # existing public site, becomes a workspace
├── data-portal/                    # NEW — B2B intel app
└── packages/
    └── analytics/                  # NEW — shared data layer
```

Both apps reference `@repo/analytics` via `"@repo/analytics": "*"`. No Turborepo needed for v1 — npm workspaces alone are sufficient. Turborepo can be layered on later when build caching becomes a real bottleneck.

### `@repo/analytics` package

Pure TypeScript, no Next.js dependencies. Consumed by both `web/` (which runs the snapshot pipeline) and `data-portal/` (which renders the dashboard).

```
packages/analytics/
├── src/
│   ├── geocoords/
│   │   ├── nearest-city.ts         # getCityFromCoords(lat, lng): string | null
│   │   └── nearest-city.test.ts
│   ├── snapshots/
│   │   ├── compute.ts              # pure aggregation: listings + price_history -> snapshot rows
│   │   ├── compute.test.ts
│   │   ├── backfill.ts             # iterate days, call compute, upsert
│   │   └── daily.ts                # compute today's snapshot only
│   ├── queries/
│   │   ├── trends.ts               # getPriceTrends({city?, transactionType, days})
│   │   ├── trends.test.ts
│   │   └── overview.ts             # moved from web/src/lib/analytics/market.ts
│   └── index.ts
└── package.json
```

### Snapshot pipeline lives in `web/`

The Scrapy pipeline already runs daily and writes to the DB from `web/`-controlled infrastructure. The snapshot cron and backfill belong with that pipeline, not in `data-portal/`:

- Daily Vercel Cron entry in `web/vercel.json`: `0 2 * * *` → `GET /api/cron/market-snapshot` (after the 01:00 UTC scrape finishes). Header-secured with `CRON_SECRET`.
- Backfill script `web/scripts/backfill-market-snapshots.ts`, invoked manually once via `npm run -w web backfill:snapshots`.

`data-portal/` is read-only against the `market_snapshots` table.

### Geocoord → city assignment

Lives in `@repo/analytics/geocoords`. Sidesteps the scraped `city` text field entirely.

```ts
function getCityFromCoords(
  lat: number,
  lng: number,
  maxKm = 25
): { city: string; distanceKm: number } | null
```

- Nearest-centroid via haversine against the 22-city `ALBANIAN_CITY_COORDS` table.
- Beyond `maxKm` → `null` (excluded from city-level series; still folded into national rollup where `city IS NULL`).
- The existing `web/src/lib/city-coords.ts` keeps `ALBANIAN_CITY_COORDS` as the source of truth and re-exports from `@repo/analytics`. The scraper-facing Python copy (`scrapy_project/shtepi/city_coords.py`) remains unchanged.

## Data Model

### New table: `market_snapshots`

```sql
CREATE TABLE market_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  city TEXT NULL,                       -- NULL = national rollup
  transaction_type TEXT NOT NULL,       -- 'sale' | 'rent'
  property_type TEXT NULL,              -- NULL = all property types
  listing_count INTEGER NOT NULL,
  avg_price_eur NUMERIC(12, 2),
  median_price_eur NUMERIC(12, 2),
  avg_price_sqm_eur NUMERIC(10, 2),
  median_price_sqm_eur NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_market_snapshots_unique
  ON market_snapshots (snapshot_date, COALESCE(city, ''), transaction_type, COALESCE(property_type, ''));

CREATE INDEX idx_market_snapshots_lookup
  ON market_snapshots (city, transaction_type, snapshot_date DESC);
```

Schema registered in `web/src/lib/db/schema.ts` alongside existing tables; consumed via Drizzle from `@repo/analytics`.

### New table: `b2b_users`

Augments Supabase Auth — we keep auth in Supabase, but maintain a separate access-control table for the B2B portal:

```sql
CREATE TABLE b2b_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization TEXT NOT NULL,          -- "Bank of Albania", "ABI Bank", etc.
  role TEXT NOT NULL DEFAULT 'viewer', -- 'viewer' | 'admin'
  plan_slug TEXT,                       -- 'intel-dashboard' | 'intel-api' | 'intel-enterprise'
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

Middleware on `data-portal/` rejects any request whose authenticated user is not present in `b2b_users`. No anonymous fallback, no sign-up route.

### Backfill semantics

For each day `D` from `MIN(listings.first_seen)` to today:

1. Listings "active on `D`": `first_seen <= D AND (last_seen IS NULL OR last_seen >= D)`.
2. Price on `D`: the latest `price_history` row with `recorded_at <= D` for that listing; fallback to `listings.price` if no history rows exist.
3. City assigned via `getCityFromCoords(latitude, longitude)`.
4. Group by `(city, transaction_type, property_type)`, write upsert rows. Also write the `(city = NULL)` national rollup row per `(transaction_type, property_type)` slice.

Idempotent: `INSERT ... ON CONFLICT (snapshot_date, COALESCE(city, ''), transaction_type, COALESCE(property_type, '')) DO UPDATE`.

**Known approximation:** for listings where `price_history` has no rows, backfill assumes the listing's current price held for its whole active window. Documented in the spec; acceptable for v1 because most price movement comes from actively-edited listings, which do populate `price_history`.

## `data-portal/` Application

### Routes (v1)

- `/` — login redirect if unauthenticated, dashboard if authed
- `/login` — Supabase email/password sign-in (no sign-up)
- `/dashboard` — main view: city dropdown + sale/rent toggle + 180-day line chart of avg €/m², plus current city metrics summary
- `/api/v1/trends` — public B2B API, API-key authenticated against `api_keys` table from migration 0013
- `/api/v1/cities` — list of cities with most recent metrics

### Middleware

```ts
// data-portal/middleware.ts (pseudocode)
export async function middleware(req) {
  if (req.nextUrl.pathname.startsWith('/api/v1/')) return apiKeyAuth(req);
  if (req.nextUrl.pathname === '/login') return NextResponse.next();
  const session = await getSupabaseSession(req);
  if (!session) return redirect('/login');
  const b2bUser = await getB2bUser(session.user.id);
  if (!b2bUser) return new Response('Forbidden', { status: 403 });
  return NextResponse.next();
}
```

No anonymous routes other than `/login` and the API key path.

### UI scope (v1)

- City dropdown (22 cities + "Të gjitha qytetet" for national)
- Sale/Rent toggle
- 180-day line chart: avg €/m² over time
- Below chart: latest snapshot's metrics card (count, avg price, median, rent yield if applicable)
- Albanian labels and tooltips throughout, matching brand palette

**Out of v1:** property-type filter (data is captured, UI just doesn't expose it yet), neighborhood drilldown, demand maps, agency market-share, exportable PDF reports.

### Charting library

Pick during implementation by checking what's already in the `web/` dep tree; if nothing suitable is present, install **Recharts** in `data-portal/` only. Recharts is small, SSR-safe, and aligns with the React tree. The choice is local to `data-portal/` — `web/` is unaffected.

## API Routes Summary

| Route | App | Auth | Notes |
|---|---|---|---|
| `GET /api/cron/market-snapshot` | `web/` | `CRON_SECRET` header | Daily writer, idempotent |
| `GET /api/v1/trends?city=…&transaction_type=…&days=180` | `data-portal/` | API key | Returns time series JSON |
| `GET /api/v1/cities` | `data-portal/` | API key | List + latest metrics |
| Dashboard server-side data | `data-portal/` | Supabase session + `b2b_users` | Server components query `@repo/analytics` directly |

The existing public `GET /api/analytics/market` route in `web/` is **deleted** along with `/data` and `/data/dashboard`.

## Deployment

Two Vercel projects pointed at the same GitHub repo:

| Vercel Project | Root Directory | Domain |
|---|---|---|
| `shtepial-web` (existing) | `web/` | `shtepial.al`, `www.shtepial.al` |
| `shtepial-intel` (new) | `data-portal/` | `intel.shtepial.al` (or chosen B2B domain) |

Both projects:
- Both apps read `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` from their own env.
- `web/` additionally holds `CRON_SECRET` (only `web/` runs the snapshot cron).
- `data-portal/` additionally holds an API-key signing/verification salt for the B2B API route.

The B2B portal robots.txt is `Disallow: /` — banks-grade products should not be indexed.

## Testing

TDD-first. New test files:

- `packages/analytics/src/geocoords/nearest-city.test.ts` — known coords, threshold, null behaviour, edge of Albania
- `packages/analytics/src/snapshots/compute.test.ts` — fixture listings + price_history, verify aggregate shapes, verify national vs city rollup
- `packages/analytics/src/queries/trends.test.ts` — seed fallback, date-range filtering
- `data-portal/src/middleware.test.ts` — 401 anonymous, 403 non-b2b user, pass authed b2b user, API-key path
- `data-portal/src/app/dashboard/page.test.tsx` — renders empty state, renders populated state
- `web/src/app/api/cron/market-snapshot/route.test.ts` — secret check, idempotency

Reuse the existing Vitest setup. `data-portal/` gets its own `vitest.config.ts` mirroring `web/`'s config.

## Rollout Plan

1. **Monorepo conversion** — add root `package.json` with workspaces. Move `web/` into workspace. CI updated.
2. **`@repo/analytics` package** — create skeleton with `getCityFromCoords` (TDD).
3. **Snapshot schema migration** — `market_snapshots` + `b2b_users`. Add to Drizzle schema.
4. **Snapshot pipeline** — `compute.ts`, backfill script, daily cron route, `vercel.json` cron entry. TDD throughout.
5. **Run backfill manually** — `npm run -w web backfill:snapshots` against production DB. Verify with a SQL spot-check.
6. **`data-portal/` scaffold** — Next.js app, Supabase auth wiring, middleware, login page.
7. **Dashboard UI** — city dropdown, sale/rent toggle, chart, metrics card.
8. **API v1 routes** — `/trends`, `/cities` with API-key auth.
9. **Delete leak surface from `web/`** — `/data/*` routes, `/api/analytics/*`, any nav links.
10. **Create second Vercel project** — point at `data-portal/`, attach domain.
11. **Provision first b2b user** — manual `INSERT INTO b2b_users` for the founding customer / internal test account.
12. **Verify end-to-end** — login → dashboard → graph populated → API key returns JSON.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Monorepo conversion breaks existing CI / Vercel builds | Convert in a feature branch, verify `web/` still deploys to a preview URL before merging to main. CLAUDE.md note about running `npm run build` before pushing to main applies double here. |
| Backfill produces noisy trends due to thin `price_history` data | Document the approximation in the dashboard footer. Plan a follow-up to deepen price_history capture in the scraper pipeline. |
| Nearest-centroid miscategorizes Tirana-suburb listings | 25km cap limits damage; documented as v1 trade-off. Polygon-based assignment is a documented follow-up. |
| Public site SEO loses the `/data` URL | Add a 410 Gone response (or 301 to `/` if SEO weight matters). |
| Vercel cron and Scrapy scrape race | Cron runs at 02:00 UTC, scrape at 01:00 UTC. If scrape over-runs (CLOSESPIDER_TIMEOUT=780 caps it at 13 min), there's still ~45 min of buffer. |

## YAGNI — Explicit Cuts

- Property-type filter UI
- Neighborhood-level rollups
- Agency market-share view
- Demand maps / heatmaps
- PDF / CSV report export
- SSO (Clerk / WorkOS) — Supabase Auth is sufficient for invite-only v1
- Stripe checkout for B2B plans — first customers are sales-led, contracts handled offline. Self-serve checkout layered on later.
- Turborepo — plain npm workspaces are enough until build times become a bottleneck

## Follow-Ups (out of scope for this spec)

- Polygon-based city assignment (city boundary GeoJSON)
- Deeper `price_history` capture in scraper pipeline (snapshot every scrape, not just on detected change)
- Stripe checkout for self-serve B2B subscriptions
- API access tier with usage-based billing
- SSO integration when first enterprise customer requires it
- Internal admin UI to manage `b2b_users` (provisioning, plan changes, revocation)
- Phase 2 dimensions on the dashboard: property type, neighborhood, agency market share

## Open Questions

None at design time. Surface implementation-time uncertainty in the implementation plan rather than here.
