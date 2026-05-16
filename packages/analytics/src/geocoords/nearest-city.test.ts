import { describe, it, expect } from "vitest";
import { getCityFromCoords, haversineKm } from "./nearest-city";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm(41.3275, 19.8187, 41.3275, 19.8187)).toBeCloseTo(0, 3);
  });

  it("computes Tiranë → Durrës distance ~33 km", () => {
    const d = haversineKm(41.3275, 19.8187, 41.3246, 19.4565);
    expect(d).toBeGreaterThan(28);
    expect(d).toBeLessThan(38);
  });
});

describe("getCityFromCoords", () => {
  it("returns Tiranë for Tiranë centre coords", () => {
    const result = getCityFromCoords(41.3275, 19.8187);
    expect(result?.city).toBe("Tiranë");
    expect(result?.distanceKm).toBeLessThan(1);
  });

  it("returns Durrës for a coord near Durrës", () => {
    const result = getCityFromCoords(41.32, 19.46);
    expect(result?.city).toBe("Durrës");
  });

  it("returns null when coords are far from any Albanian city (Rome)", () => {
    const result = getCityFromCoords(41.9028, 12.4964);
    expect(result).toBeNull();
  });

  it("returns null when coords are 0,0", () => {
    const result = getCityFromCoords(0, 0);
    expect(result).toBeNull();
  });

  it("respects custom maxKm threshold", () => {
    // A point ~10 km south of Tiranë should match with maxKm=15 but not maxKm=5.
    // (Going north would land closer to Kamëz, which is a separate centroid.)
    const lat = 41.2375;
    const lng = 19.8187;
    expect(getCityFromCoords(lat, lng, 15)?.city).toBe("Tiranë");
    expect(getCityFromCoords(lat, lng, 5)).toBeNull();
  });
});
