import { describe, it, expect } from "vitest";
import { getPriceTrends } from "./trends";

describe("getPriceTrends", () => {
  it("returns empty trend when db is null", async () => {
    const trend = await getPriceTrends(null, {
      city: "Tiranë",
      transactionType: "sale",
      days: 30,
    });
    expect(trend.points).toEqual([]);
    expect(trend.city).toBe("Tiranë");
    expect(trend.transactionType).toBe("sale");
  });

  it("maps DB rows into points", async () => {
    const fakeDb = {
      execute: async () => ({
        rows: [
          {
            snapshot_date: "2026-05-14",
            avg_price_sqm_eur: "1500.00",
            median_price_eur: "120000.00",
            listing_count: 42,
          },
          {
            snapshot_date: "2026-05-15",
            avg_price_sqm_eur: "1510.50",
            median_price_eur: "121000.00",
            listing_count: 45,
          },
        ],
      }),
    };
    const trend = await getPriceTrends(fakeDb as any, {
      city: "Tiranë",
      transactionType: "sale",
      days: 30,
    });
    expect(trend.points).toHaveLength(2);
    expect(trend.points[0]).toEqual({
      period: "2026-05-14",
      avgPriceSqmEur: 1500,
      medianPriceEur: 120000,
      listingCount: 42,
    });
    expect(trend.points[1].avgPriceSqmEur).toBe(1510.5);
  });

  it("queries national rollup when city is null", async () => {
    // Drizzle's sql template tags produce a nested object — flatten queryChunks
    // recursively to capture the underlying SQL text for inspection.
    const flatten = (chunk: any): string => {
      if (chunk === null || chunk === undefined) return "";
      if (typeof chunk === "string") return chunk;
      if (Array.isArray(chunk)) return chunk.map(flatten).join(" ");
      if (Array.isArray(chunk.value)) return chunk.value.map(flatten).join(" ");
      if (typeof chunk.value === "string") return chunk.value;
      if (Array.isArray(chunk.queryChunks)) return chunk.queryChunks.map(flatten).join(" ");
      return "";
    };
    let capturedSql = "";
    const fakeDb = {
      execute: async (q: any) => {
        capturedSql = flatten(q);
        return { rows: [] };
      },
    };
    await getPriceTrends(fakeDb as any, {
      city: null,
      transactionType: "rent",
      days: 30,
    });
    expect(capturedSql.toLowerCase()).toContain("city is null");
  });
});
