import { describe, it, expect } from "vitest";
import { ALBANIAN_CITY_COORDS } from "../city-coords";
import { CITIES, QUICK_CITIES } from "../constants";
import { CITY_SLUGS, cityToSlug } from "../seo/slugs";

/**
 * Source of truth: scrapy_project/shtepi/city_coords.py
 * All 22 canonical cities must be present in every frontend file.
 */
const CANONICAL_CITIES = [
  "Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë",
  "Elbasan", "Fier", "Berat", "Lushnjë", "Kamëz", "Pogradec",
  "Kavajë", "Lezhë", "Gjirokastër", "Vorë", "Golem", "Himarë",
  "Ksamil", "Dhërmi", "Përmet", "Prishtinë",
];

/** Scraper source of truth coords for cross-check */
const SCRAPER_COORDS: Record<string, [number, number]> = {
  "Tiranë": [41.3275, 19.8187],
  "Durrës": [41.3246, 19.4565],
  "Vlorë": [40.4660, 19.4913],
  "Sarandë": [39.8661, 20.0050],
  "Shkodër": [42.0693, 19.5126],
  "Korçë": [40.6186, 20.7808],
  "Elbasan": [41.1125, 20.0822],
  "Fier": [40.7239, 19.5563],
  "Berat": [40.7058, 19.9522],
  "Lushnjë": [40.9419, 19.7050],
  "Kamëz": [41.3817, 19.7600],
  "Pogradec": [40.9025, 20.6525],
  "Kavajë": [41.1856, 19.5569],
  "Lezhë": [41.7836, 19.6436],
  "Gjirokastër": [40.0758, 20.1389],
  "Vorë": [41.3939, 19.6522],
  "Golem": [41.2514, 19.4756],
  "Himarë": [40.1008, 19.7453],
  "Ksamil": [39.7831, 20.0003],
  "Dhërmi": [40.1525, 19.6097],
  "Përmet": [40.2336, 20.3517],
  "Prishtinë": [42.6629, 21.1655],
};

describe("ALBANIAN_CITY_COORDS", () => {
  it("contains all 22 canonical cities", () => {
    for (const city of CANONICAL_CITIES) {
      expect(ALBANIAN_CITY_COORDS).toHaveProperty(city);
    }
    expect(Object.keys(ALBANIAN_CITY_COORDS)).toHaveLength(22);
  });

  it("coordinates are within Albania/Kosovo bounds (lat 39-43, lng 19-22)", () => {
    for (const [city, [lat, lng]] of Object.entries(ALBANIAN_CITY_COORDS)) {
      expect(lat, `${city} lat`).toBeGreaterThanOrEqual(39);
      expect(lat, `${city} lat`).toBeLessThanOrEqual(43);
      expect(lng, `${city} lng`).toBeGreaterThanOrEqual(19);
      expect(lng, `${city} lng`).toBeLessThanOrEqual(22);
    }
  });

  it("all city coords match the scraper source of truth", () => {
    for (const [city, [scraperLat, scraperLng]] of Object.entries(SCRAPER_COORDS)) {
      const frontendCoords = ALBANIAN_CITY_COORDS[city];
      expect(frontendCoords, `${city} missing from frontend`).toBeDefined();
      expect(frontendCoords[0]).toBeCloseTo(scraperLat, 4);
      expect(frontendCoords[1]).toBeCloseTo(scraperLng, 4);
    }
  });
});

describe("CITIES", () => {
  it("contains all 22 cities", () => {
    for (const city of CANONICAL_CITIES) {
      expect(CITIES, `missing ${city}`).toContain(city);
    }
    expect(CITIES).toHaveLength(22);
  });

  it("first 6 remain QUICK_CITIES (Tiranë, Durrës, Vlorë, Sarandë, Shkodër, Korçë)", () => {
    expect(CITIES.slice(0, 6)).toEqual([
      "Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë",
    ]);
  });
});

describe("QUICK_CITIES", () => {
  it("equals CITIES.slice(0, 6)", () => {
    expect(QUICK_CITIES).toEqual(CITIES.slice(0, 6));
  });
});

describe("CITY_SLUGS", () => {
  it("has an entry for every city in CITIES", () => {
    for (const city of CITIES) {
      expect(CITY_SLUGS, `missing slug for ${city}`).toHaveProperty(city);
    }
  });
});

describe("cross-file consistency", () => {
  it("every city in CITIES has coordinates in ALBANIAN_CITY_COORDS", () => {
    for (const city of CITIES) {
      expect(ALBANIAN_CITY_COORDS, `${city} missing coords`).toHaveProperty(city);
    }
  });

  it("every city in CITIES has a slug mapping", () => {
    for (const city of CITIES) {
      const slug = cityToSlug(city);
      expect(slug).not.toBe("shqiperi");
      expect(slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
