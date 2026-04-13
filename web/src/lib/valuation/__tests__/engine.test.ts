import { describe, it, expect } from "vitest";
import {
  getPositionCoefficient,
  getDepreciationFactor,
  calculateValuation,
} from "../engine";

describe("getPositionCoefficient", () => {
  it("returns a value between 0.85 and 1.15", () => {
    for (const zk of [100, 500, 1001, 2500, 9999]) {
      const coef = getPositionCoefficient(zk);
      expect(coef).toBeGreaterThanOrEqual(0.85);
      expect(coef).toBeLessThanOrEqual(1.15);
    }
  });

  it("is deterministic — same zk always returns same coefficient", () => {
    const a = getPositionCoefficient(1001);
    const b = getPositionCoefficient(1001);
    expect(a).toBe(b);
  });

  it("different zones produce different coefficients", () => {
    const a = getPositionCoefficient(100);
    const b = getPositionCoefficient(200);
    expect(a).not.toBe(b);
  });
});

describe("getDepreciationFactor", () => {
  const currentYear = new Date().getFullYear();

  it("returns 0.98 for buildings <= 5 years old", () => {
    expect(getDepreciationFactor(currentYear - 3, true)).toBe(0.98);
    expect(getDepreciationFactor(currentYear, true)).toBe(0.98);
  });

  it("returns 0.95 for buildings 6-10 years old", () => {
    expect(getDepreciationFactor(currentYear - 7, true)).toBe(0.95);
    expect(getDepreciationFactor(currentYear - 10, true)).toBe(0.95);
  });

  it("returns 0.90 for buildings 11-20 years old", () => {
    expect(getDepreciationFactor(currentYear - 15, true)).toBe(0.9);
    expect(getDepreciationFactor(currentYear - 20, true)).toBe(0.9);
  });

  it("returns 0.85 for buildings 21-30 years old", () => {
    expect(getDepreciationFactor(currentYear - 25, true)).toBe(0.85);
  });

  it("returns 0.82 for buildings 31-40 years old", () => {
    expect(getDepreciationFactor(currentYear - 35, true)).toBe(0.82);
  });

  it("returns 0.80 for buildings > 40 years old", () => {
    expect(getDepreciationFactor(currentYear - 50, true)).toBe(0.8);
  });

  it("returns 1.0 for land (no depreciation)", () => {
    expect(getDepreciationFactor(currentYear - 50, false)).toBe(1.0);
  });

  it("handles future build year gracefully (age 0)", () => {
    expect(getDepreciationFactor(currentYear + 2, true)).toBe(0.98);
  });
});

describe("calculateValuation", () => {
  it("calculates building valuation with all coefficients", () => {
    const result = calculateValuation({
      basePriceLekPerSqm: 100000,
      areaSqm: 100,
      buildYear: new Date().getFullYear() - 3,
      propertyType: "ndertese_banimi",
      zkNumer: 1001,
    });

    const posCoef = result.breakdown.position_coef;
    const expectedAdj = 100000 * 1.0 * posCoef * 0.98;
    expect(result.market_value).toBeCloseTo(100 * expectedAdj, 0);
    expect(result.reference_value).toBeCloseTo(100 * 100000 * 0.85, 0);
    expect(result.breakdown.base_price).toBe(100000);
    expect(result.breakdown.type_coef).toBe(1.0);
    expect(result.breakdown.depreciation_coef).toBe(0.98);
  });

  it("calculates land valuation without depreciation", () => {
    const result = calculateValuation({
      basePriceLekPerSqm: 5000,
      areaSqm: 500,
      buildYear: 1990,
      propertyType: "truall",
      zkNumer: 500,
    });

    expect(result.breakdown.depreciation_coef).toBe(1.0);
    expect(result.breakdown.type_coef).toBe(0.6);
    const posCoef = result.breakdown.position_coef;
    const expectedAdj = 5000 * 0.6 * posCoef * 1.0;
    expect(result.market_value).toBeCloseTo(500 * expectedAdj, 0);
    expect(result.reference_value).toBeCloseTo(500 * 5000 * 0.85, 0);
  });

  it("produces suggestion when market > reference by >= 15%", () => {
    const result = calculateValuation({
      basePriceLekPerSqm: 100000,
      areaSqm: 100,
      buildYear: new Date().getFullYear(),
      propertyType: "ndertese_industriale",
      zkNumer: 1001,
    });

    const ratio =
      Math.abs(result.market_value - result.reference_value) /
      result.reference_value;
    if (ratio >= 0.15) {
      expect(result.suggestion).toBeTruthy();
      expect(typeof result.suggestion).toBe("string");
    }
    if (ratio < 0.15) {
      expect(result.suggestion).toBeNull();
    }
  });

  it("returns null suggestion when values are close", () => {
    const result = calculateValuation({
      basePriceLekPerSqm: 100000,
      areaSqm: 100,
      buildYear: new Date().getFullYear() - 25,
      propertyType: "ndertese_banimi",
      zkNumer: 1001,
    });

    const ratio =
      Math.abs(result.market_value - result.reference_value) /
      result.reference_value;
    if (ratio < 0.15) {
      expect(result.suggestion).toBeNull();
    }
  });

  it("handles zero area", () => {
    const result = calculateValuation({
      basePriceLekPerSqm: 100000,
      areaSqm: 0,
      buildYear: 2020,
      propertyType: "ndertese_banimi",
      zkNumer: 1001,
    });
    expect(result.market_value).toBe(0);
    expect(result.reference_value).toBe(0);
  });
});
