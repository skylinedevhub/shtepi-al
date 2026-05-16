export interface ListingForSnapshot {
  id: string;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  areaSqm: number | null;
  transactionType: "sale" | "rent";
  propertyType: string | null;
}

export interface SnapshotRow {
  snapshotDate: string;
  city: string | null;
  transactionType: "sale" | "rent";
  propertyType: string | null;
  listingCount: number;
  avgPriceEur: number | null;
  medianPriceEur: number | null;
  avgPriceSqmEur: number | null;
  medianPriceSqmEur: number | null;
}
