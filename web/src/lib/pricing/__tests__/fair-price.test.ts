import { describe, it, expect } from "vitest";
import {
  calculateFairPriceScore,
  MARKET_AVERAGES,
  DEFAULT_AVERAGE,
} from "../fair-price";

describe("calculateFairPriceScore", () => {
  it("returns green for price below market average in Tiranë", () => {
    // €1,000/m² vs Tiranë avg €1,200/m² → ~17% below
    const result = calculateFairPriceScore(1000, "Tiranë", "apartment", "sale");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("green");
    expect(result!.score).toBeLessThan(-5);
    expect(result!.label).toContain("nën mesataren");
  });

  it("returns red for price above market average in Tiranë", () => {
    // €1,500/m² vs Tiranë avg €1,200/m² → 25% above
    const result = calculateFairPriceScore(1500, "Tiranë", "apartment", "sale");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("red");
    expect(result!.score).toBeGreaterThan(5);
    expect(result!.label).toContain("mbi mesataren");
  });

  it("returns yellow for price near market average", () => {
    // €1,200/m² vs Tiranë avg €1,200/m² → 0%
    const result = calculateFairPriceScore(1200, "Tiranë", "apartment", "sale");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("yellow");
    expect(result!.label).toBe("afër mesatares");
  });

  it("returns null for missing price data", () => {
    const result = calculateFairPriceScore(null, "Tiranë", "apartment", "sale");
    expect(result).toBeNull();
  });

  it("returns null for zero price", () => {
    const result = calculateFairPriceScore(0, "Tiranë", "apartment", "sale");
    expect(result).toBeNull();
  });

  it("returns null for negative price", () => {
    const result = calculateFairPriceScore(-50, "Tiranë", "apartment", "sale");
    expect(result).toBeNull();
  });

  it("uses default average for unknown cities", () => {
    // €600/m² vs default avg €800/m² → 25% below
    const result = calculateFairPriceScore(600, "Korçë", "apartment", "sale");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("green");
    expect(result!.score).toBeLessThan(-5);
  });

  it("uses rent averages for rental listings", () => {
    // €10/m² vs Tiranë rent avg €8/m² → 25% above
    const result = calculateFairPriceScore(10, "Tiranë", "apartment", "rent");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("red");
    expect(result!.score).toBeGreaterThan(5);
  });

  it("uses default rent average for unknown city rentals", () => {
    // €4/m² vs default rent avg €5/m² → 20% below
    const result = calculateFairPriceScore(4, "Elbasan", "apartment", "rent");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("green");
  });

  it("handles Durrës correctly", () => {
    // €900/m² = Durrës average → near
    const result = calculateFairPriceScore(900, "Durrës", "apartment", "sale");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("yellow");
  });

  it("handles Vlorë correctly", () => {
    // €800/m² vs Vlorë avg €1,100/m² → ~27% below
    const result = calculateFairPriceScore(800, "Vlorë", "apartment", "sale");
    expect(result).not.toBeNull();
    expect(result!.color).toBe("green");
  });

  it("rounds score to whole number", () => {
    const result = calculateFairPriceScore(1000, "Tiranë", "apartment", "sale");
    expect(result).not.toBeNull();
    expect(Number.isInteger(result!.score)).toBe(true);
  });

  it("has hardcoded averages for 3 cities", () => {
    expect(Object.keys(MARKET_AVERAGES)).toHaveLength(3);
    expect(MARKET_AVERAGES["Tiranë"]).toBeDefined();
    expect(MARKET_AVERAGES["Durrës"]).toBeDefined();
    expect(MARKET_AVERAGES["Vlorë"]).toBeDefined();
  });

  it("default average is lower than major city averages", () => {
    expect(DEFAULT_AVERAGE.sale).toBeLessThan(MARKET_AVERAGES["Tiranë"].sale);
    expect(DEFAULT_AVERAGE.rent).toBeLessThan(MARKET_AVERAGES["Tiranë"].rent);
  });
});
