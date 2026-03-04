# ShtëpiAL

Albanian real estate aggregator and listing platform. 13 Scrapy spiders collect listings from every major Albanian property portal, while users can register and post their own listings. Built with Next.js 14, Supabase PostgreSQL, and Drizzle ORM.

**Live:** [shtepi-al.vercel.app](https://shtepi-al.vercel.app)
**Project Board:** [Production Readiness](https://github.com/users/phoebusdev/projects/3)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Scrapy Spiders (Python) — 13 sources                       │
│  merrjep · mirlir · njoftime · duashpi · celesi*            │
│  shpi · indomio · century21 · realestate · propertyhub      │
│  kerko360 · homezone† · futurehome                          │
│                                                             │
│  Pipeline: Validate → Normalize → Dedup → Store             │
│            (Albanian-aware parsing: cities, prices, rooms)   │
└───────────────────────┬─────────────────────────────────────┘
                        │ PostgreSQLPipeline (batch upsert)
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Supabase PostgreSQL                                        │
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
† homezone.al DNS currently down
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Leaflet, DM Sans + Playfair Display |
| Database | Supabase PostgreSQL (prod), JSON seed fallback (dev) |
| ORM | Drizzle ORM with postgres-js driver |
| Auth | NextAuth v5 (JWT strategy, Credentials + Google) |
| Image Storage | Vercel Blob (user uploads), raw URLs (scraped) |
| Scraping | Scrapy 2.14, Python 3.12+ |
| Deployment | Vercel |
| CI/CD | GitHub Actions (daily scrape + seed scrape workflows) |

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
python -m pytest tests/ -q   # 690 tests

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

| Spider | Domain | Status | Notes |
|--------|--------|--------|-------|
| merrjep | merrjep.al | Production | Largest Albanian classifieds |
| mirlir | mirlir.com | Production | Real estate focused |
| njoftime | njoftime.com | Production | XenForo forum format |
| duashpi | duashpi.al | Production | Dedicated RE marketplace |
| celesi | gazetacelesi.al | Blocked | Cloudflare blocks Scrapy |
| shpi | shpi.al | Production | Rich structured fields (ref#, orientation, year built) |
| indomio | indomio.al | Production | Spitogatos network aggregator |
| century21 | century21albania.com | Production | BSP CRM, largest franchise |
| realestate | realestate.al | Production | Single agency, SEO URLs |
| propertyhub | propertyhub.al | Production | WordPress WPEstate theme |
| kerko360 | kerko360.al | Production | Search-focused portal |
| homezone | homezone.al | DNS Down | Site currently unreachable |
| futurehome | futurehome.al | Production | 250+ agents, 30+ offices, BSP CRM |

### Image CDN Domains

| Spider(s) | Image Host |
|-----------|-----------|
| merrjep | media.merrjep.al |
| mirlir | media.mirlir.com |
| njoftime | www.njoftime.com |
| duashpi | duashpi.al, d1ia6vt0h4qxok.cloudfront.net |
| shpi | cdn.shpi.al, shpi.al |
| century21, futurehome | crm-cdn.ams3.cdn.digitaloceanspaces.com |
| indomio | m{1,2,3}.spitogatos.gr |
| kerko360 | kerko360.al/storage/media/ |
| propertyhub | propertyhub.al/wp-content/uploads/ |
| realestate | realestate.al/thumbs/ |

### Pipeline Chain

```
Spider yields item → ValidationPipeline (drop if missing required fields or images)
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

## CI/CD

### Daily Scrape (`scrape.yml`)
- Runs at 03:00 UTC daily (+ manual trigger)
- Matrix strategy: one parallel job per spider (13 jobs)
- `fail-fast: false` — one spider failure doesn't block others
- 15-minute timeout per spider

### Seed Scrape (`scrape-seed.yml`)
- Manual trigger only
- Full harvest: `MAX_PAGES=0` for merrjep (unlimited)
- Individual jobs per spider for better isolation
- 120-minute timeout per spider

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
│   ├── commands/
│   │   └── crawl.md             # /crawl skill for running spiders
│   ├── agents/
│   │   └── spider-reviewer.md   # Spider review agent
│   └── skills/
│       ├── new-spider/          # New spider creation skill
│       └── db-migrate/          # Database migration skill
├── scrapy_project/
│   ├── shtepi/
│   │   ├── spiders/             # 13 spiders
│   │   │   ├── merrjep.py       # merrjep.al — classifieds
│   │   │   ├── mirlir.py        # mirlir.com — RE portal
│   │   │   ├── njoftime.py      # njoftime.com — XenForo forum
│   │   │   ├── duashpi.py       # duashpi.al — RE marketplace
│   │   │   ├── celesi.py        # gazetacelesi.al — Cloudflare blocked
│   │   │   ├── shpi.py          # shpi.al — rich structured fields
│   │   │   ├── indomio.py       # indomio.al — Spitogatos network
│   │   │   ├── century21.py     # century21albania.com — BSP CRM
│   │   │   ├── realestate.py    # realestate.al — single agency
│   │   │   ├── propertyhub.py   # propertyhub.al — WPEstate
│   │   │   ├── kerko360.py      # kerko360.al — search portal
│   │   │   ├── homezone.py      # homezone.al — DNS down
│   │   │   └── futurehome.py    # futurehome.al — BSP CRM
│   │   ├── pipelines.py         # Validate → Normalize → Dedup → Store
│   │   ├── normalizers.py       # Albanian-aware parsing
│   │   ├── city_coords.py       # 22 Albanian city coordinates
│   │   └── settings.py          # Conditional pipeline (PostgreSQL/SQLite)
│   └── tests/
│       ├── fixtures/            # HTML fixtures for each spider
│       ├── test_normalizers.py  # Normalizer unit tests
│       └── test_spider_*.py     # Spider-specific tests (690 total)
├── web/
│   ├── data/
│   │   └── seed-listings.json   # 91 real listings (fallback without DB)
│   ├── design-system/
│   │   └── MASTER.md            # Design system: colors, typography, components, a11y
│   ├── src/
│   │   ├── app/                 # Pages, API routes, loading/error states, SEO files
│   │   ├── components/          # React components (ListingCard, FilterSidebar, MapView, etc.)
│   │   ├── hooks/               # useBodyScrollLock, useEscapeKey
│   │   └── lib/                 # auth, db, seo, types, validators, cn utility
│   ├── next.config.mjs          # Image remote patterns (13 CDN domains)
│   └── package.json
├── scripts/
│   ├── run_spiders.sh           # Run all production spiders
│   ├── backfill_geocode.py      # Geocode backfill (Nominatim + city fallback)
│   ├── dedup/
│   │   └── find_duplicates.py   # Cross-source dedup (3 strategies)
│   └── migrate-sqlite-to-pg.py  # One-time SQLite → PostgreSQL migration
├── .github/workflows/
│   ├── scrape.yml               # Daily scrape (03:00 UTC, 13 parallel jobs)
│   └── scrape-seed.yml          # Full harvest (manual trigger, unlimited pages)
├── docs/
│   ├── shtepial-prd.md          # Product requirements document
│   ├── plans/                   # Design + implementation plan docs
│   └── screenshots/             # UI screenshots
└── README.md
```

## Cross-Source Deduplication

Three matching strategies to identify duplicate listings across sources:

1. **Within-source** — Same title + price from same source
2. **Exact-title cross-source** — Identical title + price across different sources
3. **Phone+price+area** — Same poster phone, price, and area from different sources

Deduped listings are soft-deactivated (`is_active=false`) with metadata tracking. Reversible with `--revert` flag.

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
| [#9](https://github.com/phoebusdev/shtepi-al/issues/9) | Auth | Google OAuth credentials |
| [#10](https://github.com/phoebusdev/shtepi-al/issues/10) | Auth | Rate limiting on auth endpoints |
| [#16](https://github.com/phoebusdev/shtepi-al/issues/16) | Infra | Custom domain |
| [#17](https://github.com/phoebusdev/shtepi-al/issues/17) | Infra | CI/CD pipeline |
