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
