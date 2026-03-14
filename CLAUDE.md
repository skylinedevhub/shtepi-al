# ShtëpiAL Project Guide

## Quick Start
- `cd web && npm run dev` — Next.js frontend (localhost:3000)
- `cd scrapy_project && scrapy crawl <spider>` — Run a spider locally
- `cd web && npx vitest run` — Run 73 frontend tests (15 files)
- `cd scrapy_project && python -m pytest` — Run 690 Python tests
- Git root is `/shtepi-al/`, web CWD is `/shtepi-al/web/` — use absolute paths for git commands

## Architecture
- **Monorepo:** web/ (Next.js 14), scrapy_project/ (Scrapy), scripts/, social/ (Remotion)
- **DB:** Supabase PostgreSQL (prod), seed JSON fallback (no DB). Drizzle ORM.
- **Auth:** Supabase Auth (server/client split for edge compatibility)
- **Deploy:** Vercel auto-deploy from `main`. Works without DB via seed fallback.
- **Images:** `<img>` for scraped URLs (13 CDN domains), Vercel Blob for user uploads

## Key Patterns
- All UI text in Albanian. Error messages, labels, placeholders — all Albanian.
- `getDb()` returns null without DATABASE_URL — all query functions have seed fallback
- `dbRowToListing()` maps Drizzle camelCase → frontend snake_case Listing interface
- ImageGallery uses `<img>` (not next/image) for scraped URLs — lint warnings expected
- CSS `backdrop-filter` on header breaks `position: fixed` — use `createPortal` to escape
- Edge runtime: middleware.ts must not import bcrypt or heavy Node.js modules
- Brand palette: navy (#1B2A4A), cream (#FDF8F0), terracotta (#C75B39), gold (#D4A843), warm-gray (#8B8178)
- Design system source of truth: `web/design-system/MASTER.md`

## Testing
- TypeScript errors in `seo/__tests__/jsonld.test.ts` are pre-existing (runtime passes)
- Vitest component tests need `// @vitest-environment jsdom` pragma
- Python spider tests use HTML fixtures in `tests/fixtures/`
- Map component tests mock `leaflet` and `react-leaflet` modules

## Scraping
- 13 spiders, matrix CI strategy (one job per spider, 15min timeout)
- Pipeline order: Validate → Normalize → Dedup → Store (PostgreSQL or SQLite)
- COALESCE guards prevent NULL coords from overwriting existing values
- `bool()` wrapper required for psycopg2 BOOLEAN columns
- city_coords.py is shared source of truth for 22 Albanian city coordinates

## Important File Paths
- Schema: `web/src/lib/db/schema.ts` (listings, profiles, agencies, favorites)
- Queries: `web/src/lib/db/queries.ts` (all with seed fallback)
- Types: `web/src/lib/types.ts` (Listing, MapPin, Stats, ListingFilters)
- SEO: `web/src/lib/seo/` (slugs, metadata, jsonld, constants)
- Pipelines: `scrapy_project/shtepi/pipelines.py`
- Normalizers: `scrapy_project/shtepi/normalizers.py`
