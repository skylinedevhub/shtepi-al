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
