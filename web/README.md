# ShtëpiAL — Web Frontend

Next.js 14 frontend for the ShtëpiAL Albanian real estate aggregator.

## Architecture

```
web/
├── src/app/
│   ├── layout.tsx          # Root layout: header (backdrop-blur, mobile menu), footer (3-col)
│   ├── page.tsx            # Homepage: hero, search, stats bar, recent listings (server component)
│   ├── globals.css         # Design tokens, shimmer animations, focus-visible, scrollbar
│   └── listings/
│       ├── page.tsx        # Listings grid: skeleton loading, sort dropdown, empty state
│       └── [id]/page.tsx   # Detail page: gallery, breadcrumbs, contact CTA, share button
├── src/components/
│   ├── SearchBar.tsx       # Full-text search with clear button
│   ├── ListingCard.tsx     # Card with Next.js Image, error fallback, badges
│   ├── FilterSidebar.tsx   # Desktop sidebar + mobile animated drawer, clear-all
│   ├── ImageGallery.tsx    # Keyboard nav, touch swipe, shimmer loading
│   ├── MobileMenu.tsx      # Hamburger slide-out drawer
│   └── ShareButton.tsx     # Copy-to-clipboard with toast feedback
├── src/lib/
│   ├── db.ts              # SQLite (better-sqlite3 readonly) — handles missing DB gracefully
│   └── types.ts           # Listing, ListingFilters, ListingsResponse, Stats
├── tailwind.config.ts     # Semantic color tokens (primary blue-600), shimmer animation
└── next.config.mjs        # Image remote patterns
```

## Data Flow

- **Homepage** (`page.tsx`): Server component calls `getStats()` and `getListings()` directly from `db.ts`
- **Listings page** (`listings/page.tsx`): Client component fetches from `/api/listings` or `/api/search`
- **Detail page** (`listings/[id]/page.tsx`): Server component calls `getListingById()` directly
- **API routes**: Thin wrappers around `db.ts` functions, all `force-dynamic`

## Design System

- **Primary**: blue-600 (`#2563eb`) with light/lighter/dark/darker variants
- **Cards**: `rounded-xl`, `shadow-sm → shadow-lg` on hover
- **Buttons/Inputs**: `rounded-lg`, consistent focus ring (`ring-primary/20`)
- **Loading**: Shimmer skeleton animation (CSS gradient slide)
- **Accessibility**: `focus-visible` outlines, aria-labels (Albanian), skip-to-content link

## Scrapers

Scrapers are maintained individually — each source site has unique HTML structure and requires targeted updates. See GitHub issues with the `scraper` label for per-spider tracking:

| Spider | Source | Notes |
|--------|--------|-------|
| `merrjep.py` | merrjep.al | Standard listings site |
| `celesi.py` | gazetacelesi.al | Standard listings site |
| `mirlir.py` | mirlir.com | Standard listings site |
| `njoftime.py` | njoftime.com | XenForo forum — metadata via regex in thread titles (fragile) |

## Development

```bash
npm run dev    # Start dev server on :3000
npm run build  # Production build (requires SQLITE_DB_PATH or db/shtepi.db)
```

## Deployment

Deployed to Vercel. The frontend works without a database (returns empty responses gracefully). For production data, the Scrapy pipeline writes to `db/shtepi.db` which the Next.js app reads at request time.
