import { sql } from "drizzle-orm";
import type { SnapshotRow } from "./types";

export async function upsertSnapshotRows(
  db: { execute: (q: any) => Promise<any> },
  rows: SnapshotRow[],
): Promise<void> {
  if (rows.length === 0) return;

  for (const r of rows) {
    await db.execute(sql`
      INSERT INTO market_snapshots (
        snapshot_date, city, transaction_type, property_type,
        listing_count, avg_price_eur, median_price_eur,
        avg_price_sqm_eur, median_price_sqm_eur
      ) VALUES (
        ${r.snapshotDate}, ${r.city}, ${r.transactionType}, ${r.propertyType},
        ${r.listingCount}, ${r.avgPriceEur}, ${r.medianPriceEur},
        ${r.avgPriceSqmEur}, ${r.medianPriceSqmEur}
      )
      ON CONFLICT (snapshot_date, COALESCE(city, ''), transaction_type, COALESCE(property_type, ''))
      DO UPDATE SET
        listing_count = EXCLUDED.listing_count,
        avg_price_eur = EXCLUDED.avg_price_eur,
        median_price_eur = EXCLUDED.median_price_eur,
        avg_price_sqm_eur = EXCLUDED.avg_price_sqm_eur,
        median_price_sqm_eur = EXCLUDED.median_price_sqm_eur
    `);
  }
}
