import { describe, it, expect } from "vitest";
import { computeSnapshotRows } from "./compute";
import type { ListingForSnapshot } from "./types";

const tiranaSale = (price: number, area: number): ListingForSnapshot => ({
  id: crypto.randomUUID(),
  latitude: 41.3275,
  longitude: 19.8187,
  price,
  areaSqm: area,
  transactionType: "sale",
  propertyType: "apartment",
});

describe("computeSnapshotRows", () => {
  it("returns empty when listings is empty", () => {
    expect(computeSnapshotRows("2026-05-16", [])).toEqual([]);
  });

  it("computes per-city + national rollup rows", () => {
    const rows = computeSnapshotRows("2026-05-16", [
      tiranaSale(100_000, 100),
      tiranaSale(200_000, 100),
    ]);
    const tirana = rows.find((r) => r.city === "Tiranë" && r.propertyType === "apartment");
    const national = rows.find((r) => r.city === null && r.propertyType === null);
    expect(tirana?.listingCount).toBe(2);
    expect(tirana?.avgPriceEur).toBe(150_000);
    expect(tirana?.medianPriceEur).toBe(150_000);
    expect(tirana?.avgPriceSqmEur).toBe(1_500);
    expect(national?.listingCount).toBe(2);
  });

  it("excludes listings with no coords from city series but keeps them in national", () => {
    const rows = computeSnapshotRows("2026-05-16", [
      tiranaSale(100_000, 100),
      {
        id: "no-coords",
        latitude: null,
        longitude: null,
        price: 200_000,
        areaSqm: 100,
        transactionType: "sale",
        propertyType: "apartment",
      },
    ]);
    const tirana = rows.find((r) => r.city === "Tiranë" && r.propertyType === "apartment");
    const nationalAll = rows.find(
      (r) => r.city === null && r.transactionType === "sale" && r.propertyType === null,
    );
    expect(tirana?.listingCount).toBe(1);
    expect(nationalAll?.listingCount).toBe(2);
    expect(nationalAll?.avgPriceEur).toBe(150_000);
  });

  it("computes median for odd-count groups", () => {
    const rows = computeSnapshotRows("2026-05-16", [
      tiranaSale(100_000, 100),
      tiranaSale(150_000, 100),
      tiranaSale(300_000, 100),
    ]);
    const tirana = rows.find(
      (r) => r.city === "Tiranë" && r.propertyType === "apartment",
    );
    expect(tirana?.medianPriceEur).toBe(150_000);
  });

  it("produces sale and rent rows independently", () => {
    const rows = computeSnapshotRows("2026-05-16", [
      tiranaSale(100_000, 100),
      {
        id: crypto.randomUUID(),
        latitude: 41.3275,
        longitude: 19.8187,
        price: 500,
        areaSqm: 50,
        transactionType: "rent",
        propertyType: "apartment",
      },
    ]);
    expect(
      rows.find((r) => r.city === "Tiranë" && r.transactionType === "sale")?.listingCount,
    ).toBe(1);
    expect(
      rows.find((r) => r.city === "Tiranë" && r.transactionType === "rent")?.listingCount,
    ).toBe(1);
  });
});
