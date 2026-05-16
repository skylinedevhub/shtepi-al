import { getCityFromCoords } from "../geocoords/nearest-city";
import type { ListingForSnapshot, SnapshotRow } from "./types";

type GroupKey = string;

interface Group {
  city: string | null;
  transactionType: "sale" | "rent";
  propertyType: string | null;
  prices: number[];
  pricesPerSqm: number[];
}

function key(g: Pick<Group, "city" | "transactionType" | "propertyType">): GroupKey {
  return `${g.city ?? ""}|${g.transactionType}|${g.propertyType ?? ""}`;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function round2(n: number | null): number | null {
  return n === null ? null : Math.round(n * 100) / 100;
}

export function computeSnapshotRows(
  snapshotDate: string,
  listings: ListingForSnapshot[],
): SnapshotRow[] {
  const groups = new Map<GroupKey, Group>();

  const recordTo = (g: Group, price: number, pricePerSqm: number | null) => {
    g.prices.push(price);
    if (pricePerSqm !== null) g.pricesPerSqm.push(pricePerSqm);
  };

  for (const l of listings) {
    if (l.price === null || l.price <= 0) continue;
    const cityResult = getCityFromCoords(l.latitude, l.longitude);
    const cityName = cityResult?.city ?? null;
    const pricePerSqm =
      l.areaSqm && l.areaSqm > 0 ? l.price / l.areaSqm : null;

    const facets: Array<{
      city: string | null;
      propertyType: string | null;
    }> = [
      { city: null, propertyType: null },                     // national, all types
      { city: null, propertyType: l.propertyType ?? null },   // national, this type
    ];
    if (cityName !== null) {
      facets.push({ city: cityName, propertyType: null });    // city, all types
      facets.push({ city: cityName, propertyType: l.propertyType ?? null });
    }

    for (const f of facets) {
      const k = key({ ...f, transactionType: l.transactionType });
      const g = groups.get(k) ?? {
        ...f,
        transactionType: l.transactionType,
        prices: [],
        pricesPerSqm: [],
      };
      recordTo(g, l.price, pricePerSqm);
      groups.set(k, g);
    }
  }

  return [...groups.values()].map((g) => ({
    snapshotDate,
    city: g.city,
    transactionType: g.transactionType,
    propertyType: g.propertyType,
    listingCount: g.prices.length,
    avgPriceEur: round2(average(g.prices)),
    medianPriceEur: round2(median(g.prices)),
    avgPriceSqmEur: round2(average(g.pricesPerSqm)),
    medianPriceSqmEur: round2(median(g.pricesPerSqm)),
  }));
}
