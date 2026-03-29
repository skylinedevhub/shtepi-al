import { describe, it, expect } from "vitest";
import { buildCityFilterHref } from "../slugs";

describe("buildCityFilterHref", () => {
  it("city breadcrumb href uses /listings?city= format", () => {
    expect(buildCityFilterHref("Durrës")).toBe("/listings?city=Durr%C3%ABs");
  });

  it("city breadcrumb href encodes diacritics (Tiranë → Tiran%C3%AB)", () => {
    expect(buildCityFilterHref("Tiranë")).toBe("/listings?city=Tiran%C3%AB");
  });

  it("city breadcrumb href returns /listings when city is null", () => {
    expect(buildCityFilterHref(null)).toBe("/listings");
  });

  it("city breadcrumb href returns /listings when city is empty", () => {
    expect(buildCityFilterHref("")).toBe("/listings");
  });

  it("works for cities without diacritics", () => {
    expect(buildCityFilterHref("Elbasan")).toBe("/listings?city=Elbasan");
  });
});
