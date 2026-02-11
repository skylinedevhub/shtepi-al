# ShtëpiAL

Albanian real estate aggregator and listing platform. Scrapy spiders collect listings from major Albanian property sites, while users can register and post their own listings. Built with Next.js 14, Neon PostgreSQL, and Drizzle ORM.

**Live:** [web-sigma-six-65.vercel.app](https://web-sigma-six-65.vercel.app)

## Architecture

```
scrapy_project/          Scrapy spiders (Python)
  shtepi/spiders/        merrjep, celesi, mirlir, njoftime, duashpi
  shtepi/pipelines.py    Validate → Normalize → Dedup → Store (SQLite or PostgreSQL)
  shtepi/normalizers.py  Albanian-aware parsing (cities, prices, room configs)

web/                     Next.js 14 App Router (TypeScript)
  src/lib/db/            Drizzle ORM schema, queries, seed fallback
  src/lib/auth.ts        NextAuth v5 (email/password + Google OAuth)
  src/app/api/           REST API routes
  src/components/        React components (search, filters, map, forms)

db/                      SQLite database (local dev)
scripts/                 Migration scripts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS, Leaflet |
| Database | Neon PostgreSQL (prod), SQLite (local dev) |
| ORM | Drizzle ORM with Neon HTTP driver |
| Auth | NextAuth v5 (JWT strategy, Credentials + Google) |
| Image Storage | Vercel Blob |
| Scraping | Scrapy 2.11, Python 3.x |
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
scrapy crawl merrjep         # SQLite by default
# Or with PostgreSQL:
DATABASE_URL=postgresql://... scrapy crawl merrjep
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

## API Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/listings` | No | Filtered listings with pagination |
| POST | `/api/listings` | Yes | Create a new user listing |
| PUT | `/api/listings/[id]` | Yes | Update own listing |
| DELETE | `/api/listings/[id]` | Yes | Soft-delete own listing |
| GET | `/api/listings/my` | Yes | Get user's own listings |
| GET | `/api/search?q=...` | No | Full-text search |
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

- **listings** — 36+ columns: price, city, property_type, images[], origin (scraped/user), status lifecycle, JSONB metadata
- **users** — NextAuth-compatible with role enum (user, agent, agency_admin, moderator, admin)
- **accounts** / **sessions** / **verification_tokens** — NextAuth OAuth & sessions
- **agencies** — Future: agency profiles
- **listing_images** — Future: user-uploaded image metadata
- **favorites** — Future: saved listings

Scraped listings use a partial unique index on `(source, source_id)` for dedup.

## Spider Status

| Spider | Domain | Status | Listings |
|--------|--------|--------|----------|
| merrjep | merrjep.al | Live | 20 |
| celesi | gazetacelesi.al | Live | 18 |
| mirlir | mirlir.com | Live | 20 |
| njoftime | njoftime.com | Live | 15 |
| duashpi | duashpi.al | Live | 18 |

## Albanian-Specific Parsing

- **Room configs:** "2+1" = 2 bedrooms + 1 living room. "garsoniere" = studio
- **Prices:** Tirana listings typically EUR, rural/rent often ALL. `EUR_ALL_RATE = 100`
- **Cities:** Normalized with diacritics (ë, ç). Lowercase lookup table
- **UI:** All user-facing text in Albanian

## Project Structure

```
web/src/
├── app/
│   ├── api/                  # 10 API route files
│   ├── auth/                 # signin, register pages
│   ├── dashboard/            # user dashboard
│   ├── listings/             # browse, detail, new, edit
│   ├── layout.tsx            # root layout with nav
│   └── page.tsx              # homepage
├── components/
│   ├── AuthButton.tsx        # header auth toggle
│   ├── FilterSidebar.tsx     # listing filters
│   ├── ImageGallery.tsx      # listing image carousel
│   ├── ImageUploader.tsx     # drag-drop image upload
│   ├── ListingCard.tsx       # listing preview card
│   ├── ListingForm.tsx       # create/edit listing form
│   ├── MapView.tsx           # Leaflet map with markers
│   ├── MobileMenu.tsx        # mobile navigation
│   ├── Providers.tsx         # SessionProvider wrapper
│   ├── SearchBar.tsx         # search input
│   └── ShareButton.tsx       # social share
├── lib/
│   ├── auth.ts               # NextAuth config
│   ├── auth.config.ts        # edge-safe auth config
│   ├── city-coords.ts        # Albanian city coordinates
│   ├── types.ts              # TypeScript interfaces
│   ├── validators.ts         # Zod schemas
│   └── db/
│       ├── schema.ts         # Drizzle schema (all tables)
│       ├── drizzle.ts        # Neon HTTP connection
│       ├── queries.ts        # query functions
│       └── seed.ts           # JSON seed fallback
├── types/
│   └── next-auth.d.ts        # NextAuth type augmentation
└── middleware.ts              # route protection
```
