# ShtëpiAL Project Guide

## Quick Start
- `cd web && npm run dev` — Next.js frontend (localhost:3000)
- `cd scrapy_project && scrapy crawl <spider>` — Run a spider locally
- `cd web && npx vitest run` — Run ~210 frontend tests (40 files)
- `cd scrapy_project && python -m pytest` — Run 701 Python tests (132 standalone via test_normalizers.py + test_city_coords.py)
- Git root is `/shtepi-al/`, web CWD is `/shtepi-al/web/` — use absolute paths for git commands
- **Git identity:** always `skylinedevhub` — NEVER use phoebusdev (breaks Vercel deploys)

## Architecture
- **Monorepo (npm workspaces):** `web/` (public Next.js 14 site as `@shtepial/web`), `data-portal/` (B2B Next.js 14 intel app as `@shtepial/data-portal`), `packages/analytics` (shared TS lib as `@repo/analytics`), `scrapy_project/` (Scrapy), `scripts/`, `social/` (Remotion)
- **DB:** Supabase PostgreSQL (prod), seed JSON fallback (no DB). Drizzle ORM.
- **Auth:** Supabase Auth (server/client split for edge compatibility). `b2b_users` table gates the data-portal.
- **Billing:** Stripe subscriptions + Customer Portal + Webhooks
- **Deploy:** Two Vercel projects from the same repo — `shtepi-al` (root: `web/`) → shtepial.al; `shtepial-intel` (root: `data-portal/`) → intel.shtepial.al / shtepial-intel.vercel.app. Both auto-deploy from `main` / `feat/*` pushes. Works without DB via seed fallback.
- **Images:** `<img>` for scraped URLs (13 CDN domains), Vercel Blob for user uploads
- **CI:** `.github/workflows/ci.yml` (TypeScript + Vitest + pytest), `scrape.yml` (daily scrape + mark-stale)

## Revenue Model
ShtëpiAL monetizes via 5 revenue streams. All billing runs through Stripe.

### Agency Subscriptions (target 45% MRR)
- Plans: Starter (€49), Growth (€149), Premium (€399), Enterprise (custom)
- Feature gating in `web/src/lib/billing/gating.ts` — enforces listing limits, lead credits, CRM export, API access
- Ranking boost: agencies with active plans get organic search priority (correlated subquery in `queries.ts`)
- Auto-repost: Premium agencies get listings auto-refreshed every 7 days

### Ad System (target 25% MRR)
- Sponsored listings in search results, homepage, city pages
- Campaign types: sponsored_listing, banner, hero_carousel, city_takeover, sidebar
- Bid models: CPM (€4-8), CPC (€0.20-0.60), CPL (€3-10), flat_monthly
- Frequency caps per user per campaign (LRU cache in `ads/frequency.ts`)
- Impression batching (5s/50 items) with sendBeacon on unload

### Buyer Plus (target 15% MRR, €4.99/mo)
- Fair price score (compare listing to market avg €/m²)
- Price drop alerts, saved searches (unlimited for subscribers, 3 for free)
- Ad-free experience

### Developer Project Ads (target 10% MRR, €500/project/mo)
- `/projects` directory with featured carousel
- Project detail pages with contact forms, comparison tool

### Market Data (target 5% MRR) — Intel Portal
- **Lives in the separate `data-portal/` app**, not on shtepial.al — invite-only, no public link, robots disallow.
- Dashboard product (€199/mo) at `intel.shtepial.al/dashboard` — daily price-movement chart by city + sale/rent, plus metrics tiles. Built on Recharts.
- API product (€499/mo) at `intel.shtepial.al/api/v1/{trends,cities}` — API-key authed via the `api_keys` table (migration 0013, columns: `user_id`, `key_hash`, `scopes` JSONB, `is_active`).
- Access gated by `b2b_users` table (Supabase Auth user + invite-only B2B role row).
- Data layer: `market_snapshots` table written daily by Vercel Cron `0 2 * * *` → `GET /api/cron/market-snapshot` on `web/` (CRON_SECRET bearer-auth). Backfill via `npm run -w @shtepial/web backfill:snapshots`.
- City assignment: nearest-centroid haversine against 22-city `ALBANIAN_CITY_COORDS` (≤25km cap → null, otherwise national rollup only). Lives in `@repo/analytics`.

## Property Valuation (`/vleresimi`)
- Cadastral calculator at `web/src/app/vleresimi/` (`ValuationCalculator.tsx`, `page.tsx`, `error.tsx`)
- 3057 zones sourced from DevInfProna (`web/src/lib/valuation/devinf-data.json`)
- Engine: `web/src/lib/valuation/engine.ts`; zone queries: `queries.ts`; seed fallback: `seed.ts`; types: `types.ts`
- API: `GET /api/valuation/zones`, `POST /api/valuation/calculate`
- Graceful seed fallback when cadastral tables not yet migrated

## Key Patterns
- All UI text in Albanian. Error messages, labels, placeholders — all Albanian.
- `getDb()` returns null without DATABASE_URL — all query functions have seed fallback
- `dbRowToListing()` maps Drizzle camelCase → frontend snake_case Listing interface
- ImageGallery uses `<img>` (not next/image) for scraped URLs — lint warnings expected
- CSS `backdrop-filter` on header breaks `position: fixed` — use `createPortal` to escape
- Edge runtime: middleware.ts must not import bcrypt or heavy Node.js modules
- Brand palette: navy (#1B2A4A), cream (#FDF8F0), terracotta (#C75B39), gold (#D4A843), warm-gray (#8B8178)
- Design system source of truth: `web/design-system/MASTER.md`
- Sub-system architecture maps: `docs/codemaps/` — start here when picking up an unfamiliar slice of the platform
- Rate limiting: in-memory sliding-window in `web/src/lib/rate-limit.ts` — usage: `createRateLimiter({ limit: N, windowMs: N })`, then `limiter.check(ip)` returns `{ success }`
- CSRF protection: `web/src/lib/csrf.ts` validates Origin/Referer on all mutation endpoints
- Numeric query params: use `parseNumericParam()` from `web/src/lib/parse-numeric.ts` — never raw `Number()` on user input
- Exchange rates: configurable via `EUR_ALL_RATE` / `USD_EUR_RATE` env vars (default 100 / 0.92)
- Error boundaries: `error.tsx` files in `/`, `/listings`, `/dashboard`, `/admin`, `/pricing`, `/vleresimi`
- Listings route uses co-located private folders: `web/src/app/listings/_components/` and `_hooks/` — follow this pattern for new page-scoped code
- City lists: 22 canonical cities in `CITIES`, first 6 are `QUICK_CITIES` — never hardcode city arrays
- City coords: `web/src/lib/city-coords.ts` mirrors `scrapy_project/shtepi/city_coords.py` (source of truth)
- Neighborhoods: `getNeighborhoods(city)` query + `/api/listings/neighborhoods?city=` route (cached 5min)
- Map bbox filtering: `sw_lat/sw_lng/ne_lat/ne_lng` in ListingFilters, parsed with `parseNumericParam()`
- Geolocation: `useGeolocation` hook returns Albanian error messages, "Pranë meje" button in map mode
- Breadcrumbs: use `buildCityFilterHref(city)` from `slugs.ts` — generates `/listings?city=` not `/{slug}`
- Firefox Leaflet fix: `will-change: auto !important` on SVG + local marker icons in `web/public/leaflet/`
- Monetary values in billing tables stored as **integer cents** (not floats) — divide by 100 for display
- Supabase auth: `const supabase = await createClient()` — always await + null check

## Billing Patterns
- Stripe SDK: `getStripeServer()` from `web/src/lib/billing/stripe.ts` — returns null without STRIPE_SECRET_KEY
- Plan limits: `getAgencyPlanLimits(agencyId)` / `getUserPlanLimits(userId)` — cached 5min in-memory
- Limit checks: `checkListingLimit(agencyId)`, `checkLeadLimit(agencyId)` — Albanian error messages
- Plan gating: `requirePlan("growth", agencyId)` — throws `{ status: 403, message }` if insufficient
- Lead credits: `deductLeadCredit(agencyId)` — returns boolean
- Webhook: POST `/api/webhooks/stripe` — NO auth, NO CSRF (Stripe calls it), verify signature
- Free tier: 5 listings, 5 leads/mo, 0 featured cities, no CRM, basic analytics, 1 seat, 0 boost

## Ad System Patterns
- Ad serving: `getAdsForPlacement(ctx)` from `web/src/lib/ads/serve.ts`
- Max sponsored per page: search=3, homepage=1, city=2, sidebar=2, mobile=1, hero=1
- Frequency cap: LRU cache (1000 entries, 1h TTL) + DB fallback
- Impression tracking: `useAdTracking(placement)` hook batches + sendBeacon on unload
- Click tracking: fire-and-forget POST to `/api/ads/click`
- SponsoredBadge: gold star badge with `aria-label="Njoftim i sponsorizuar"`
- SponsoredListingCard: wraps ListingCard with IntersectionObserver (50% visible, 1s timer)

## Testing
- Vitest component tests need `// @vitest-environment jsdom` pragma
- Do NOT use `toBeInTheDocument()` — jest-dom not installed. Use `toBeTruthy()`, `getAttribute()`, etc.
- Python spider tests use HTML fixtures in `tests/fixtures/`
- Map component tests mock `leaflet` and `react-leaflet` modules
- Pipeline validation tests cover price bounds for sale/rent
- CSRF tests in `web/src/lib/__tests__/csrf.test.ts`
- Numeric param tests in `web/src/lib/__tests__/parse-numeric.test.ts`
- City sync tests in `web/src/lib/__tests__/city-sync.test.ts`
- Breadcrumb URL tests in `web/src/lib/seo/__tests__/breadcrumb-url.test.ts`
- Neighborhood query tests in `web/src/lib/db/__tests__/neighborhoods.test.ts`
- Bbox map filtering tests in `web/src/lib/db/__tests__/queries-bbox.test.ts`
- Geolocation hook tests in `web/src/hooks/__tests__/useGeolocation.test.ts` (jsdom)
- Billing gating tests in `web/src/lib/billing/__tests__/gating.test.ts`
- Ad frequency tests in `web/src/lib/ads/__tests__/frequency.test.ts`
- Lead scoring tests in `web/src/lib/leads/__tests__/scoring.test.ts`
- Fair price tests in `web/src/lib/pricing/__tests__/fair-price.test.ts`
- Mortgage calculator tests in `web/src/components/__tests__/MortgageCalculator.test.tsx`
- Sponsored badge tests in `web/src/components/__tests__/SponsoredBadge.test.tsx`
- Valuation engine tests in `web/src/lib/valuation/__tests__/engine.test.ts`
- Scrapy not installed in WSL env — `python3 -m pytest tests/test_normalizers.py` runs standalone

## Scraping
- 11 active spiders in daily CI (celesi blocked, homezone DNS down — both excluded)
- CLOSESPIDER_TIMEOUT=780 for graceful shutdown within 15min GitHub Actions limit
- Pipeline order: Validate (price bounds) → Normalize → Dedup → Store (PostgreSQL or SQLite)
- COALESCE guards prevent NULL coords from overwriting existing values
- `bool()` wrapper required for psycopg2 BOOLEAN columns
- city_coords.py is shared source of truth for 22 Albanian city coordinates
- `scripts/mark_stale.py` — deactivates listings unseen for 14 days (runs after daily scrape)
- `scripts/fix_price_outliers.py` — one-time cleanup for price outliers
- `scripts/backfill_geocode.py` — geocode existing listings missing coords
- `scripts/migrate-sqlite-to-pg.py` — one-time SQLite → Postgres migration helper
- `scripts/run_spiders.sh` — local helper to run all spiders
- `scripts/dedup/` — dedup tooling

## Database Schema
Core tables: `listings`, `profiles`, `agencies`, `favorites`, `listing_images`, `price_history`, `inquiries`

### Revenue model tables (migration 0008)
- `plans` — subscription plan definitions (7 seeded: 4 agency + buyer + 2 data)
- `subscriptions` — user/agency subscriptions with Stripe IDs and status
- `invoices` — Stripe invoice records
- `payment_methods` — stored payment methods

### Ad system tables (migration 0008)
- `ad_campaigns` — campaign config (type, bid, budget, targeting, dates)
- `ad_impressions` — high-volume append-only (bigserial PK for performance)
- `ad_clicks` — click records
- `lead_credits` — per-period lead allocation and usage

### Additional tables
- `developer_projects` — real estate projects (migration 0009)
- `partner_ads` — bank/insurance/notary partner placements (migration 0010)
- `price_alerts`, `saved_searches` — Buyer Plus features (migration 0011)
- `listing_refreshes` — auto-repost audit trail (migration 0012)
- `api_keys` — B2B API authentication (migration 0013)
- `market_snapshots` — daily aggregated price metrics keyed by `(snapshot_date, city, transaction_type, property_type)` with NULL = rollup (migration 0014). COALESCE-based unique index for idempotent upserts.
- `b2b_users` — invite-only access gate for the data-portal app (migration 0014)

### Schema extensions to existing tables
- `agencies`: added `stripe_customer_id`, `plan_id`, `subscription_status`
- `profiles`: added `stripe_customer_id`
- `inquiries`: added `inquiry_status`, `agency_id`, `inquiry_source`, `lead_score`, `notes`, `contacted_at`, `converted_at`
- `listings`: added `last_refreshed_at` (via migration 0012)

## Important File Paths

### Core
- Schema: `web/src/lib/db/schema.ts` (all tables — listings, profiles, agencies, plans, subscriptions, campaigns, etc.)
- Queries: `web/src/lib/db/queries.ts` is a barrel; real code lives in `web/src/lib/db/queries/{listings,favorites,agencies,admin,_utils}.ts` (listings has seed fallback, ranking boost; agencies uses LEFT JOIN)
- Types: `web/src/lib/types.ts` (Listing, Plan, Subscription, AdCampaign, DeveloperProject, etc.)
- Rate limit: `web/src/lib/rate-limit.ts` (createRateLimiter, getClientIp)
- CSRF: `web/src/lib/csrf.ts` (validateCsrf — add to all new mutation endpoints)
- Numeric parsing: `web/src/lib/parse-numeric.ts` (parseNumericParam — use for all query params)
- Constants: `web/src/lib/constants.ts` (CITIES — 22 entries, QUICK_CITIES — first 6, PROPERTY_TYPES)

### Billing
- Stripe client: `web/src/lib/billing/stripe.ts` (getStripeServer, getStripeClient)
- Plans: `web/src/lib/billing/plans.ts` (getPlans, getPlanBySlug, syncPlansToStripe)
- Subscriptions: `web/src/lib/billing/subscriptions.ts` (createCheckoutSession, cancelSubscription, getUsage)
- Invoices: `web/src/lib/billing/invoices.ts` (getInvoices)
- Gating: `web/src/lib/billing/gating.ts` (getPlanLimits, checkLimit, requirePlan, FREE_TIER)

### Ads
- Serving: `web/src/lib/ads/serve.ts` (getAdsForPlacement)
- Tracking: `web/src/lib/ads/track.ts` (recordImpression, recordClick, flushImpressions)
- Frequency: `web/src/lib/ads/frequency.ts` (checkFrequencyCap, LRU cache)

### Leads & Pricing
- Lead scoring: `web/src/lib/leads/scoring.ts` (calculateLeadScore, scoreInquiry)
- Fair price: `web/src/lib/pricing/fair-price.ts` (calculateFairPriceScore)
- Projects: `web/src/lib/db/projects.ts` (getProjects, getProjectBySlug, getFeaturedProjects)

### Market Intel (shared `@repo/analytics` workspace + `data-portal/` app)
- Geocoord → city: `packages/analytics/src/geocoords/nearest-city.ts` (`getCityFromCoords`, haversine, 25km cap)
- Snapshot compute: `packages/analytics/src/snapshots/compute.ts` (`computeSnapshotRows`, pure, facet rollups)
- Snapshot persist: `packages/analytics/src/snapshots/persist.ts` (`upsertSnapshotRows`, ON CONFLICT DO UPDATE)
- Daily wrapper: `packages/analytics/src/snapshots/daily.ts` (`writeDailySnapshot`)
- Backfill: `packages/analytics/src/snapshots/backfill.ts` (`backfillSnapshots`, walks `MIN(first_seen)` → today)
- Trends query: `packages/analytics/src/queries/trends.ts` (`getPriceTrends`)
- Overview query: `packages/analytics/src/queries/overview.ts` (`getMarketOverview`, moved from `web/`)
- Cron route: `web/src/app/api/cron/market-snapshot/route.ts`
- Backfill script: `web/scripts/backfill-market-snapshots.ts` (npm: `backfill:snapshots`)
- B2B middleware: `data-portal/src/middleware.ts` (Supabase session redirect to /login; `b2b_users` gate lives in `dashboard/page.tsx` because Postgres isn't available in Edge runtime). With src/app/ layout, middleware MUST live at `src/middleware.ts` — Next.js silently ignores it at the workspace root.
- B2B helpers: `data-portal/src/lib/{supabase/*,db.ts,b2b-user.ts,api-key-auth.ts}`
- Dashboard UI: `data-portal/src/app/dashboard/{page.tsx,DashboardControls.tsx,PriceChart.tsx}`

### SEO & Location
- SEO: `web/src/lib/seo/` (slugs — CITY_SLUGS + buildCityFilterHref, metadata, jsonld, constants)
- City coords: `web/src/lib/city-coords.ts` (ALBANIAN_CITY_COORDS — 22 cities, ALBANIA_CENTER, CITY_ZOOM)
- Geolocation: `web/src/hooks/useGeolocation.ts` (position, loading, error, locate)
- Ad tracking: `web/src/hooks/useAdTracking.ts` (trackImpression, trackClick)
- Map: `web/src/components/MapView.tsx` (BBox type, onBoundsChange, externalCenter props)

### Infrastructure
- Pipelines: `scrapy_project/shtepi/pipelines.py`
- Normalizers: `scrapy_project/shtepi/normalizers.py`
- CI: `.github/workflows/ci.yml`, `.github/workflows/scrape.yml`
- Migrations: `web/src/lib/db/migrations/` (001 + 0001–0014; gap at 0006)

## API Routes

### Public
- `GET /api/listings` — list with filters (cached s-maxage=30)
- `GET /api/listings/[id]` — single listing
- `GET /api/listings/map-pins` — lightweight geocoded pins
- `GET /api/listings/neighborhoods` — neighborhoods by city
- `GET /api/search` — full-text search
- `GET /api/stats` — global aggregations
- `GET /api/ads/serve` — get ads for placement (rate limited 100/min)
- `GET /api/projects` — developer projects with filters
- `GET /api/projects/[slug]` — project detail
- `GET /api/partners` — active partner ads by placement
- `GET /api/valuation/zones` — cadastral zone list (seed fallback)
- `POST /api/valuation/calculate` — compute valuation from zone + inputs

### Authenticated (require Supabase auth)
- `POST /api/listings` — create listing (rate limited 10/hr, CSRF)
- `PATCH /api/listings/[id]` — update listing (CSRF)
- `POST /api/listings/[id]/refresh` — manual refresh (Premium+, CSRF)
- `POST /api/favorites` — toggle favorite (rate limited 60/hr)
- `GET /api/favorites` — user's favorites
- `POST /api/inquiries` — submit inquiry (rate limited 5/hr, CSRF)
- `GET/POST /api/alerts` — price alerts (Buyer Plus)
- `GET/POST /api/saved-searches` — saved searches (free: 3 max, Buyer Plus: unlimited)
- `GET /api/leads` — agency's leads
- `PATCH /api/leads/[id]` — update lead status/notes (CSRF)
- `GET /api/leads/export` — CSV export (Growth+ plan)
- `GET/POST /api/campaigns` — ad campaigns (Growth+ plan)
- `PATCH /api/campaigns/[id]` — pause/resume campaign
- `POST /api/billing/checkout` — create Stripe checkout session
- `POST /api/billing/portal` — Stripe customer portal redirect
- `GET /api/billing/subscription` — current subscription + usage
- `POST /api/billing/cancel` — cancel at period end (CSRF)

### Admin (require admin/moderator role)
- `GET /api/admin/stats` — pending count, user count
- `GET/PATCH /api/admin/listings` — moderate pending listings
- `GET/POST /api/admin/plans` — plan CRUD
- `PATCH /api/admin/plans/[id]` — update plan
- `GET /api/admin/subscriptions` — subscription overview
- `GET /api/admin/revenue` — MRR, churn, LTV metrics
- `POST /api/admin/coupons` — coupon management
- `POST /api/projects` — create project (admin)
- `POST /api/partners` — create partner ad (admin)

### Webhook (NO auth, NO CSRF — external caller)
- `POST /api/webhooks/stripe` — Stripe webhook (signature verified)

### Cron (CRON_SECRET bearer-auth, no CSRF)
- `GET /api/cron/market-snapshot` — writes today's `market_snapshots` rows (Vercel Cron `0 2 * * *`)

### `data-portal/` app routes (separate Vercel project, B2B only)
- `/login` — Supabase email+password (no signup)
- `/dashboard` — server component; reads `getPriceTrends` + `getMarketOverview` from `@repo/analytics`. Middleware gated by `b2b_users`.
- `GET /api/v1/trends?city=…&transaction_type=sale|rent&days=1..730` — API-key authed
- `GET /api/v1/cities` — API-key authed

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` — Supabase anon key
- `NEXT_PUBLIC_SITE_URL` — Site URL (default: https://shtepial.al)
- `RESEND_API_KEY` — Resend email service
- `RESEND_FROM_ADDRESS` — Sender email
- `EUR_ALL_RATE` — EUR to ALL exchange rate (default 100)
- `USD_EUR_RATE` — USD to EUR rate (default 0.92)
- `STRIPE_SECRET_KEY` — Stripe server-side secret key (required for billing)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe client-side public key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret

## Auth
- Supabase Auth with Google OAuth (configured on `korydqayxwxivgkhlgzw.supabase.co`)
- Admin role check: API routes use `verifyAdmin()` (checks profiles.role), admin page detects 403
- Protected routes (middleware): `/dashboard`, `/listings/new`, `/listings/edit`, `/admin`
- All new mutation endpoints must include: `validateCsrf()`, rate limiter, auth check
- Billing plan checks: use `requirePlan()` from `web/src/lib/billing/gating.ts`
