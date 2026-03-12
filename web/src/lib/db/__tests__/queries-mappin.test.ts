import { describe, it, expect } from "vitest";
import type { MapPin } from "@/lib/types";
import { getListingByShortId } from "@/lib/db/queries";

describe("MapPin type", () => {
  it("has only the fields needed for map rendering", () => {
    const pin: MapPin = {
      id: "abc-123",
      title: "Test",
      price: 50000,
      price_period: "total",
      room_config: "2+1",
      area_sqm: 80,
      city: "Tiranë",
      neighborhood: "Blloku",
      latitude: 41.32,
      longitude: 19.82,
      first_image: "https://example.com/img.jpg",
    };
    expect(pin.id).toBeDefined();
    expect(pin.latitude).toBeDefined();
    expect(pin.longitude).toBeDefined();
    expect(pin.price).toBeDefined();
    expect(pin.first_image).toBeDefined();
    // Must NOT have full Listing fields
    expect((pin as Record<string, unknown>).description).toBeUndefined();
    expect((pin as Record<string, unknown>).source_url).toBeUndefined();
    expect((pin as Record<string, unknown>).images).toBeUndefined();
    expect((pin as Record<string, unknown>).poster_phone).toBeUndefined();
  });

  it("allows null for optional display fields", () => {
    const pin: MapPin = {
      id: "abc-123",
      title: "Test",
      price: null,
      price_period: "total",
      room_config: null,
      area_sqm: null,
      city: null,
      neighborhood: null,
      latitude: 41.32,
      longitude: 19.82,
      first_image: null,
    };
    expect(pin.price).toBeNull();
    expect(pin.first_image).toBeNull();
  });
});

describe("getListingByShortId", () => {
  it("returns a listing from seed data when matching prefix", async () => {
    const { seedGetListings } = await import("@/lib/db/seed");
    const seedResult = seedGetListings({ limit: 1 });
    if (seedResult.listings.length === 0) return;

    const fullId = seedResult.listings[0].id;
    const shortId = fullId.replace(/-/g, "").slice(0, 8);

    const result = await getListingByShortId(shortId);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(fullId);
  });

  it("returns null for non-existent short id", async () => {
    const result = await getListingByShortId("00000000");
    expect(result).toBeNull();
  });
});
