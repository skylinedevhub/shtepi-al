import { describe, it, expect } from "vitest";
import { seedGetStats } from "@/lib/db/seed";
import type { Stats } from "@/lib/types";

describe("getStats shape", () => {
  it("returns all required stat categories", () => {
    const stats: Stats = seedGetStats();
    expect(stats.total_listings).toBeGreaterThan(0);
    expect(typeof stats.by_city).toBe("object");
    expect(typeof stats.by_type).toBe("object");
    expect(typeof stats.by_source).toBe("object");
    expect(typeof stats.by_transaction).toBe("object");
  });

  it("has numeric values in all category maps", () => {
    const stats = seedGetStats();
    for (const count of Object.values(stats.by_city)) {
      expect(typeof count).toBe("number");
      expect(count).toBeGreaterThan(0);
    }
  });

  it("total equals sum of by_transaction values", () => {
    const stats = seedGetStats();
    const transactionSum = Object.values(stats.by_transaction).reduce((a, b) => a + b, 0);
    expect(transactionSum).toBe(stats.total_listings);
  });
});
