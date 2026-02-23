# ShtëpiAL

Albanian real estate aggregator and listing platform. Scrapy spiders collect listings from major Albanian property sites, while users can register and post their own listings. Built with Next.js 14, Supabase PostgreSQL, and Drizzle ORM.

**Live:** [shtepi-al.vercel.app](https://shtepi-al.vercel.app)
**Project Board:** [Production Readiness](https://github.com/users/phoebusdev/projects/3)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Scrapy Spiders (Python)                                    │
│  merrjep · mirlir · njoftime · duashpi · celesi*            │
│                                                             │
│  Pipeline: Validate → Normalize → Dedup → Store             │
│            (Albanian-aware parsing: cities, prices, rooms)   │
└───────────────────────┬─────────────────────────────────────┘
                        │ PostgreSQLPipeline (batch upsert)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL                                            │
│  Drizzle ORM schema: listings, users, accounts, agencies    │
│  Full-text search: tsvector + GIN index                     │
│  Partial unique index: (source, source_id) for dedup        │
└───────────────────────┬─────────────────────────────────────┘
                        │ Drizzle ORM (postgres-js driver)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js 14 App Router (TypeScript)                         │
│  NextAuth v5 (JWT, email/password + Google OAuth)           │
│  Vercel Blob (user image uploads)                           │
│  Tailwind CSS · Leaflet maps · Zod validation               │
│  Deployed on Vercel                                         │
└─────────────────────────────────────────────────────────────┘

* celesi blocked by Cloudflare — needs Playwright integration
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Leaflet, DM Sans + Playfair Display |
| Database | Supabase PostgreSQL (prod), JSON seed fallback (dev) |
| ORM | Drizzle ORM with postgres-js driver |
| Auth | NextAuth v5 (JWT strategy, Credentials + Google) |
| Image Storage | Vercel Blob (user uploads), raw URLs (scraped) |
| Scraping | Scrapy 2.11, Python 3.12 |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- A Supabase PostgreSQL database (or run locally with seed data)

### Web App

```bash
cd web
npm install
cp .env.example .env.local  # Edit with your credentials
npm run dev                  # http://localhost:3000
```

The app works without `DATABASE_URL` — it falls back to `data/seed-listings.json` (91 real listings from 5 sources).

### Scrapy Spiders

```bash
cd scrapy_project
pip install -r requirements.txt

# Single spider (SQLite by default):
scrapy crawl merrjep

# Single spider to PostgreSQL:
DATABASE_URL=postgresql://... scrapy crawl merrjep

# All production spiders:
DATABASE_URL=postgresql://... ../scripts/run_spiders.sh
```

### Running Tests

```bash
# Python spider tests
cd scrapy_project
python -m pytest tests/ -q   # 377 tests

# Web frontend tests
cd web
npx vitest run               # 55 tests
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No* | Supabase PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | App URL (`http://localhost:3000` for dev) |
| `NEXTAUTH_SECRET` | Yes | Random 32-char secret for session signing |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `BLOB_READ_WRITE_TOKEN` | No | Vercel Blob token for image uploads |

*Without `DATABASE_URL`, the app uses JSON seed data (read-only).

## Spiders

| Spider | Domain | Status | Listings | Notes |
|--------|--------|--------|----------|-------|
| merrjep | merrjep.al | Production | ~20 | Largest Albanian classifieds |
| mirlir | mirlir.com | Production | ~20 | Real estate focused |
| njoftime | njoftime.com | Production | ~15 | XenForo forum format |
| duashpi | duashpi.al | Production | ~18 | Dedicated RE marketplace |
| celesi | gazetacelesi.al | Blocked | ~18 | Cloudflare blocks Scrapy — needs Playwright |

### Pipeline Chain

```
Spider yields item → ValidationPipeline (drop if missing required fields)
                   → NormalizationPipeline (city, price, room config, features)
                   → DedupPipeline (in-memory batch dedup)
                   → PostgreSQLPipeline (batch upsert, buffer=50)
                     or SQLitePipeline (local dev)
```

Pipeline selection is automatic: `DATABASE_URL` set → PostgreSQL, otherwise SQLite.

### Albanian-Specific Parsing

- **Room configs:** "2+1" = 2 bedrooms + 1 living room. "garsoniere" = studio
- **Prices:** Tirana listings typically EUR, rural/rent often ALL. `EUR_ALL_RATE = 100`
- **Cities:** Normalized with diacritics (ë, ç). Lowercase lookup table
- **Features:** Extracted from description text (elevator, parking, furnished, new build)

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/listings` | No | Filtered listings with pagination |
| GET | `/api/listings/map-pins` | No | All geocoded listings for map (no pagination) |
| POST | `/api/listings` | Yes | Create a new user listing |
| PUT | `/api/listings/[id]` | Yes | Update own listing |
| DELETE | `/api/listings/[id]` | Yes | Soft-delete own listing |
| GET | `/api/listings/my` | Yes | Get user's own listings |
| GET | `/api/search?q=...` | No | Full-text search (tsvector) |
| GET | `/api/stats` | No | Aggregate statistics |
| POST | `/api/auth/register` | No | Register with email/password |
| GET/PUT | `/api/user/profile` | Yes | Get/update profile |
| POST | `/api/upload` | Yes | Upload image to Vercel Blob |

## Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/` | No | Homepage with search, quick filters, recent listings |
| `/listings` | No | Browse with filters, sort, grid/map toggle |
| `/listings/[city]/[slug]` | No | Listing detail with gallery, specs, map, contact |
| `/[city]` | No | City-specific listings page |
| `/auth/signin` | No | Sign in (email + Google) |
| `/auth/register` | No | Create account |
| `/dashboard` | Yes | User's posted listings |
| `/listings/new` | Yes | Post a new listing |
| `/listings/edit/[id]` | Yes | Edit own listing |

### Special App Router Files

| File | Purpose |
|------|---------|
| `app/icon.tsx` | Dynamic favicon (navy bg, gold "S") via ImageResponse |
| `app/apple-icon.tsx` | Apple touch icon (180x180) |
| `app/manifest.ts` | PWA manifest with Albanian metadata |
| `app/loading.tsx` | Root loading skeleton |
| `app/listings/loading.tsx` | Listings grid skeleton (6 cards) |
| `app/listings/[city]/[slug]/loading.tsx` | Detail page skeleton |
| `app/dashboard/loading.tsx` | Dashboard skeleton |
| `app/not-found.tsx` | Albanian 404 page ("Faqja nuk u gjet") |
| `app/error.tsx` | Albanian 500 page ("Diçka shkoi keq") with retry |
| `app/robots.ts` | robots.txt generation |
| `app/sitemap.ts` | XML sitemap generation |
| `app/opengraph-image/route.tsx` | Dynamic OG image |

## Database Schema

Core tables (Drizzle ORM, defined in `web/src/lib/db/schema.ts`):

- **listings** — 36+ columns: price, city, property_type, images (JSONB), origin (scraped/user), status lifecycle, metadata (JSONB)
- **users** — NextAuth-compatible with role enum (user, agent, agency_admin, moderator, admin)
- **accounts** / **sessions** / **verification_tokens** — NextAuth OAuth & sessions
- **agencies** — Future: agency profiles
- **listing_images** — Future: user-uploaded image metadata
- **favorites** — Future: saved listings

Key constraints:
- Partial unique index on `(source, source_id) WHERE source IS NOT NULL` — dedup for scraped only
- Listing `origin` enum: `scraped` | `user`
- Listing `status` enum: `draft` → `pending` → `active` → `rejected` → `expired` → `archived`

## Project Structure

```
shtepi-al/
├── .claude/
│   └── commands/
│       └── crawl.md             # /crawl skill for running spiders
├── scrapy_project/
│   ├── shtepi/
│   │   ├── spiders/             # 5 spiders (merrjep, celesi, mirlir, njoftime, duashpi)
│   │   ├── pipelines.py         # Validate → Normalize → Dedup → Store
│   │   ├── normalizers.py       # Albanian-aware parsing
│   │   └── settings.py          # Conditional pipeline (PostgreSQL/SQLite)
│   └── tests/
│       ├── fixtures/            # HTML fixtures for each spider
│       ├── test_normalizers.py  # Normalizer unit tests
│       └── test_spider_*.py     # Spider-specific tests (377 total)
├── web/
│   ├── data/
│   │   └── seed-listings.json   # 91 real listings (fallback without DB)
│   ├── design-system/
│   │   └── MASTER.md            # Design system: colors, typography, components, a11y
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/             # 11 API route files
│   │   │   ├── auth/            # signin, register pages
│   │   │   ├── dashboard/       # user dashboard + loading.tsx skeleton
│   │   │   ├── listings/        # browse, detail, new, edit + loading.tsx skeletons
│   │   │   ├── icon.tsx         # dynamic favicon (ImageResponse)
│   │   │   ├── apple-icon.tsx   # Apple touch icon
│   │   │   ├── manifest.ts     # PWA manifest
│   │   │   ├── not-found.tsx    # Albanian 404 page
│   │   │   ├── error.tsx        # Albanian 500 page with retry
│   │   │   ├── loading.tsx      # root loading skeleton
│   │   │   ├── robots.ts       # robots.txt
│   │   │   ├── sitemap.ts      # XML sitemap
│   │   │   ├── opengraph-image/ # dynamic OG image
│   │   │   ├── layout.tsx       # root layout with nav + SessionProvider
│   │   │   ├── globals.css      # custom properties, shimmer, animations, a11y
│   │   │   └── page.tsx         # homepage
│   │   ├── components/
│   │   │   ├── AuthButton.tsx   # header auth toggle
│   │   │   ├── DesktopNav.tsx   # desktop nav with active link highlighting
│   │   │   ├── DetailMap.tsx    # single-listing Leaflet map
│   │   │   ├── FilterSidebar.tsx# mobile drawer + desktop aside (scroll lock, escape key)
│   │   │   ├── ImageGallery.tsx # listing image carousel
│   │   │   ├── ImageUploader.tsx# drag-drop upload
│   │   │   ├── JsonLd.tsx       # structured data component
│   │   │   ├── ListingCard.tsx  # listing card with brand-aligned source badges
│   │   │   ├── ListingForm.tsx  # create/edit form
│   │   │   ├── MapPinPicker.tsx # map pin selector for listing forms
│   │   │   ├── MapView.tsx      # Leaflet map with clustering
│   │   │   ├── MobileMenu.tsx   # portal-based mobile drawer (escapes backdrop-filter)
│   │   │   ├── NavLink.tsx      # active link detection via pathname + search params
│   │   │   ├── Providers.tsx    # SessionProvider wrapper
│   │   │   ├── SearchBar.tsx
│   │   │   └── ShareButton.tsx
│   │   ├── components/icons/
│   │   │   └── ChevronIcon.tsx  # shared SVG icon
│   │   ├── hooks/
│   │   │   ├── useBodyScrollLock.ts # iOS Safari compatible body scroll lock
│   │   │   └── useEscapeKey.ts      # escape key handler with enabled gate
│   │   ├── lib/
│   │   │   ├── auth.ts          # NextAuth config (Node.js, bcrypt)
│   │   │   ├── auth.config.ts   # Edge-safe auth (middleware)
│   │   │   ├── city-coords.ts   # Albanian city coordinates
│   │   │   ├── cn.ts            # cn() utility (clsx + twMerge)
│   │   │   ├── constants.ts     # CITIES, PROPERTY_TYPES, QUICK_CITIES
│   │   │   ├── types.ts         # TypeScript interfaces
│   │   │   ├── validators.ts    # Zod schemas
│   │   │   ├── seo/             # SEO utilities: slugs, metadata, jsonld, constants
│   │   │   ├── supabase/        # Supabase client (browser) + server helpers
│   │   │   └── db/
│   │   │       ├── schema.ts    # Drizzle schema (all tables)
│   │   │       ├── drizzle.ts   # Supabase PostgreSQL connection
│   │   │       ├── queries.ts   # DB query functions + seed fallback
│   │   │       ├── seed.ts      # JSON seed data loader
│   │   │       └── migrations/  # FTS migration SQL
│   │   ├── middleware.ts        # route protection
│   │   └── types/
│   │       └── next-auth.d.ts   # NextAuth type augmentation
│   ├── drizzle.config.ts
│   ├── next.config.mjs
│   └── package.json
├── scripts/
│   ├── run_spiders.sh           # Run all production spiders
│   ├── backfill_geocode.py      # One-time geocode backfill (Nominatim + city fallback)
│   └── migrate-sqlite-to-pg.py  # One-time SQLite → PostgreSQL migration
├── db/
│   └── schema.sql               # SQLite schema (local dev reference)
├── docs/
│   ├── shtepial-prd.md          # Product requirements document
│   ├── plans/                   # Design + implementation plan docs
│   └── screenshots/             # UI screenshots
└── README.md
```

## What's Done

- 5 Scrapy spiders built and tested (377 Python tests + 55 web tests passing)
- Full pipeline chain with Albanian-aware normalization
- PostgreSQLPipeline with batch upsert and boolean casting
- Supabase PostgreSQL schema deployed via Drizzle
- Full-text search (tsvector + GIN index)
- NextAuth v5 with email/password registration
- User listing CRUD (create, edit, delete with image upload)
- Dashboard for managing user listings
- Responsive frontend with search, filters, grid/map toggle
- Map view with clustered markers for ALL geocoded listings
- Navigation active states (desktop + mobile), mobile menu with portal rendering
- SEO: structured data (JSON-LD), meta tags, OG images, sitemap, city/listing slugs
- Geocode backfill pipeline (Nominatim + city-center fallback)
- Daily automated scrape via GitHub Actions (parallelized, one job per spider)
- JSON seed fallback (works without database)
- Deployed on Vercel with all env vars configured
- Design system documented (MASTER.md) with brand palette, typography, component patterns
- Dynamic favicon + Apple touch icon via Next.js ImageResponse
- PWA manifest with Albanian metadata
- Loading skeletons for all major routes (root, listings, detail, dashboard)
- Custom error pages in Albanian (404 "Faqja nuk u gjet", 500 "Diçka shkoi keq")
- UI consistency: brand-aligned source badges, cursor-pointer on filters, brand hover states

## Design System

See [`web/design-system/MASTER.md`](web/design-system/MASTER.md) for the full reference. Key tokens:

| Token | Hex | Role |
|-------|-----|------|
| Navy | `#1B2A4A` | Headings, header bg, primary text |
| Cream | `#FDF8F0` | Page background |
| Terracotta | `#C75B39` | CTAs, focus rings, active states |
| Gold | `#D4A843` | Brand accent, logo highlight |
| Warm Gray | `#8B8178` | Secondary text, metadata |

Typography: **Playfair Display** (headings) + **DM Sans** (body).

## What's Missing (Production Blockers)

See the [project board](https://github.com/users/phoebusdev/projects/3) for full tracking.

| Issue | Area | Description |
|-------|------|-------------|
| [#5](https://github.com/phoebusdev/shtepi-al/issues/5) | Scraping | Run initial production scrape to populate Supabase DB |
| [#9](https://github.com/phoebusdev/shtepi-al/issues/9) | Auth | Google OAuth credentials |
| [#10](https://github.com/phoebusdev/shtepi-al/issues/10) | Auth | Rate limiting on auth endpoints |
| [#16](https://github.com/phoebusdev/shtepi-al/issues/16) | Infra | Custom domain |
| [#17](https://github.com/phoebusdev/shtepi-al/issues/17) | Infra | CI/CD pipeline |
