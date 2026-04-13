import type { CadastralZone } from "./types";

/** Sample cadastral zones for local dev without DATABASE_URL */
export const SEED_ZONES: CadastralZone[] = [
  { zk_numer: 8270, display_label: "8270 - Tirane Qender" },
  { zk_numer: 8271, display_label: "8271 - Tirane Njesia 2" },
  { zk_numer: 8272, display_label: "8272 - Tirane Njesia 5" },
  { zk_numer: 3290, display_label: "3290 - Durres Qender" },
  { zk_numer: 8561, display_label: "8561 - Vlore Qender" },
];

/** Sample building prices (Lek/m²) keyed by price zone ID */
export const SEED_BUILDING_PRICES: Record<number, Record<string, number>> = {
  1: {
    price_banimi: 159100,
    price_tregtimi: 170000,
    price_industriale: 120000,
    price_bujqesore_blegtorale: 90000,
  },
  2: {
    price_banimi: 130000,
    price_tregtimi: 145000,
    price_industriale: 100000,
    price_bujqesore_blegtorale: 75000,
  },
};

/** Sample zone → building price zone mapping */
export const SEED_ZONE_TO_PRICE_ZONE: Record<number, number> = {
  8270: 1,
  8271: 1,
  8272: 1,
  3290: 2,
  8561: 2,
};

/** Sample land prices (Lek/m²) keyed by zone number */
export const SEED_LAND_PRICES: Record<number, Record<string, number>> = {
  8270: { truall: 25000, kullote: 3000, bujqesore: 5000, pyll: 2000 },
  8271: { truall: 22000, kullote: 2800, bujqesore: 4500, pyll: 1800 },
  8272: { truall: 20000, kullote: 2500, bujqesore: 4000, pyll: 1500 },
  3290: { truall: 15000, kullote: 2000, bujqesore: 3500, pyll: 1200 },
  8561: { truall: 18000, kullote: 2200, bujqesore: 3800, pyll: 1400 },
};
