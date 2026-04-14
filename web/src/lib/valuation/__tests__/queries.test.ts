import { describe, it, expect } from "vitest";
import { getValuationZones, getBasePrice } from "../queries";

describe("getValuationZones (seed fallback)", () => {
  it("returns a non-empty list of zones", async () => {
    const zones = await getValuationZones();
    expect(zones.length).toBeGreaterThan(0);
  });

  it("each zone has zk_numer and display_label", async () => {
    const zones = await getValuationZones();
    for (const z of zones) {
      expect(typeof z.zk_numer).toBe("number");
      expect(typeof z.display_label).toBe("string");
      expect(z.display_label.length).toBeGreaterThan(0);
    }
  });
});

describe("getBasePrice (seed fallback)", () => {
  it("returns building price for a known zone + building type", async () => {
    const price = await getBasePrice(8270, "ndertese_banimi");
    expect(price).toBeGreaterThan(0);
  });

  it("returns land price for a known zone + land type", async () => {
    const price = await getBasePrice(8270, "truall");
    expect(price).toBeGreaterThan(0);
  });

  it("returns null for an unknown zone", async () => {
    const price = await getBasePrice(99999, "ndertese_banimi");
    expect(price).toBeNull();
  });

  it("returns correct seed prices", async () => {
    // Seed: zone 8270 (Q.TIRANE) → building price zone → price_banimi = 103500
    const buildingPrice = await getBasePrice(8270, "ndertese_banimi");
    expect(buildingPrice).toBe(103500);

    // Seed: zone 8270 (Q.TIRANE) → truall = 66969
    const landPrice = await getBasePrice(8270, "truall");
    expect(landPrice).toBe(66969);
  });

  it("returns different prices for different zones", async () => {
    // 8270 = Q.TIRANE (Tirana), 3290 = SELISHTE (Pogradec) — different municipalities
    const tiranaPrice = await getBasePrice(8270, "ndertese_banimi");
    const pogradecPrice = await getBasePrice(3290, "ndertese_banimi");
    expect(tiranaPrice).not.toBe(pogradecPrice);
  });
});
