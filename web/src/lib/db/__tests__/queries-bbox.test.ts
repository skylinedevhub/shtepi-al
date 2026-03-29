import { describe, it, expect } from "vitest";
import { seedGetMapListings } from "../seed";
import type { ListingFilters } from "../../types";

describe("seedGetMapListings with bbox", () => {
  it("returns only pins within bounds", () => {
    const allPins = seedGetMapListings({});
    if (allPins.length === 0) {
      // No geocoded listings in seed — verify empty bbox also returns empty
      const pins = seedGetMapListings({
        sw_lat: 41.3, sw_lng: 19.7, ne_lat: 41.4, ne_lng: 19.9,
      });
      expect(pins).toEqual([]);
      return;
    }
    // Tiranë area bounding box — should be a subset
    const pins = seedGetMapListings({
      sw_lat: 41.3,
      sw_lng: 19.7,
      ne_lat: 41.4,
      ne_lng: 19.9,
    });
    for (const pin of pins) {
      expect(pin.latitude).toBeGreaterThanOrEqual(41.3);
      expect(pin.latitude).toBeLessThanOrEqual(41.4);
      expect(pin.longitude).toBeGreaterThanOrEqual(19.7);
      expect(pin.longitude).toBeLessThanOrEqual(19.9);
    }
  });

  it("without bbox returns all geocoded pins (backward compatible)", () => {
    const withBbox = seedGetMapListings({
      sw_lat: 39,
      sw_lng: 19,
      ne_lat: 43,
      ne_lng: 22,
    });
    const withoutBbox = seedGetMapListings({});
    // Albania-wide bbox should return same as no bbox
    expect(withBbox.length).toBe(withoutBbox.length);
  });

  it("with bbox covering empty area returns empty array", () => {
    const pins = seedGetMapListings({
      sw_lat: 0,
      sw_lng: 0,
      ne_lat: 1,
      ne_lng: 1,
    });
    expect(pins).toEqual([]);
  });

  it("includes pins on bbox boundary (uses >= / <=)", () => {
    const allPins = seedGetMapListings({});
    if (allPins.length === 0) return;

    const pin = allPins[0];
    const result = seedGetMapListings({
      sw_lat: pin.latitude,
      sw_lng: pin.longitude,
      ne_lat: pin.latitude,
      ne_lng: pin.longitude,
    });
    expect(result.some((p) => p.id === pin.id)).toBe(true);
  });

  it("bbox fields are accepted in ListingFilters type", () => {
    // Type-level test: verify the fields exist
    const filters: ListingFilters = {
      sw_lat: 41.0,
      sw_lng: 19.0,
      ne_lat: 42.0,
      ne_lng: 20.0,
    };
    expect(filters.sw_lat).toBe(41.0);
    expect(filters.sw_lng).toBe(19.0);
    expect(filters.ne_lat).toBe(42.0);
    expect(filters.ne_lng).toBe(20.0);
  });
});
