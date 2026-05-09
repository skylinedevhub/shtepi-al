# Market Analytics

Aggregates listing data into city-level price, yield, and inventory metrics.
Powers the public-facing market dashboard and the (still-to-be-built) B2B data
API. Sold as the "Market Data" revenue stream — €199/mo dashboard, €499/mo
API, €1500+ enterprise (`docs/plans/` for revenue context, `CLAUDE.md` for the
overall revenue model).

## Files

### Engine
- `web/src/lib/analytics/market.ts`
  - `getMarketOverview()` — `:38` — per-city avg €/m² (sale), median price,
    sale/rent counts, avg rent €/m², rent yield %; computes a sale-count-
    weighted national avg
  - `getCityMetrics(city)` — `:109` — overview row + sale-price distribution
    bucketed `0-50k | 50-100k | 100-200k | 200-500k | 500k+`
  - `getInventoryDepth()` — `:155` — per-city active / new this month /
    deactivated this month
  - `PriceTrend` interface — `:30` — **declared, no implementation**

### API
- `web/src/app/api/analytics/market/route.ts`
  - `GET /api/analytics/market` — overview (default), `?city=X` for city
    detail, `?view=inventory` for inventory depth
  - Public, IP rate-limited 30/min, `Cache-Control: s-maxage=300,
    stale-while-revalidate=600`
  - **No auth, no plan gating** — the €199/mo product is currently free

### UI
- `web/src/app/data/page.tsx` — marketing / pricing landing page; lists six
  promised features (only two of which the engine implements — see Gaps)
- `web/src/app/data/dashboard/page.tsx` — client component; national summary
  cards, city comparison bar list, click-to-expand city panel with hand-rolled
  price-distribution histogram

### Schema (read by engine)
- `web/src/lib/db/schema.ts`
  - `listings` — `:140`-ish; `first_seen` / `last_seen` indexed at `:173,180,
    183` for inventory rollups
  - `priceHistory` — `:655-669`; per-listing append log, indexed
    `(listing_id, recorded_at)` — **populated but never read by the analytics
    layer**

### External writers
- `scrapy_project/shtepi/pipelines.py:604-627` — scraper inserts a
  `price_history` row whenever a tracked listing's price changes
- `scripts/mark_stale.py` — flips `is_active = false` after 14 days unseen;
  runs after the daily scrape

## Data flow

```
spiders (11 active)
   │
   │  PostgresPipeline writes listings + price_history
   ▼
Postgres (Supabase prod)
   │
   │  drizzle-orm aggregations (no caching layer between)
   ▼
getMarketOverview / getCityMetrics / getInventoryDepth
   │
   ▼
GET /api/analytics/market   (s-maxage=300, IP-rate-limited)
   │
   ▼
/data/dashboard (client fetch on mount)
```

Every dashboard load re-runs an `AVG / PERCENTILE_CONT` group-by over the
full active-listings table. There is no `market_metrics_daily` snapshot table
and no aggregate caching beyond the 5-minute HTTP cache header.

## What's implemented

- City-level point-in-time metrics: avg €/m², median sale price, rent yield,
  sale vs rent volume
- Sale-price histogram per city
- Inventory depth (active / new / deactivated, last 30 days)
- National avg €/m² weighted by per-city sale count
- Public dashboard with city comparison and click-through detail panel

## Gaps

The `/data` landing page advertises six features. Two are built; four are
stubbed or missing entirely.

| Promised | Status | Notes |
|---|---|---|
| Çmimi mesatar €/m² (per city) | implemented | `getMarketOverview` |
| Rendimenti i qirasë (yield) | implemented | computed in `getMarketOverview`, point-in-time only |
| Inventari i tregut | partial | counts only — no inventory-months, no median DOM |
| Trendet e çmimeve (mujore/vjetore) | missing | `PriceTrend` interface declared at `market.ts:30`, no function |
| Çmimi €/m² për lagje | missing | neighborhood data exists for filters (`getNeighborhoods`) but is not aggregated |
| Harta e kërkesës | missing | no views / favorites / inquiries aggregation |
| Aksioni i agjencive (market share) | missing (+ unlisted) | no per-agency analytics query |

Cross-cutting gaps:

- **No time series.** `price_history` is populated daily by the scraper but
  never read by the analytics layer. No MoM / YoY, no median time-on-market,
  no price-drop velocity. This is the core blocker for any "price action"
  framing of the product.
- **`/api/v1/` does not exist.** The €499/mo "REST API i plotë" tier
  advertised on `/data` has no route tree; the `api_keys` table from
  migration 0013 is not wired into any handler.
- **Zero plan gating on `/data/dashboard`.** `middleware.ts` does not list
  `/data/*` as protected and the page never calls `requirePlan()`. Same for
  `/api/analytics/market` (rate-limited but unauthenticated).
- **No source/portal segmentation.** 11 spiders feed the lake; metrics
  collapse them. Cannot say "Merr Jep is 8% above market for Tirana 2BR."
- **Statistical rigor.** Rent yield is computed per-city from city averages —
  no national rollup. Price buckets are hard-coded EUR sale buckets that fit
  Tirana sales but not Vlorë rentals or premium segments.
- **No staleness filter.** `is_active = true` includes anything not yet
  processed by `mark_stale.py`, so "fresh" metrics mix listings up to 14 days
  old without any recency weighting.
- **No aggregate persistence.** Every API hit re-scans `listings`. Fine at
  current volume; will become expensive once time-series joins land.

## Extension points

Where new functionality slots in cleanly:

- **Time series.** Add `getPriceTrend(city, months)` to `market.ts` reading
  from `price_history` joined to `listings` on `city`. Surface via
  `/api/analytics/market?view=trend&city=X&months=12`. Render as a line
  chart in the city detail panel of `/data/dashboard/page.tsx`.
- **Daily snapshots.** New table `market_metrics_daily(city, date,
  avg_price_sqm, median_price, active_count, ...)`. Populated by a scheduled
  job (Vercel Cron or `scripts/`). The engine reads from snapshots for
  historical queries and falls back to live aggregation for "today."
- **Plan gating.** Wrap `/data/dashboard` (server component shell) and
  `/api/analytics/market` mutations with `requirePlan("data-dashboard")`
  from `web/src/lib/billing/gating.ts`. Free tier could keep an unauthed
  preview limited to top-3 cities.
- **B2B API.** Build `/api/v1/` with `api_keys`-based auth (table already
  exists from migration 0013). Reuse the same engine functions; add per-key
  rate limiting and usage logging.
- **Neighborhood rollups.** `listings.neighborhood` already populated by
  spiders. Add `getNeighborhoodMetrics(city)` mirroring `getCityMetrics`.
- **Demand signals.** `favorites`, `inquiries`, and (if added) listing-view
  events would feed a "demand index" per neighborhood — needed for the
  promised "Harta e kërkesës" feature.
