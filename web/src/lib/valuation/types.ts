// --- Property types for valuation (from Pasha calculator.py PROPERTY_TYPES) ---

export type BuildingType =
  | "ndertese_banimi"
  | "ndertese_tregtimi_sherbimi"
  | "ndertese_industriale"
  | "ndertese_bujqesore_blegtorale";

export type LandType = "truall" | "kullote" | "bujqesore" | "pyll";

export type ValuationPropertyType = BuildingType | LandType;

export interface ValuationPropertyTypeInfo {
  label: string;
  coef: number;
}

export const VALUATION_PROPERTY_TYPES: Record<
  ValuationPropertyType,
  ValuationPropertyTypeInfo
> = {
  ndertese_banimi: { label: "Ndertese banimi", coef: 1.0 },
  ndertese_tregtimi_sherbimi: {
    label: "Ndertese tregtimi & sherbimi",
    coef: 0.95,
  },
  ndertese_industriale: { label: "Ndertese industriale", coef: 1.05 },
  ndertese_bujqesore_blegtorale: {
    label: "Ndertese bujqesore & blegtorale",
    coef: 0.9,
  },
  truall: { label: "Truall", coef: 0.6 },
  kullote: { label: "Kullote", coef: 0.75 },
  bujqesore: { label: "Bujqesore", coef: 0.85 },
  pyll: { label: "Pyll", coef: 0.9 },
};

export const BUILDING_TYPES: BuildingType[] = [
  "ndertese_banimi",
  "ndertese_tregtimi_sherbimi",
  "ndertese_industriale",
  "ndertese_bujqesore_blegtorale",
];

export const LAND_TYPES: LandType[] = [
  "truall",
  "kullote",
  "bujqesore",
  "pyll",
];

/** Maps ShtëpiAL listing property_type → valuation property type (for Phase 2) */
export const LISTING_TO_VALUATION_TYPE: Record<string, ValuationPropertyType> =
  {
    apartment: "ndertese_banimi",
    house: "ndertese_banimi",
    villa: "ndertese_banimi",
    studio: "ndertese_banimi",
    commercial: "ndertese_tregtimi_sherbimi",
    garage: "ndertese_industriale",
    land: "truall",
  };

export interface ValuationInput {
  basePriceLekPerSqm: number;
  areaSqm: number;
  buildYear: number;
  propertyType: ValuationPropertyType;
  zkNumer: number;
}

export interface ValuationBreakdown {
  base_price: number;
  type_coef: number;
  position_coef: number;
  depreciation_coef: number;
  price_m2_adjusted: number;
}

export interface ValuationResult {
  market_value: number;
  reference_value: number;
  suggestion: string | null;
  breakdown: ValuationBreakdown;
}

export interface CadastralZone {
  zk_numer: number;
  display_label: string;
}
