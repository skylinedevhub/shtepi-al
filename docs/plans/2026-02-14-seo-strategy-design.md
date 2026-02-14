# SEO Strategy Design — ShtëpiAL

**Date:** 2026-02-14
**Branch:** `feature/seo-geo-optimization`
**Worktree:** `.worktrees/seo-geo`
**Approach:** Full SEO Overhaul (Approach A)

## Summary

Comprehensive SEO implementation for ShtëpiAL: bilingual metadata (Albanian + English), SEO-friendly URLs with city slugs, JSON-LD structured data, dynamic sitemap, city landing pages, and ISR caching. The user-facing search/filter UI remains unchanged.

## Current State

- Root layout has static Albanian title/description
- No page-specific metadata, sitemap, robots.txt, or structured data
- All pages use `force-dynamic` (no caching)
- URLs use numeric IDs: `/listings/42`
- No canonical URLs, no Open Graph, no Twitter Cards
- No city landing pages

## Decisions

1. **Audience:** Albanian primary + English Open Graph for diaspora
2. **URL strategy:** City + slug: `/listings/tirane/apartament-2+1-ne-bllok-42`
3. **ISR:** 1-hour revalidation on listing detail and city pages
4. **City pages:** `/[city]/` and `/[city]/[transactionType]/` as new crawlable entry points
5. **UI:** Existing search/filter experience stays identical

---

## 1. URL Architecture

### New Routes

```
/                                        → homepage (unchanged)
/listings                                → all listings (unchanged UI)
/listings/[city]/[slug]                  → listing detail (new SEO URL)
/listings/[id]                           → 301 redirect to canonical slug URL
/[city]/                                 → city landing page (new)
/[city]/[transactionType]/               → city + transaction type landing (new)
```

### Slug Generation

```
Input:  title="Apartament 2+1 në Bllok", city="Tiranë", id="42"
Output: /listings/tirane/apartament-2+1-ne-bllok-42
```

Rules:
- Strip Albanian diacritics: ë→e, ç→c, Ë→E, Ç→C
- Lowercase everything
- Replace whitespace/special chars with hyphens
- Collapse multiple hyphens
- Append listing ID as suffix (ensures uniqueness, enables DB lookup)
- City slug from static map (Tiranë→tirane, Durrës→durres, etc.)

### City Slug Map

```ts
const CITY_SLUGS: Record<string, string> = {
  "Tiranë": "tirane",
  "Durrës": "durres",
  "Vlorë": "vlore",
  "Sarandë": "sarande",
  "Shkodër": "shkoder",
  "Korçë": "korce",
  "Elbasan": "elbasan",
  "Berat": "berat",
  "Fier": "fier",
  "Lushnjë": "lushnje",
  "Pogradec": "pogradec",
  "Gjirokastër": "gjirokaster",
  "Kavajë": "kavaje",
  "Lezhë": "lezhe",
};
```

Reverse map for URL→city lookup.

### Route Conflict Prevention

`app/[city]/page.tsx` could match `/dashboard`, `/auth`, etc. Solutions:
- `generateStaticParams()` returns only known city slugs
- Middleware validates `[city]` param against city slug set
- Unknown slugs fall through to 404

---

## 2. Metadata Strategy

### Root Layout

```ts
export const metadata: Metadata = {
  metadataBase: new URL("https://shtepial.al"),
  title: {
    template: "%s | ShtëpiAL",
    default: "ShtëpiAL — Gjej shtëpinë tënde në Shqipëri",
  },
  description: "Agregator i njoftimeve të pasurive të paluajtshme...",
  openGraph: {
    siteName: "ShtëpiAL",
    locale: "sq_AL",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
};
```

### Listing Detail Page — `generateMetadata()`

Albanian title:
```
"Apartament 2+1 në Tiranë — €85,000"
```

Albanian description:
```
"Apartament 2+1, 95 m² në Tiranë, Bllok. Çmimi: €85,000. Shiko foto dhe detaje në ShtëpiAL."
```

English Open Graph:
```
og:title = "2+1 Apartment in Tiranë — €85,000"
og:description = "2+1 apartment, 95 m² in Tiranë, Bllok. Price: €85,000."
```

Open Graph image: First listing image (with dimensions).

### City Landing Page

Albanian: `"Pasuri të paluajtshme në Tiranë | ShtëpiAL"`
English OG: `"Real Estate in Tiranë, Albania"`

### City + Transaction Type Page

Albanian: `"Shitje në Tiranë — Apartamente, shtëpi, vila | ShtëpiAL"`
English OG: `"Property for Sale in Tiranë, Albania"`

### Noindex Pages

- `/auth/signin`, `/auth/register`
- `/dashboard`, `/dashboard/*`
- `/listings/new`
- `/api/*`

### Canonical URLs

- Listing detail: canonical = slug URL
- City pages: canonical = city page URL (no query params)
- `/listings` with filters: canonical = `/listings` (strip sort/pagination params)

---

## 3. JSON-LD Structured Data

### RealEstateListing (listing detail)

```json
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "Apartament 2+1 në Bllok",
  "description": "...",
  "url": "https://shtepial.al/listings/tirane/apartament-2+1-ne-bllok-42",
  "datePosted": "2026-01-15",
  "image": ["https://media.merrjep.al/..."],
  "offers": {
    "@type": "Offer",
    "price": 85000,
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  },
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Tiranë",
    "addressRegion": "Bllok",
    "addressCountry": "AL"
  },
  "floorSize": {
    "@type": "QuantitativeValue",
    "value": 95,
    "unitCode": "MTK"
  },
  "numberOfRooms": 3
}
```

### WebSite with SearchAction (homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "ShtëpiAL",
  "url": "https://shtepial.al",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://shtepial.al/listings?q={search_term}"
    },
    "query-input": "required name=search_term"
  }
}
```

### BreadcrumbList (listing detail + city pages)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Kryefaqja", "item": "https://shtepial.al" },
    { "@type": "ListItem", "position": 2, "name": "Tiranë", "item": "https://shtepial.al/tirane" },
    { "@type": "ListItem", "position": 3, "name": "Apartament 2+1 në Bllok" }
  ]
}
```

---

## 4. Sitemap & Robots.txt

### Sitemap (`app/sitemap.ts`)

Dynamic generation from database:

```ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { url: SITE_URL, lastModified: new Date(), priority: 1.0, changeFrequency: "daily" },
    { url: `${SITE_URL}/listings`, priority: 0.9, changeFrequency: "daily" },
  ];

  // City pages
  const cityPages = Object.values(CITY_SLUGS).flatMap(slug => [
    { url: `${SITE_URL}/${slug}`, priority: 0.8, changeFrequency: "daily" },
    { url: `${SITE_URL}/${slug}/shitje`, priority: 0.7, changeFrequency: "daily" },
    { url: `${SITE_URL}/${slug}/qira`, priority: 0.7, changeFrequency: "daily" },
  ]);

  // All active listings
  const listings = await getAllActiveListings(); // id, city, title, last_seen
  const listingPages = listings.map(l => ({
    url: `${SITE_URL}/listings/${cityToSlug(l.city)}/${generateSlug(l.title, l.id)}`,
    lastModified: new Date(l.last_seen),
    priority: 0.6,
    changeFrequency: "weekly" as const,
  }));

  return [...staticPages, ...cityPages, ...listingPages];
}
```

### Robots.txt (`app/robots.ts`)

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/auth/", "/dashboard/", "/api/", "/listings/new"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

---

## 5. ISR Strategy

### Changes

| Page | Current | New |
|------|---------|-----|
| `/` (homepage) | `force-dynamic` | `revalidate = 3600` |
| `/listings` | `force-dynamic` | `force-dynamic` (needs real-time filters) |
| `/listings/[city]/[slug]` | `force-dynamic` | `revalidate = 3600` |
| `/[city]` | N/A (new) | `revalidate = 3600` |
| `/[city]/[transactionType]` | N/A (new) | `revalidate = 3600` |

The `/listings` page stays dynamic because it handles user-driven filter combinations in real time. All other pages benefit from ISR caching.

---

## 6. File Structure

### New Files

```
web/src/lib/seo/
├── metadata.ts       # generateListingMetadata(), generateCityMetadata()
├── jsonld.ts         # buildListingJsonLd(), buildWebsiteJsonLd(), buildBreadcrumbJsonLd()
├── slugs.ts          # generateSlug(), citySlugMap, CITY_SLUGS, parseSlugId()
└── constants.ts      # SITE_URL, SITE_NAME, property/transaction type translations

web/src/app/
├── sitemap.ts        # Dynamic sitemap
├── robots.ts         # Robots.txt
├── listings/
│   └── [city]/
│       └── [slug]/
│           └── page.tsx    # SEO-friendly listing detail
└── [city]/
    ├── page.tsx              # City landing page
    └── [transactionType]/
        └── page.tsx          # City + type landing page

web/src/components/
└── JsonLd.tsx        # Reusable JSON-LD <script> component
```

### Modified Files

```
web/src/app/layout.tsx             # metadataBase, title template, OG defaults
web/src/app/page.tsx               # Add WebSite JSON-LD, remove force-dynamic
web/src/app/listings/page.tsx      # Add generateMetadata for filter-aware titles
web/src/app/listings/[id]/page.tsx # 301 redirect to canonical slug URL
web/src/lib/db/queries.ts          # Add getAllActiveListingSlugs()
web/src/lib/db/schema.ts           # Add slug column (optional, for precomputed slugs)
```

---

## 7. Implementation Sequence

1. **Foundation:** `lib/seo/` utilities (slugs, constants, metadata helpers, JSON-LD builders)
2. **Component:** `JsonLd.tsx` reusable component
3. **Root layout:** metadataBase, title template, OG defaults
4. **Robots.txt + Sitemap:** `app/robots.ts`, `app/sitemap.ts`
5. **Listing detail:** `generateMetadata()`, JSON-LD, ISR, SEO-friendly URL route
6. **Old URL redirect:** `/listings/[id]` → 301 to slug URL
7. **City landing pages:** `app/[city]/page.tsx`, `app/[city]/[transactionType]/page.tsx`
8. **Homepage:** WebSite JSON-LD, ISR
9. **Listings index:** Filter-aware metadata
10. **Noindex:** Auth and dashboard pages
11. **Footer links:** Update city links to use new city page URLs
12. **Breadcrumb links:** Update to use new URL structure

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `[city]` route catches non-city paths | Middleware validates against city slug set |
| Slug changes if title changes | ID suffix is the lookup key, slug is cosmetic |
| Sitemap too large (1000+ listings) | Next.js sitemap supports streaming, paginate if needed |
| ISR stale data | 1-hour revalidation is acceptable for real estate |
| Albanian diacritic edge cases | Comprehensive slug generation with fallback |
| Seed fallback (no DB) | Sitemap and city pages gracefully degrade to empty/minimal |
