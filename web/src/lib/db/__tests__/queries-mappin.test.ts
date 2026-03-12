import { describe, it, expect } from "vitest";
import type { MapPin } from "@/lib/types";

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
