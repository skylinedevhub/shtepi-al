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
