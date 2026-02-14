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
