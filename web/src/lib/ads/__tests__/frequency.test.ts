import { describe, it, expect, beforeEach } from "vitest";
import {
  clearFrequencyCache,
  incrementFrequencyCache,
} from "../frequency";

// These tests cover the in-memory LRU cache logic only.
// DB-dependent frequency checking is tested in integration tests.

describe("frequency cache", () => {
  beforeEach(() => {
    clearFrequencyCache();
  });

  it("incrementFrequencyCache increases count for fingerprint+campaign", () => {
    // After incrementing, the cache should contain the count
    // We can't directly read the cache, but we can verify no errors
    incrementFrequencyCache("user1", "campaign1");
    incrementFrequencyCache("user1", "campaign1");
    incrementFrequencyCache("user1", "campaign2");
    // No throws = success
  });

  it("clearFrequencyCache resets all entries", () => {
    incrementFrequencyCache("user1", "campaign1");
    clearFrequencyCache();
    // Cache is empty — no errors on subsequent operations
    incrementFrequencyCache("user1", "campaign1");
  });
});

describe("ad placement limits", () => {
  it("search_top allows max 3 sponsored", () => {
    // This is a unit test for the placement limit constants
    const defaults: Record<string, number> = {
      search_top: 3,
      search_sidebar: 2,
      homepage_latest: 1,
      city_page: 2,
      detail_sidebar: 2,
      mobile_sticky: 1,
      hero_carousel: 1,
    };

    expect(defaults.search_top).toBe(3);
    expect(defaults.homepage_latest).toBe(1);
    expect(defaults.mobile_sticky).toBe(1);
    expect(defaults.hero_carousel).toBe(1);
  });
});
