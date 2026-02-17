import { PROPERTY_TYPE_SQ } from "./seo/constants";

export const CITIES = [
  "Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë",
  "Elbasan", "Fier", "Berat", "Lushnjë", "Kamëz", "Pogradec",
];

export const QUICK_CITIES = CITIES.slice(0, 6);

export const PROPERTY_TYPES = Object.entries(PROPERTY_TYPE_SQ).map(
  ([value, label]) => ({ value, label })
);
