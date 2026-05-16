import { sql } from "drizzle-orm";
import { computeSnapshotRows } from "./compute";
import { upsertSnapshotRows } from "./persist";
import type { ListingForSnapshot } from "./types";

export async function writeDailySnapshot(
  db: { execute: (q: any) => Promise<any> },
  today: string = new Date().toISOString().slice(0, 10),
): Promise<{ rowsWritten: number }> {
  const result: any = await db.execute(sql`
    SELECT
      id::text AS id,
      latitude::float AS latitude,
      longitude::float AS longitude,
      price::float AS price,
      area_sqm::float AS "areaSqm",
      transaction_type AS "transactionType",
      property_type AS "propertyType"
    FROM listings
    WHERE is_active = true
      AND price IS NOT NULL
      AND transaction_type IN ('sale', 'rent')
  `);

  const listings: ListingForSnapshot[] = (result.rows ?? result) as ListingForSnapshot[];
  const rows = computeSnapshotRows(today, listings);
  await upsertSnapshotRows(db, rows);
  return { rowsWritten: rows.length };
}
