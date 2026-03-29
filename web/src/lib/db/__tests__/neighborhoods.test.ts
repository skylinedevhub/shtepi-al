import { describe, it, expect } from "vitest";
import { seedGetNeighborhoods } from "../seed";

describe("seedGetNeighborhoods", () => {
  it("returns distinct neighborhoods for a city with listings", () => {
    const result = seedGetNeighborhoods("Tiranë");
    expect(result.length).toBeGreaterThan(0);
    // No duplicates
    expect(new Set(result).size).toBe(result.length);
  });

  it("returns empty array for city with no neighborhoods", () => {
    const result = seedGetNeighborhoods("FakeCity");
    expect(result).toEqual([]);
  });

  it("returns empty array when no city given", () => {
    const result = seedGetNeighborhoods("");
    expect(result).toEqual([]);
  });

  it("excludes null/empty neighborhoods", () => {
    const result = seedGetNeighborhoods("Tiranë");
    for (const n of result) {
      expect(n).toBeTruthy();
      expect(n.trim()).not.toBe("");
    }
  });

  it("returns sorted results", () => {
    const result = seedGetNeighborhoods("Tiranë");
    const sorted = [...result].sort((a, b) => a.localeCompare(b, "sq"));
    expect(result).toEqual(sorted);
  });
});
