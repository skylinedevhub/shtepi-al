# ShtëpiAL Project Guide

## Quick Start
- `cd web && npm run dev` — Next.js frontend (localhost:3000)
- `cd scrapy_project && scrapy crawl <spider>` — Run a spider locally
- `cd web && npx vitest run` — Run 124 frontend tests (24 files)
- `cd scrapy_project && python -m pytest` — Run 701 Python tests
- Git root is `/shtepi-al/`, web CWD is `/shtepi-al/web/` — use absolute paths for git commands

## Architecture
- **Monorepo:** web/ (Next.js 14), scrapy_project/ (Scrapy), scripts/, social/ (Remotion)
- **DB:** Supabase PostgreSQL (prod), seed JSON fallback (no DB). Drizzle ORM.
- **Auth:** Supabase Auth (server/client split for edge compatibility)
- **Deploy:** Vercel auto-deploy from `main`. Works without DB via seed fallback.
- **Images:** `<img>` for scraped URLs (13 CDN domains), Vercel Blob for user uploads
- **CI:** `.github/workflows/ci.yml` (TypeScript + Vitest + pytest), `scrape.yml` (daily scrape + mark-stale)

## Key Patterns
- All UI text in Albanian. Error messages, labels, placeholders — all Albanian.
- `getDb()` returns null without DATABASE_URL — all query functions have seed fallback
- `dbRowToListing()` maps Drizzle camelCase → frontend snake_case Listing interface
- ImageGallery uses `<img>` (not next/image) for scraped URLs — lint warnings expected
- CSS `backdrop-filter` on header breaks `position: fixed` — use `createPortal` to escape
- Edge runtime: middleware.ts must not import bcrypt or heavy Node.js modules
- Brand palette: navy (#1B2A4A), cream (#FDF8F0), terracotta (#C75B39), gold (#D4A843), warm-gray (#8B8178)
- Design system source of truth: `web/design-system/MASTER.md`
- Rate limiting: in-memory sliding-window in `web/src/lib/rate-limit.ts` (register 5/hr, upload 50/hr, listing create 10/hr, update 30/hr, favorites 60/hr, profile 20/hr)
- CSRF protection: `web/src/lib/csrf.ts` validates Origin/Referer on all mutation endpoints
- Numeric query params: use `parseNumericParam()` from `web/src/lib/parse-numeric.ts` — never raw `Number()` on user input
- Exchange rates: configurable via `EUR_ALL_RATE` / `USD_EUR_RATE` env vars (default 100 / 0.92)
- Error boundaries: `error.tsx` files in `/`, `/listings`, `/dashboard`, `/admin`
- City lists: use `QUICK_CITIES` from `web/src/lib/constants.ts` — never hardcode city arrays
- Firefox Leaflet fix: `will-change: auto !important` on SVG + local marker icons in `web/public/leaflet/`

## Testing
- Vitest component tests need `// @vitest-environment jsdom` pragma
- Python spider tests use HTML fixtures in `tests/fixtures/`
- Map component tests mock `leaflet` and `react-leaflet` modules
- Pipeline validation tests cover price bounds for sale/rent
- CSRF tests in `web/src/lib/__tests__/csrf.test.ts` — test origin/referer validation
- Numeric param tests in `web/src/lib/__tests__/parse-numeric.test.ts`
- Scrapy not installed in WSL env — `python3 -m pytest tests/test_normalizers.py` runs standalone

## Scraping
- 11 active spiders in daily CI (celesi blocked, homezone DNS down — both excluded)
- CLOSESPIDER_TIMEOUT=780 for graceful shutdown within 15min GitHub Actions limit
- Pipeline order: Validate (price bounds) → Normalize → Dedup → Store (PostgreSQL or SQLite)
- COALESCE guards prevent NULL coords from overwriting existing values
- `bool()` wrapper required for psycopg2 BOOLEAN columns
- city_coords.py is shared source of truth for 22 Albanian city coordinates
- `scripts/mark_stale.py` deactivates listings unseen for 14 days (runs after daily scrape)
- `scripts/fix_price_outliers.py` one-time cleanup for price outliers

## Important File Paths
- Schema: `web/src/lib/db/schema.ts` (listings, profiles, agencies, favorites)
- Queries: `web/src/lib/db/queries.ts` (all with seed fallback, agencies use LEFT JOIN GROUP BY)
- Types: `web/src/lib/types.ts` (Listing, MapPin, Stats, ListingFilters)
- Rate limit: `web/src/lib/rate-limit.ts` (createRateLimiter, getClientIp)
- CSRF: `web/src/lib/csrf.ts` (validateCsrf — add to all new mutation endpoints)
- Numeric parsing: `web/src/lib/parse-numeric.ts` (parseNumericParam — use for all query params)
- Constants: `web/src/lib/constants.ts` (CITIES, QUICK_CITIES, PROPERTY_TYPES)
- SEO: `web/src/lib/seo/` (slugs, metadata, jsonld, constants)
- Pipelines: `scrapy_project/shtepi/pipelines.py`
- Normalizers: `scrapy_project/shtepi/normalizers.py`
- CI: `.github/workflows/ci.yml`, `.github/workflows/scrape.yml`

## Auth
- Supabase Auth with Google OAuth (configured on `korydqayxwxivgkhlgzw.supabase.co`)
- Admin role check: API routes use `verifyAdmin()` (checks profiles.role), admin page detects 403
- Protected routes (middleware): `/dashboard`, `/listings/new`, `/listings/edit`, `/admin`
- All new mutation endpoints must include: `validateCsrf()`, rate limiter, auth check
