# ShtëpiAL — Web Frontend

Next.js 14 frontend for the ShtëpiAL Albanian real estate aggregator. Displays listings from 13 scraper sources with search, filtering, map view, and user listing management.

## Architecture

```
web/
├── src/app/
│   ├── layout.tsx          # Root layout: header (backdrop-blur, mobile menu), footer (3-col)
│   ├── page.tsx            # Homepage: hero, search, stats bar, recent listings (server component)
│   ├── globals.css         # Design tokens, shimmer animations, focus-visible, scrollbar
│   ├── icon.tsx            # Dynamic favicon (navy bg, gold "S") via ImageResponse
│   ├── manifest.ts         # PWA manifest with Albanian metadata
│   ├── robots.ts           # robots.txt generation
│   ├── sitemap.ts          # XML sitemap generation
│   ├── not-found.tsx       # Albanian 404 page
│   ├── error.tsx           # Albanian 500 page with retry
│   ├── loading.tsx         # Root loading skeleton
│   ├── listings/
│   │   ├── page.tsx        # Listings grid: filters, sort, grid/map toggle
│   │   ├── loading.tsx     # Listings skeleton (6 cards)
│   │   └── [city]/[slug]/
│   │       ├── page.tsx    # Detail: gallery, breadcrumbs, contact CTA, share button
│   │       └── loading.tsx # Detail skeleton
│   ├── auth/               # signin, register pages
│   ├── dashboard/          # User dashboard + loading.tsx skeleton
│   └── api/                # 11 API route files
├── src/components/
│   ├── ListingCard.tsx     # Card with Next.js Image, error fallback, 13-source brand badges
│   ├── FilterSidebar.tsx   # Mobile drawer + desktop aside (13 sources, scroll lock, escape key)
│   ├── ImageGallery.tsx    # Keyboard nav, touch swipe, shimmer loading
│   ├── MapView.tsx         # Leaflet map with marker clustering (all geocoded listings)
│   ├── DetailMap.tsx       # Single-listing Leaflet map
│   ├── MapPinPicker.tsx    # Map pin selector for listing forms
│   ├── MobileMenu.tsx      # Portal-based mobile drawer (escapes backdrop-filter)
│   ├── NavLink.tsx         # Active link detection via pathname + search params
│   ├── SearchBar.tsx       # Full-text search with clear button
│   ├── ShareButton.tsx     # Copy-to-clipboard with toast feedback
│   └── AuthButton.tsx      # Header auth toggle
├── src/hooks/
│   ├── useBodyScrollLock.ts # iOS Safari compatible body scroll lock
│   └── useEscapeKey.ts      # Escape key handler with enabled gate
├── src/lib/
│   ├── auth.ts             # NextAuth config (Node.js, bcrypt)
│   ├── auth.config.ts      # Edge-safe auth (middleware imports this)
│   ├── types.ts            # Listing, ListingFilters, ListingsResponse, Stats
│   ├── validators.ts       # Zod schemas for listing create/update
│   ├── cn.ts               # cn() utility (clsx + twMerge)
│   ├── constants.ts        # CITIES, PROPERTY_TYPES, QUICK_CITIES
│   ├── seo/                # slugs, metadata, jsonld, constants
│   └── db/
│       ├── schema.ts       # Drizzle schema (all tables)
│       ├── drizzle.ts      # Supabase PostgreSQL connection
│       ├── queries.ts      # DB query functions + seed fallback
│       └── seed.ts         # JSON seed data loader
├── design-system/
│   └── MASTER.md           # Design system: colors, typography, spacing, components, a11y
├── next.config.mjs         # Image remote patterns (13 CDN domains)
└── package.json
```

## Data Flow

- **Homepage** (`page.tsx`): Server component calls `getStats()` and `getListings()` directly
- **Listings page** (`listings/page.tsx`): Client component fetches from `/api/listings` or `/api/search`
- **Detail page** (`listings/[city]/[slug]/page.tsx`): Server component calls `getListingById()`
- **Map pins**: `/api/listings/map-pins` returns ALL geocoded listings (no pagination)
- **API routes**: Thin wrappers around `queries.ts` functions, all `force-dynamic`

## Design System

See [`design-system/MASTER.md`](design-system/MASTER.md). Brand palette:

| Token | Hex | Role |
|-------|-----|------|
| Navy | `#1B2A4A` | Headings, header bg, primary text |
| Cream | `#FDF8F0` | Page background |
| Terracotta | `#C75B39` | CTAs, focus rings, active states |
| Gold | `#D4A843` | Brand accent, logo highlight |
| Warm Gray | `#8B8178` | Secondary text, metadata |

Typography: **Playfair Display** (headings) + **DM Sans** (body).

## Image Domains

All 13 scraper sources serve images from different CDNs, configured in `next.config.mjs`:

| Source(s) | CDN Domain |
|-----------|-----------|
| merrjep | media.merrjep.al |
| mirlir | media.mirlir.com |
| njoftime | www.njoftime.com |
| duashpi | duashpi.al, d1ia6vt0h4qxok.cloudfront.net |
| shpi | cdn.shpi.al, shpi.al |
| century21, futurehome | crm-cdn.ams3.cdn.digitaloceanspaces.com |
| indomio | m{1,2,3}.spitogatos.gr |
| kerko360 | kerko360.al |
| propertyhub | propertyhub.al |
| realestate | realestate.al |

## Development

```bash
npm install
cp .env.example .env.local  # Edit with your credentials
npm run dev                  # http://localhost:3000
npm run build                # Production build
npx vitest run               # 55 tests
```

Works without `DATABASE_URL` — falls back to `data/seed-listings.json` (91 real listings).

## Deployment

Deployed to Vercel at [shtepi-al.vercel.app](https://shtepi-al.vercel.app). Env vars: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `BLOB_READ_WRITE_TOKEN`.
