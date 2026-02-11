# ShtëpiAL

Albanian real estate aggregator and listing platform. Scrapy spiders collect listings from major Albanian property sites, while users can register and post their own listings. Built with Next.js 14, Neon PostgreSQL, and Drizzle ORM.

**Live:** [web-sigma-six-65.vercel.app](https://web-sigma-six-65.vercel.app)
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
│  Neon PostgreSQL                                            │
│  Drizzle ORM schema: listings, users, accounts, agencies    │
│  Full-text search: tsvector + GIN index                     │
│  Partial unique index: (source, source_id) for dedup        │
└───────────────────────┬─────────────────────────────────────┘
                        │ @neondatabase/serverless (HTTP)
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
| Frontend | Next.js 14, React 18, Tailwind CSS, Leaflet |
| Database | Neon PostgreSQL (prod), JSON seed fallback (dev) |
| ORM | Drizzle ORM with Neon HTTP driver |
| Auth | NextAuth v5 (JWT strategy, Credentials + Google) |
| Image Storage | Vercel Blob (user uploads), raw URLs (scraped) |
| Scraping | Scrapy 2.11, Python 3.12 |
| Deployment | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- A Neon PostgreSQL database (or run locally with seed data)

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
cd scrapy_project
python -m pytest tests/ -q   # 352 tests
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | No* | Neon PostgreSQL connection string |
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
| `/listings/[id]` | No | Listing detail with gallery, specs, contact |
| `/auth/signin` | No | Sign in (email + Google) |
| `/auth/register` | No | Create account |
| `/dashboard` | Yes | User's posted listings |
| `/listings/new` | Yes | Post a new listing |
| `/listings/edit/[id]` | Yes | Edit own listing |

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
│       └── test_spider_*.py     # Spider-specific tests (352 total)
├── web/
│   ├── data/
│   │   └── seed-listings.json   # 91 real listings (fallback without DB)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/             # 10 API route files
│   │   │   ├── auth/            # signin, register pages
│   │   │   ├── dashboard/       # user dashboard
│   │   │   ├── listings/        # browse, detail, new, edit
│   │   │   ├── layout.tsx       # root layout with nav + SessionProvider
│   │   │   └── page.tsx         # homepage
│   │   ├── components/
│   │   │   ├── AuthButton.tsx   # header auth toggle
│   │   │   ├── FilterSidebar.tsx
│   │   │   ├── ImageGallery.tsx # listing image carousel
│   │   │   ├── ImageUploader.tsx# drag-drop upload
│   │   │   ├── ListingCard.tsx
│   │   │   ├── ListingForm.tsx  # create/edit form
│   │   │   ├── MapView.tsx      # Leaflet map
│   │   │   ├── MobileMenu.tsx
│   │   │   ├── Providers.tsx    # SessionProvider wrapper
│   │   │   ├── SearchBar.tsx
│   │   │   └── ShareButton.tsx
│   │   ├── lib/
│   │   │   ├── auth.ts          # NextAuth config (Node.js, bcrypt)
│   │   │   ├── auth.config.ts   # Edge-safe auth (middleware)
│   │   │   ├── city-coords.ts   # Albanian city coordinates
│   │   │   ├── types.ts         # TypeScript interfaces
│   │   │   ├── validators.ts    # Zod schemas
│   │   │   └── db/
│   │   │       ├── schema.ts    # Drizzle schema (all tables)
│   │   │       ├── drizzle.ts   # Neon HTTP connection
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
│   └── migrate-sqlite-to-pg.py  # One-time SQLite → Neon migration
├── docker/
│   └── scrapy.Dockerfile
├── docker-compose.yml
├── db/
│   ├── schema.sql               # SQLite schema (local dev)
│   └── shtepi.db                # SQLite database (local dev)
└── README.md
```

## What's Done

- 5 Scrapy spiders built and tested (352 tests passing)
- Full pipeline chain with Albanian-aware normalization
- PostgreSQLPipeline with batch upsert and boolean casting
- Neon PostgreSQL schema deployed via Drizzle
- Full-text search (tsvector + GIN index)
- NextAuth v5 with email/password registration
- User listing CRUD (create, edit, delete with image upload)
- Dashboard for managing user listings
- Responsive frontend with search, filters, map view
- JSON seed fallback (works without database)
- Deployed on Vercel with all env vars configured

## What's Missing (Production Blockers)

See the [project board](https://github.com/users/phoebusdev/projects/3) for full tracking.

| Issue | Area | Description |
|-------|------|-------------|
| [#5](https://github.com/phoebusdev/shtepi-al/issues/5) | Scraping | Run initial production scrape to populate Neon DB |
| [#6](https://github.com/phoebusdev/shtepi-al/issues/6) | Scraping | Scheduled scraping (cron / GitHub Actions) |
| [#9](https://github.com/phoebusdev/shtepi-al/issues/9) | Auth | Google OAuth credentials |
| [#10](https://github.com/phoebusdev/shtepi-al/issues/10) | Auth | Rate limiting on auth endpoints |
| [#12](https://github.com/phoebusdev/shtepi-al/issues/12) | Frontend | SEO: meta tags, OG, sitemap |
| [#15](https://github.com/phoebusdev/shtepi-al/issues/15) | Frontend | Favicon and branding |
| [#16](https://github.com/phoebusdev/shtepi-al/issues/16) | Infra | Custom domain |
| [#17](https://github.com/phoebusdev/shtepi-al/issues/17) | Infra | CI/CD pipeline |
