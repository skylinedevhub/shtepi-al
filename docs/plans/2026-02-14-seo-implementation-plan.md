# SEO Strategy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive SEO to ShtëpiAL — bilingual metadata, SEO-friendly URLs, JSON-LD, sitemap, city landing pages, and ISR caching.

**Architecture:** SEO utility library (`lib/seo/`) provides slug generation, metadata factories, and JSON-LD builders. New Next.js routes for city landing pages and slug-based listing detail. Old `/listings/[id]` redirects 301 to canonical slug URL. ISR replaces `force-dynamic` on cacheable pages.

**Tech Stack:** Next.js 14 Metadata API, App Router dynamic routes, ISR (`revalidate`), JSON-LD via `<script>` tag, vitest for unit tests.

**Worktree:** All work in `/home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web/`
**Branch:** `feature/seo-geo-optimization`
**Design doc:** `docs/plans/2026-02-14-seo-strategy-design.md`

**Security note:** The JsonLd component uses `dangerouslySetInnerHTML` with `JSON.stringify()` on developer-controlled data (never user input). This is the standard Next.js pattern for JSON-LD — the data is always constructed server-side from our own database schema, not from raw user input, so XSS risk is mitigated.

---

### Task 1: Add vitest and create SEO constants

**Files:**
- Modify: `web/package.json`
- Create: `web/vitest.config.ts`
- Create: `web/src/lib/seo/constants.ts`
- Test: `web/src/lib/seo/__tests__/constants.test.ts`

**Step 1: Install vitest**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npm install -D vitest`

**Step 2: Create vitest config**

Create `web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

**Step 3: Create SEO constants**

Create `web/src/lib/seo/constants.ts`:

```ts
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://shtepial.al";
export const SITE_NAME = "ShtëpiAL";

export const PROPERTY_TYPE_SQ: Record<string, string> = {
  apartment: "Apartament",
  house: "Shtëpi",
  villa: "Vilë",
  land: "Truall",
  commercial: "Komercial",
  garage: "Garazh",
  studio: "Garsoniere",
};

export const PROPERTY_TYPE_EN: Record<string, string> = {
  apartment: "Apartment",
  house: "House",
  villa: "Villa",
  land: "Land",
  commercial: "Commercial",
  garage: "Garage",
  studio: "Studio",
};

export const TRANSACTION_TYPE_SQ: Record<string, string> = {
  sale: "Shitje",
  rent: "Qira",
};

export const TRANSACTION_TYPE_EN: Record<string, string> = {
  sale: "Sale",
  rent: "Rent",
};

export const TRANSACTION_TYPE_URL: Record<string, string> = {
  sale: "shitje",
  rent: "qira",
};

export const URL_TO_TRANSACTION: Record<string, string> = {
  shitje: "sale",
  qira: "rent",
};
```

**Step 4: Write test for constants**

Create `web/src/lib/seo/__tests__/constants.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  SITE_NAME,
  PROPERTY_TYPE_SQ,
  PROPERTY_TYPE_EN,
  TRANSACTION_TYPE_SQ,
  TRANSACTION_TYPE_EN,
  TRANSACTION_TYPE_URL,
  URL_TO_TRANSACTION,
} from "../constants";

describe("SEO constants", () => {
  it("has matching property type keys for SQ and EN", () => {
    expect(Object.keys(PROPERTY_TYPE_SQ).sort()).toEqual(
      Object.keys(PROPERTY_TYPE_EN).sort()
    );
  });

  it("has matching transaction type keys for SQ and EN", () => {
    expect(Object.keys(TRANSACTION_TYPE_SQ).sort()).toEqual(
      Object.keys(TRANSACTION_TYPE_EN).sort()
    );
  });

  it("URL_TO_TRANSACTION inverts TRANSACTION_TYPE_URL", () => {
    for (const [key, urlSlug] of Object.entries(TRANSACTION_TYPE_URL)) {
      expect(URL_TO_TRANSACTION[urlSlug]).toBe(key);
    }
  });

  it("SITE_NAME is ShtëpiAL", () => {
    expect(SITE_NAME).toBe("ShtëpiAL");
  });
});
```

**Step 5: Run test to verify it passes**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx vitest run src/lib/seo/__tests__/constants.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/seo/constants.ts src/lib/seo/__tests__/constants.test.ts
git commit -m "feat(seo): add vitest setup and SEO constants with bilingual translations"
```

---

### Task 2: Create slug generation utilities

**Files:**
- Create: `web/src/lib/seo/slugs.ts`
- Test: `web/src/lib/seo/__tests__/slugs.test.ts`

**Step 1: Write the failing tests**

Create `web/src/lib/seo/__tests__/slugs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  generateSlug,
  stripDiacritics,
  cityToSlug,
  slugToCity,
  CITY_SLUGS,
  parseSlugId,
  buildListingPath,
} from "../slugs";

describe("stripDiacritics", () => {
  it("strips Albanian ë and ç", () => {
    expect(stripDiacritics("Tiranë")).toBe("Tirane");
    expect(stripDiacritics("Korçë")).toBe("Korce");
  });

  it("handles uppercase diacritics", () => {
    expect(stripDiacritics("TIRANË")).toBe("TIRANE");
    expect(stripDiacritics("KORÇË")).toBe("KORCE");
  });

  it("passes through plain text unchanged", () => {
    expect(stripDiacritics("Elbasan")).toBe("Elbasan");
  });
});

describe("generateSlug", () => {
  it("converts title to URL-safe slug", () => {
    expect(generateSlug("Apartament 2+1 në Bllok")).toBe(
      "apartament-2-1-ne-bllok"
    );
  });

  it("strips diacritics and lowercases", () => {
    expect(generateSlug("Vilë Luksoze në Sarandë")).toBe(
      "vile-luksoze-ne-sarande"
    );
  });

  it("collapses multiple hyphens", () => {
    expect(generateSlug("Shtëpi -- në -- Tiranë")).toBe("shtepi-ne-tirane");
  });

  it("removes leading and trailing hyphens", () => {
    expect(generateSlug(" -Apartament- ")).toBe("apartament");
  });

  it("handles special characters", () => {
    expect(generateSlug("Apartament (2+1) me garazh!")).toBe(
      "apartament-2-1-me-garazh"
    );
  });

  it("handles empty string", () => {
    expect(generateSlug("")).toBe("listing");
  });
});

describe("CITY_SLUGS", () => {
  it("includes major Albanian cities", () => {
    expect(CITY_SLUGS["Tiranë"]).toBe("tirane");
    expect(CITY_SLUGS["Durrës"]).toBe("durres");
    expect(CITY_SLUGS["Vlorë"]).toBe("vlore");
    expect(CITY_SLUGS["Sarandë"]).toBe("sarande");
    expect(CITY_SLUGS["Shkodër"]).toBe("shkoder");
    expect(CITY_SLUGS["Korçë"]).toBe("korce");
  });

  it("includes cities without diacritics", () => {
    expect(CITY_SLUGS["Elbasan"]).toBe("elbasan");
    expect(CITY_SLUGS["Berat"]).toBe("berat");
    expect(CITY_SLUGS["Fier"]).toBe("fier");
    expect(CITY_SLUGS["Pogradec"]).toBe("pogradec");
  });
});

describe("cityToSlug", () => {
  it("maps known cities to slugs", () => {
    expect(cityToSlug("Tiranë")).toBe("tirane");
    expect(cityToSlug("Gjirokastër")).toBe("gjirokaster");
  });

  it("generates slug for unknown cities", () => {
    expect(cityToSlug("Kukës")).toBe("kukes");
  });

  it("returns 'shqiperi' for null/undefined", () => {
    expect(cityToSlug(null)).toBe("shqiperi");
    expect(cityToSlug(undefined)).toBe("shqiperi");
  });
});

describe("slugToCity", () => {
  it("reverses known slugs to city names", () => {
    expect(slugToCity("tirane")).toBe("Tiranë");
    expect(slugToCity("durres")).toBe("Durrës");
    expect(slugToCity("korce")).toBe("Korçë");
  });

  it("returns null for unknown slugs", () => {
    expect(slugToCity("unknown-city")).toBeNull();
  });
});

describe("parseSlugId", () => {
  it("extracts 8-char hex ID from end of slug", () => {
    expect(parseSlugId("apartament-2-1-ne-bllok-b902fe46")).toBe("b902fe46");
  });

  it("extracts ID from simple slug", () => {
    expect(parseSlugId("shtepi-a1b2c3d4")).toBe("a1b2c3d4");
  });

  it("returns null for slug without valid hex suffix", () => {
    expect(parseSlugId("no-id-here")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSlugId("")).toBeNull();
  });
});

describe("buildListingPath", () => {
  it("builds full SEO path from listing data", () => {
    const path = buildListingPath(
      "Apartament 2+1 në Bllok",
      "Tiranë",
      "b902fe46-775e-4735-b18e-f41b2e695b17"
    );
    expect(path).toBe("/listings/tirane/apartament-2-1-ne-bllok-b902fe46");
  });

  it("uses shqiperi for null city", () => {
    const path = buildListingPath(
      "Shtëpi e bukur",
      null,
      "abcdef01-0000-0000-0000-000000000000"
    );
    expect(path).toBe("/listings/shqiperi/shtepi-e-bukur-abcdef01");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx vitest run src/lib/seo/__tests__/slugs.test.ts`
Expected: FAIL — module not found

**Step 3: Implement slugs.ts**

Create `web/src/lib/seo/slugs.ts`:

```ts
export const CITY_SLUGS: Record<string, string> = {
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

const SLUG_TO_CITY: Record<string, string> = Object.fromEntries(
  Object.entries(CITY_SLUGS).map(([city, slug]) => [slug, city])
);

const DIACRITICS: Record<string, string> = {
  "ë": "e", "Ë": "E",
  "ç": "c", "Ç": "C",
};

export function stripDiacritics(text: string): string {
  return text.replace(/[ëËçÇ]/g, (ch) => DIACRITICS[ch] ?? ch);
}

export function generateSlug(title: string): string {
  if (!title.trim()) return "listing";

  const slug = stripDiacritics(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "listing";
}

export function cityToSlug(city: string | null | undefined): string {
  if (!city) return "shqiperi";
  return CITY_SLUGS[city] ?? generateSlug(city);
}

export function slugToCity(slug: string): string | null {
  return SLUG_TO_CITY[slug] ?? null;
}

export function parseSlugId(slug: string): string | null {
  const match = slug.match(/-([0-9a-f]{8})$/);
  return match?.[1] ?? null;
}

export function buildListingPath(
  title: string,
  city: string | null | undefined,
  id: string
): string {
  const citySlug = cityToSlug(city);
  const titleSlug = generateSlug(title);
  const shortId = id.replace(/-/g, "").slice(0, 8);
  return `/listings/${citySlug}/${titleSlug}-${shortId}`;
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx vitest run src/lib/seo/__tests__/slugs.test.ts`
Expected: PASS — all 20+ tests green

**Step 5: Commit**

```bash
git add src/lib/seo/slugs.ts src/lib/seo/__tests__/slugs.test.ts
git commit -m "feat(seo): add slug generation with Albanian diacritics, city map, and ID parsing"
```

---

### Task 3: Create JSON-LD builders and JsonLd component

**Files:**
- Create: `web/src/lib/seo/jsonld.ts`
- Create: `web/src/components/JsonLd.tsx`
- Test: `web/src/lib/seo/__tests__/jsonld.test.ts`

**Step 1: Write the failing tests**

Create `web/src/lib/seo/__tests__/jsonld.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buildListingJsonLd,
  buildWebsiteJsonLd,
  buildBreadcrumbJsonLd,
} from "../jsonld";
import type { Listing } from "@/lib/types";

const mockListing: Listing = {
  id: "b902fe46-775e-4735-b18e-f41b2e695b17",
  source: "merrjep",
  source_url: "https://merrjep.al/123",
  source_id: "123",
  title: "Apartament 2+1 në Bllok",
  description: "Apartament i bukur",
  price: 85000,
  price_all: 8500000,
  currency_original: "EUR",
  price_period: "total",
  transaction_type: "sale",
  property_type: "apartment",
  room_config: "2+1",
  area_sqm: 95,
  area_net_sqm: null,
  floor: 3,
  total_floors: 8,
  rooms: 3,
  bathrooms: 1,
  city: "Tiranë",
  neighborhood: "Bllok",
  address_raw: null,
  images: ["https://media.merrjep.al/img1.jpg"],
  image_count: 1,
  poster_name: "Test",
  poster_phone: null,
  poster_type: "private",
  is_active: true,
  first_seen: "2026-01-15T10:00:00Z",
  last_seen: "2026-02-01T10:00:00Z",
  created_at: null,
  has_elevator: true,
  has_parking: false,
  is_furnished: null,
  is_new_build: null,
};

describe("buildListingJsonLd", () => {
  it("produces valid RealEstateListing schema", () => {
    const jsonLd = buildListingJsonLd(
      mockListing,
      "https://shtepial.al/listings/tirane/apartament-2-1-ne-bllok-b902fe46"
    );
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("RealEstateListing");
    expect(jsonLd.name).toBe("Apartament 2+1 në Bllok");
    expect(jsonLd.offers.price).toBe(85000);
    expect(jsonLd.offers.priceCurrency).toBe("EUR");
    expect(jsonLd.address.addressLocality).toBe("Tiranë");
    expect(jsonLd.address.addressCountry).toBe("AL");
    expect(jsonLd.numberOfRooms).toBe(3);
    expect(jsonLd.floorSize.value).toBe(95);
  });

  it("omits optional fields when null", () => {
    const noPrice = { ...mockListing, price: null, area_sqm: null, rooms: null };
    const jsonLd = buildListingJsonLd(noPrice, "https://shtepial.al/listings/x/y");
    expect(jsonLd.offers).toBeUndefined();
    expect(jsonLd.floorSize).toBeUndefined();
    expect(jsonLd.numberOfRooms).toBeUndefined();
  });
});

describe("buildWebsiteJsonLd", () => {
  it("produces WebSite schema with SearchAction", () => {
    const jsonLd = buildWebsiteJsonLd();
    expect(jsonLd["@type"]).toBe("WebSite");
    expect(jsonLd.potentialAction["@type"]).toBe("SearchAction");
    expect(jsonLd.potentialAction.target.urlTemplate).toContain("{search_term}");
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("builds breadcrumb with items", () => {
    const jsonLd = buildBreadcrumbJsonLd([
      { name: "Kryefaqja", url: "https://shtepial.al" },
      { name: "Tiranë", url: "https://shtepial.al/tirane" },
      { name: "Apartament 2+1" },
    ]);
    expect(jsonLd["@type"]).toBe("BreadcrumbList");
    expect(jsonLd.itemListElement).toHaveLength(3);
    expect(jsonLd.itemListElement[0].position).toBe(1);
    expect(jsonLd.itemListElement[2].item).toBeUndefined();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx vitest run src/lib/seo/__tests__/jsonld.test.ts`
Expected: FAIL — module not found

**Step 3: Implement JSON-LD builders**

Create `web/src/lib/seo/jsonld.ts`:

```ts
import type { Listing } from "@/lib/types";
import { SITE_URL, SITE_NAME } from "./constants";

type JsonLd = Record<string, unknown>;

export function buildListingJsonLd(listing: Listing, canonicalUrl: string): JsonLd {
  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: listing.title,
    url: canonicalUrl,
    datePosted: listing.first_seen ? listing.first_seen.split("T")[0] : undefined,
    image: listing.images.length > 0 ? listing.images : undefined,
  };

  if (listing.description) {
    jsonLd.description = listing.description.slice(0, 300);
  }

  if (listing.price != null) {
    jsonLd.offers = {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    };
  }

  if (listing.city) {
    jsonLd.address = {
      "@type": "PostalAddress",
      addressLocality: listing.city,
      ...(listing.neighborhood && { addressRegion: listing.neighborhood }),
      addressCountry: "AL",
    };
  }

  if (listing.area_sqm != null) {
    jsonLd.floorSize = {
      "@type": "QuantitativeValue",
      value: listing.area_sqm,
      unitCode: "MTK",
    };
  }

  if (listing.rooms != null) {
    jsonLd.numberOfRooms = listing.rooms;
  }

  return jsonLd;
}

export function buildWebsiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/listings?q={search_term}`,
      },
      "query-input": "required name=search_term",
    },
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; url?: string }>
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  };
}
```

**Step 4: Create the JsonLd component**

Create `web/src/components/JsonLd.tsx`. This component renders structured data as a JSON-LD script tag. The data is always constructed server-side from our database (never raw user input), making it safe for inline rendering.

```tsx
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

**Step 5: Run tests to verify they pass**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx vitest run src/lib/seo/__tests__/jsonld.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/lib/seo/jsonld.ts src/lib/seo/__tests__/jsonld.test.ts src/components/JsonLd.tsx
git commit -m "feat(seo): add JSON-LD builders for listings, website, breadcrumbs"
```

---

### Task 4: Create metadata generator utilities

**Files:**
- Create: `web/src/lib/seo/metadata.ts`
- Test: `web/src/lib/seo/__tests__/metadata.test.ts`

**Step 1: Write the failing tests**

Create `web/src/lib/seo/__tests__/metadata.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateListingTitle, generateListingDescription, generateCityTitle } from "../metadata";
import type { Listing } from "@/lib/types";

const mockListing = {
  title: "Apartament 2+1 në Bllok",
  price: 85000,
  city: "Tiranë",
  neighborhood: "Bllok",
  room_config: "2+1",
  area_sqm: 95,
  property_type: "apartment",
  transaction_type: "sale",
} as Listing;

describe("generateListingTitle", () => {
  it("generates Albanian title with price and city", () => {
    const title = generateListingTitle(mockListing, "sq");
    expect(title).toContain("Tiranë");
    expect(title).toContain("85");
    expect(title).toContain("2+1");
  });

  it("generates English title", () => {
    const title = generateListingTitle(mockListing, "en");
    expect(title).toContain("Tiranë");
    expect(title).toContain("85");
    expect(title).toContain("Apartment");
  });

  it("handles null price", () => {
    const noPrice = { ...mockListing, price: null };
    const title = generateListingTitle(noPrice, "sq");
    expect(title).not.toContain("€");
  });

  it("handles null city", () => {
    const noCity = { ...mockListing, city: null };
    const title = generateListingTitle(noCity, "sq");
    expect(title).toContain("2+1");
  });
});

describe("generateListingDescription", () => {
  it("generates Albanian description", () => {
    const desc = generateListingDescription(mockListing, "sq");
    expect(desc).toContain("Tiranë");
    expect(desc).toContain("95 m²");
    expect(desc).toContain("ShtëpiAL");
  });

  it("generates English description", () => {
    const desc = generateListingDescription(mockListing, "en");
    expect(desc).toContain("Tiranë");
    expect(desc).toContain("95 m²");
  });
});

describe("generateCityTitle", () => {
  it("generates Albanian city title", () => {
    const title = generateCityTitle("Tiranë", undefined, "sq");
    expect(title).toContain("Tiranë");
    expect(title).toContain("paluajtshme");
  });

  it("generates city + transaction type title", () => {
    const title = generateCityTitle("Tiranë", "sale", "sq");
    expect(title).toContain("Shitje");
    expect(title).toContain("Tiranë");
  });

  it("generates English city title", () => {
    const title = generateCityTitle("Tiranë", undefined, "en");
    expect(title).toContain("Real Estate");
    expect(title).toContain("Tiranë");
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx vitest run src/lib/seo/__tests__/metadata.test.ts`
Expected: FAIL

**Step 3: Implement metadata generators**

Create `web/src/lib/seo/metadata.ts`:

```ts
import type { Metadata } from "next";
import type { Listing } from "@/lib/types";
import { SITE_URL, SITE_NAME, PROPERTY_TYPE_SQ, PROPERTY_TYPE_EN, TRANSACTION_TYPE_SQ, TRANSACTION_TYPE_EN } from "./constants";
import { buildListingPath, cityToSlug } from "./slugs";

function formatPrice(price: number): string {
  return `€${price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`;
}

export function generateListingTitle(listing: Listing, lang: "sq" | "en"): string {
  const parts: string[] = [];

  if (lang === "sq") {
    if (listing.room_config) parts.push(listing.room_config);
    const type = listing.property_type ? PROPERTY_TYPE_SQ[listing.property_type] : null;
    if (type && !listing.room_config) parts.push(type);
    if (listing.city) parts.push(`në ${listing.city}`);
    if (listing.price != null) parts.push(`— ${formatPrice(listing.price)}`);
  } else {
    const type = listing.property_type ? PROPERTY_TYPE_EN[listing.property_type] ?? listing.property_type : null;
    if (listing.room_config && type) parts.push(`${listing.room_config} ${type}`);
    else if (type) parts.push(type);
    else if (listing.room_config) parts.push(listing.room_config);
    if (listing.city) parts.push(`in ${listing.city}`);
    if (listing.price != null) parts.push(`— ${formatPrice(listing.price)}`);
  }

  return parts.join(" ") || listing.title;
}

export function generateListingDescription(listing: Listing, lang: "sq" | "en"): string {
  const details: string[] = [];
  if (listing.room_config) details.push(listing.room_config);
  if (listing.area_sqm != null) details.push(`${listing.area_sqm} m²`);
  if (listing.city) details.push(lang === "sq" ? `në ${listing.city}` : `in ${listing.city}`);
  if (listing.neighborhood) details.push(listing.neighborhood);

  const priceStr = listing.price != null ? (lang === "sq"
    ? `Çmimi: ${formatPrice(listing.price)}.`
    : `Price: ${formatPrice(listing.price)}.`) : "";

  const suffix = lang === "sq"
    ? `Shiko foto dhe detaje në ${SITE_NAME}.`
    : `View photos and details on ${SITE_NAME}.`;

  return [details.join(", "), priceStr, suffix].filter(Boolean).join(" ");
}

export function generateCityTitle(
  city: string,
  transactionType: string | undefined,
  lang: "sq" | "en"
): string {
  if (lang === "sq") {
    if (transactionType) {
      const txLabel = TRANSACTION_TYPE_SQ[transactionType] ?? transactionType;
      return `${txLabel} në ${city} — Apartamente, shtëpi, vila`;
    }
    return `Pasuri të paluajtshme në ${city}`;
  }
  if (transactionType) {
    const txLabel = TRANSACTION_TYPE_EN[transactionType] ?? transactionType;
    return `Property for ${txLabel} in ${city}, Albania`;
  }
  return `Real Estate in ${city}, Albania`;
}

export function buildListingMetadata(listing: Listing): Metadata {
  const canonicalPath = buildListingPath(listing.title, listing.city, listing.id);
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const sqTitle = generateListingTitle(listing, "sq");
  const enTitle = generateListingTitle(listing, "en");
  const sqDesc = generateListingDescription(listing, "sq");
  const enDesc = generateListingDescription(listing, "en");
  const image = listing.images[0];

  return {
    title: sqTitle,
    description: sqDesc,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: enTitle,
      description: enDesc,
      url: canonicalUrl,
      type: "website",
      locale: "sq_AL",
      ...(image && { images: [{ url: image, alt: listing.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: enTitle,
      description: enDesc,
      ...(image && { images: [image] }),
    },
  };
}

export function buildCityMetadata(
  city: string,
  transactionType?: string
): Metadata {
  const citySlug = cityToSlug(city);
  const canonicalPath = transactionType
    ? `/${citySlug}/${transactionType === "sale" ? "shitje" : "qira"}`
    : `/${citySlug}`;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const sqTitle = generateCityTitle(city, transactionType, "sq");
  const enTitle = generateCityTitle(city, transactionType, "en");

  return {
    title: sqTitle,
    description: `${sqTitle}. Kërko njoftimet më të fundit në ${SITE_NAME}.`,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: enTitle,
      description: enTitle,
      url: canonicalUrl,
      locale: "sq_AL",
    },
  };
}
```

**Step 4: Run tests**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx vitest run src/lib/seo/__tests__/metadata.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/seo/metadata.ts src/lib/seo/__tests__/metadata.test.ts
git commit -m "feat(seo): add bilingual metadata generators for listings and city pages"
```

---

### Task 5: Update root layout metadata

**Files:**
- Modify: `web/src/app/layout.tsx` (lines 21–25)

**Step 1: Update the metadata export**

In `web/src/app/layout.tsx`, replace the existing metadata (lines 21–25) with:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://shtepial.al"),
  title: {
    template: "%s | ShtëpiAL",
    default: "ShtëpiAL — Gjej shtëpinë tënde në Shqipëri",
  },
  description:
    "Agregator i njoftimeve të pasurive të paluajtshme në Shqipëri. Kërko apartamente, shtëpi, vila dhe tokë nga të gjitha burimet në një vend.",
  openGraph: {
    siteName: "ShtëpiAL",
    locale: "sq_AL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "/",
  },
};
```

**Step 2: Verify types compile**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx tsc --noEmit 2>&1 | head -20`
Expected: No new type errors

**Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(seo): add metadataBase, title template, OG defaults to root layout"
```

---

### Task 6: Add robots.ts and sitemap.ts

**Files:**
- Create: `web/src/app/robots.ts`
- Create: `web/src/app/sitemap.ts`
- Modify: `web/src/lib/db/queries.ts` — add `getAllActiveListingSlugs()`
- Modify: `web/src/lib/db/seed.ts` — add `seedGetAllActiveListingSlugs()`

**Step 1: Add query for sitemap data**

Add to the end of `web/src/lib/db/queries.ts` (after the `getStats` function, around line 240):

```ts
export interface ListingSlugRow {
  id: string;
  title: string;
  city: string | null;
  last_seen: string;
}

export async function getAllActiveListingSlugs(): Promise<ListingSlugRow[]> {
  const db = getDb();
  if (!db) return seedGetAllActiveListingSlugs();

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      city: listings.city,
      lastSeen: listings.lastSeen,
    })
    .from(listings)
    .where(eq(listings.isActive, true))
    .orderBy(desc(listings.firstSeen));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    city: r.city,
    last_seen: r.lastSeen?.toISOString() ?? "",
  }));
}
```

Also update the import at the top of `queries.ts` (lines 5–10) to include `seedGetAllActiveListingSlugs`:

```ts
import {
  seedGetListings,
  seedGetListingById,
  seedSearchListings,
  seedGetStats,
  seedGetAllActiveListingSlugs,
} from "./seed";
```

**Step 2: Add seed fallback**

Add to the end of `web/src/lib/db/seed.ts` (after the `seedGetStats` function, around line 159):

```ts
export function seedGetAllActiveListingSlugs(): Array<{
  id: string;
  title: string;
  city: string | null;
  last_seen: string;
}> {
  return getSeedListings().map((l) => ({
    id: l.id,
    title: l.title,
    city: l.city,
    last_seen: l.last_seen,
  }));
}
```

**Step 3: Create robots.ts**

Create `web/src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth/", "/dashboard/", "/api/", "/listings/new"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
```

**Step 4: Create sitemap.ts**

Create `web/src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { SITE_URL, TRANSACTION_TYPE_URL } from "@/lib/seo/constants";
import { CITY_SLUGS, buildListingPath } from "@/lib/seo/slugs";
import { getAllActiveListingSlugs } from "@/lib/db/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/listings`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  const cityPages: MetadataRoute.Sitemap = Object.values(CITY_SLUGS).flatMap(
    (slug) => [
      { url: `${SITE_URL}/${slug}`, changeFrequency: "daily" as const, priority: 0.8 },
      ...Object.values(TRANSACTION_TYPE_URL).map((tx) => ({
        url: `${SITE_URL}/${slug}/${tx}`,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ]
  );

  const listingSlugs = await getAllActiveListingSlugs();
  const listingPages: MetadataRoute.Sitemap = listingSlugs.map((l) => ({
    url: `${SITE_URL}${buildListingPath(l.title, l.city, l.id)}`,
    lastModified: l.last_seen ? new Date(l.last_seen) : undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticPages, ...cityPages, ...listingPages];
}
```

**Step 5: Verify types compile**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx tsc --noEmit 2>&1 | head -30`
Expected: No new type errors

**Step 6: Commit**

```bash
git add src/app/robots.ts src/app/sitemap.ts src/lib/db/queries.ts src/lib/db/seed.ts
git commit -m "feat(seo): add robots.txt, dynamic sitemap, and listing slug query"
```

---

### Task 7: Create SEO-friendly listing detail route

**Files:**
- Create: `web/src/app/listings/[city]/[slug]/page.tsx`

This is the core SEO page. It resolves a listing from the 8-char UUID prefix in the slug, renders the detail page with full metadata and JSON-LD, and uses ISR caching.

**Step 1: Create the page**

Create `web/src/app/listings/[city]/[slug]/page.tsx` with the full listing detail page content. This mirrors the existing `listings/[id]/page.tsx` but adds:
- `generateMetadata()` that calls `buildListingMetadata()`
- `<JsonLd>` components for listing schema and breadcrumbs
- `export const revalidate = 3600` for ISR
- `resolveListingFromSlug()` that parses the 8-char hex suffix, queries by UUID prefix match
- Breadcrumb links pointing to city pages instead of query params

The page should:
1. Import from `@/lib/seo/slugs`: `parseSlugId`, `slugToCity`, `buildListingPath`
2. Import from `@/lib/seo/metadata`: `buildListingMetadata`
3. Import from `@/lib/seo/jsonld`: `buildListingJsonLd`, `buildBreadcrumbJsonLd`
4. Import from `@/lib/seo/constants`: `SITE_URL`
5. Import `JsonLd` from `@/components/JsonLd`
6. The `resolveListingFromSlug` function:
   - Calls `parseSlugId(slug)` to get 8-char hex prefix
   - If no DB: searches seed listings by `id.replace(/-/g, "").startsWith(shortId)`
   - If DB: queries `WHERE id::text LIKE '${shortId}%'` (single result)
   - Then calls `getListingById(fullId)` with the resolved UUID
7. All icon components and layout identical to existing `listings/[id]/page.tsx`
8. Breadcrumb links: `<Link href="/${params.city}">` instead of `<Link href="/listings?city=...">`

**Step 2: Verify types compile**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx tsc --noEmit 2>&1 | head -30`

**Step 3: Commit**

```bash
git add "src/app/listings/[city]/[slug]/page.tsx"
git commit -m "feat(seo): add SEO-friendly listing detail route with metadata, JSON-LD, ISR"
```

---

### Task 8: Convert old /listings/[id] to redirect

**Files:**
- Modify: `web/src/app/listings/[id]/page.tsx`

**Step 1: Replace the page with a redirect**

Replace the entire content of `web/src/app/listings/[id]/page.tsx` with a page that:
1. Calls `getListingById(params.id)`
2. If not found, calls `notFound()`
3. If found, calls `buildListingPath(listing.title, listing.city, listing.id)` and `redirect(canonicalPath)`

This ensures old bookmarks and external links still work via 301 redirect.

**Step 2: Remove `export const dynamic = "force-dynamic"` (no longer needed)**

**Step 3: Verify no type errors**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx tsc --noEmit 2>&1 | head -20`

**Step 4: Commit**

```bash
git add "src/app/listings/[id]/page.tsx"
git commit -m "feat(seo): convert /listings/[id] to 301 redirect to canonical slug URL"
```

---

### Task 9: Create city landing pages

**Files:**
- Create: `web/src/app/[city]/page.tsx`
- Create: `web/src/app/[city]/[transactionType]/page.tsx`

**Step 1: Create city landing page**

Create `web/src/app/[city]/page.tsx` that:
1. Uses `generateStaticParams()` returning all city slugs from `CITY_SLUGS`
2. Uses `generateMetadata()` calling `buildCityMetadata()`
3. Validates city slug via `slugToCity()` — returns `notFound()` for unknown slugs
4. Fetches listings via `getListings({ city: cityName, sort: "newest", limit: 24 })`
5. Renders heading, transaction type links (`/${city}/shitje`, `/${city}/qira`), listing grid
6. Uses `export const revalidate = 3600`

**Step 2: Create city + transaction type landing page**

Create `web/src/app/[city]/[transactionType]/page.tsx` that:
1. Uses `generateStaticParams()` combining all city slugs x [shitje, qira]
2. Validates both city slug and transaction type URL
3. Fetches filtered listings
4. Same layout pattern as city page

**Step 3: Commit**

```bash
git add "src/app/[city]/page.tsx" "src/app/[city]/[transactionType]/page.tsx"
git commit -m "feat(seo): add city and city+transaction landing pages with metadata"
```

---

### Task 10: Add homepage JSON-LD and ISR

**Files:**
- Modify: `web/src/app/page.tsx`

**Step 1: Replace `export const dynamic = "force-dynamic"` with `export const revalidate = 3600`**

**Step 2: Add imports for `JsonLd`, `buildWebsiteJsonLd`, `cityToSlug`**

**Step 3: Add `<JsonLd data={buildWebsiteJsonLd()} />` as first child in the return**

**Step 4: Update city quick links from `href={/listings?city=${city}}` to `href={/${cityToSlug(city)}}`**

**Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(seo): add WebSite JSON-LD and ISR to homepage, update city links"
```

---

### Task 11: Add noindex to auth and dashboard pages, listings index metadata

**Files:**
- Create: `web/src/app/auth/signin/layout.tsx`
- Create: `web/src/app/auth/register/layout.tsx`
- Create: `web/src/app/dashboard/layout.tsx`
- Create: `web/src/app/listings/new/layout.tsx`
- Create: `web/src/app/listings/layout.tsx`

Each auth/dashboard layout exports `robots: { index: false, follow: false }` metadata.
The listings layout exports a title and description with canonical `/listings`.

**Step 1: Create all layout files**

**Step 2: Commit**

```bash
git add src/app/auth/signin/layout.tsx src/app/auth/register/layout.tsx src/app/dashboard/layout.tsx src/app/listings/new/layout.tsx src/app/listings/layout.tsx
git commit -m "feat(seo): add noindex to auth/dashboard pages, add listings index metadata"
```

---

### Task 12: Update internal links to use SEO URLs

**Files:**
- Modify: `web/src/components/ListingCard.tsx` (line 33)
- Modify: `web/src/components/MapView.tsx` (line 108)
- Modify: `web/src/app/layout.tsx` — footer city links

**Step 1: Update ListingCard**

Add `import { buildListingPath } from "@/lib/seo/slugs"` and replace `href={/listings/${listing.id}}` with `href={buildListingPath(listing.title, listing.city, listing.id)}`.

**Step 2: Update MapView**

Same import and replacement for the map popup link.

**Step 3: Update footer city links**

Add `import { cityToSlug } from "@/lib/seo/slugs"` and replace `href={/listings?city=${encodeURIComponent(city)}}` with `href={/${cityToSlug(city)}}`.

**Step 4: Commit**

```bash
git add src/components/ListingCard.tsx src/components/MapView.tsx src/app/layout.tsx
git commit -m "feat(seo): update all internal links to use SEO-friendly URLs"
```

---

### Task 13: Run full test suite + build verification

**Step 1: Run all vitest tests**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx vitest run`
Expected: All tests PASS

**Step 2: Run Next.js build**

Run: `cd /home/yb97/src/projects/shtepi-al/.worktrees/seo-geo/web && npx next build 2>&1 | tail -40`
Expected: Build succeeds with new routes visible in output.

**Step 3: Fix any build errors found**

Common issues to check:
- Import paths with `@/` alias
- Type mismatches between page props
- Missing exports
- Conflicting route segments

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore(seo): fix build issues and verify full test suite passes"
```

---

## Dependency Graph

```
Task 1 (constants + vitest)
├── Task 2 (slugs) ← depends on Task 1
│   ├── Task 4 (metadata generators) ← depends on Task 2
│   │   └── Task 7 (listing detail page) ← depends on Task 2, 3, 4
│   │       └── Task 8 (old route redirect) ← depends on Task 7
│   ├── Task 6 (robots + sitemap) ← depends on Task 1, 2
│   ├── Task 9 (city pages) ← depends on Task 2, 4
│   ├── Task 10 (homepage SEO) ← depends on Task 2, 3
│   └── Task 12 (link updates) ← depends on Task 2
├── Task 3 (JSON-LD + component) ← depends on Task 1
├── Task 5 (root layout) ← no deps
├── Task 11 (noindex + listings meta) ← no deps
└── Task 13 (build verification) ← depends on all
```

**Parallel groups:**
- Group A (no deps): Tasks 1, 5, 11
- Group B (after Task 1): Tasks 2, 3
- Group C (after Task 2): Tasks 4, 6
- Group D (after Task 2+3+4): Tasks 7, 9, 10, 12
- Group E (after Task 7): Task 8
- Final: Task 13
