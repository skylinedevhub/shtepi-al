import { getDb } from "../db/drizzle";
import {
  cadastralZones,
  buildingPriceZones,
  landPrices,
  propertyValuations,
} from "../db/schema";
import { eq } from "drizzle-orm";
import type {
  CadastralZone,
  ValuationPropertyType,
  ValuationBreakdown,
} from "./types";
import { BUILDING_TYPES } from "./types";
import {
  SEED_ZONES,
  SEED_BUILDING_PRICES,
  SEED_ZONE_TO_PRICE_ZONE,
  SEED_LAND_PRICES,
} from "./seed";

const BUILDING_PRICE_COLUMN: Record<string, string> = {
  ndertese_banimi: "price_banimi",
  ndertese_tregtimi_sherbimi: "price_tregtimi",
  ndertese_industriale: "price_industriale",
  ndertese_bujqesore_blegtorale: "price_bujqesore_blegtorale",
};

export async function getValuationZones(): Promise<CadastralZone[]> {
  const db = getDb();
  if (!db) return SEED_ZONES;

  const rows = await db
    .select({
      zkNumer: cadastralZones.zkNumer,
      displayLabel: cadastralZones.displayLabel,
    })
    .from(cadastralZones)
    .orderBy(cadastralZones.zkNumer);

  return rows.map((r) => ({
    zk_numer: r.zkNumer,
    display_label: r.displayLabel ?? String(r.zkNumer),
  }));
}

export async function getBasePrice(
  zkNumer: number,
  propertyType: ValuationPropertyType
): Promise<number | null> {
  const isBuilding = (BUILDING_TYPES as string[]).includes(propertyType);
  const db = getDb();

  if (!db) {
    // Seed fallback
    if (isBuilding) {
      const priceZoneId = SEED_ZONE_TO_PRICE_ZONE[zkNumer];
      if (!priceZoneId) return null;
      const col = BUILDING_PRICE_COLUMN[propertyType];
      return SEED_BUILDING_PRICES[priceZoneId]?.[col] ?? null;
    }
    const landRow = SEED_LAND_PRICES[zkNumer];
    return landRow?.[propertyType] ?? null;
  }

  if (isBuilding) {
    const zone = await db
      .select({ buildingPriceZoneId: cadastralZones.buildingPriceZoneId })
      .from(cadastralZones)
      .where(eq(cadastralZones.zkNumer, zkNumer))
      .limit(1);

    const priceZoneId = zone[0]?.buildingPriceZoneId;
    if (!priceZoneId) return null;

    const priceRow = await db
      .select()
      .from(buildingPriceZones)
      .where(eq(buildingPriceZones.id, priceZoneId))
      .limit(1);

    if (!priceRow[0]) return null;
    const col = BUILDING_PRICE_COLUMN[propertyType] as keyof (typeof priceRow)[0];
    return (priceRow[0][col] as number) ?? null;
  }

  // Land type
  const landRow = await db
    .select()
    .from(landPrices)
    .where(eq(landPrices.zkNumer, zkNumer))
    .limit(1);

  if (!landRow[0]) return null;
  return (
    (landRow[0][propertyType as keyof (typeof landRow)[0]] as number) ?? null
  );
}

export async function saveValuation(params: {
  zkNumer: number;
  propertyNo: string | null;
  areaSqm: number;
  buildYear: number;
  propertyType: string;
  marketValueAll: number;
  referenceValueAll: number;
  breakdown: ValuationBreakdown;
  listingId?: string;
}): Promise<void> {
  const db = getDb();
  if (!db) return; // no-op in seed mode

  await db.insert(propertyValuations).values({
    zkNumer: params.zkNumer,
    propertyNo: params.propertyNo,
    areaSqm: params.areaSqm,
    buildYear: params.buildYear,
    propertyType: params.propertyType,
    marketValueAll: params.marketValueAll,
    referenceValueAll: params.referenceValueAll,
    breakdown: params.breakdown as unknown as Record<string, number>,
    listingId: params.listingId ?? null,
  });
}
