import {
  VALUATION_PROPERTY_TYPES,
  BUILDING_TYPES,
  type ValuationInput,
  type ValuationResult,
  type ValuationBreakdown,
} from "./types";

/**
 * Deterministic position coefficient from zone number.
 * Uses Knuth's multiplicative hash to produce values in [0.85, 1.15].
 * Identical to pashalegalservices/core/calculator.py _get_position_coefficient().
 */
export function getPositionCoefficient(zkNumer: number): number {
  const hashValue = Math.abs((zkNumer * 2654435761) % 2 ** 32);
  const normalized = (hashValue % 1000) / 1000;
  const coef = 0.85 + normalized * 0.3;
  return Math.round(coef * 100) / 100;
}

/**
 * Age-based depreciation factor for buildings.
 * Land properties always return 1.0.
 * Identical to pashalegalservices/core/calculator.py _depreciation_factor().
 */
export function getDepreciationFactor(
  buildYear: number,
  isBuilding: boolean
): number {
  if (!isBuilding) return 1.0;
  const age = Math.max(0, new Date().getFullYear() - buildYear);
  if (age <= 5) return 0.98;
  if (age <= 10) return 0.95;
  if (age <= 20) return 0.9;
  if (age <= 30) return 0.85;
  if (age <= 40) return 0.82;
  return 0.8;
}

/**
 * Pure valuation calculation — no DB access, no side effects.
 * Caller provides basePriceLekPerSqm from DB lookup.
 */
export function calculateValuation(input: ValuationInput): ValuationResult {
  const { basePriceLekPerSqm, areaSqm, buildYear, propertyType, zkNumer } =
    input;

  const isBuilding = (BUILDING_TYPES as string[]).includes(propertyType);
  const typeCoef = VALUATION_PROPERTY_TYPES[propertyType].coef;
  const positionCoef = getPositionCoefficient(zkNumer);
  const depreciationCoef = getDepreciationFactor(buildYear, isBuilding);

  const priceM2Adjusted =
    basePriceLekPerSqm * typeCoef * positionCoef * depreciationCoef;
  const marketValue = areaSqm * priceM2Adjusted;
  const referenceValue = areaSqm * basePriceLekPerSqm * 0.85;

  let suggestion: string | null = null;
  if (referenceValue > 0) {
    const diffRatio =
      Math.abs(marketValue - referenceValue) / referenceValue;
    if (diffRatio >= 0.15) {
      suggestion =
        marketValue > referenceValue
          ? "Kjo prone mund te kerkoje rivleresim prane ASHK per te reflektuar vleren e tregut."
          : "Per dokumentacion ligjor mund te perdoret vlera e references; cmimi i tregut rezulton me i ulet.";
    }
  }

  const breakdown: ValuationBreakdown = {
    base_price: basePriceLekPerSqm,
    type_coef: typeCoef,
    position_coef: positionCoef,
    depreciation_coef: depreciationCoef,
    price_m2_adjusted: priceM2Adjusted,
  };

  return {
    market_value: marketValue,
    reference_value: referenceValue,
    suggestion,
    breakdown,
  };
}
