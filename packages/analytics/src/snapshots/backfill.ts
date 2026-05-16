import { sql } from "drizzle-orm";
import { computeSnapshotRows } from "./compute";
import { upsertSnapshotRows } from "./persist";
import type { ListingForSnapshot } from "./types";

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export async function backfillSnapshots(
  db: { execute: (q: any) => Promise<any> },
  opts: { startDate?: string; endDate?: string; onDay?: (day: string, rows: number) => void } = {},
): Promise<{ daysProcessed: number; rowsWritten: number }> {
  const bounds: any = await db.execute(sql`
    SELECT MIN(first_seen)::date AS start_date FROM listings
  `);
  const startStr =
    opts.startDate ??
    (bounds.rows?.[0]?.start_date ?? bounds[0]?.start_date ?? null);
  if (!startStr) return { daysProcessed: 0, rowsWritten: 0 };

  const endStr = opts.endDate ?? new Date().toISOString().slice(0, 10);
  let day = new Date(startStr);
  const endDay = new Date(endStr);

  let daysProcessed = 0;
  let rowsWritten = 0;
  while (day <= endDay) {
    const D = ymd(day);
    const result: any = await db.execute(sql`
      SELECT
        l.id::text AS id,
        l.latitude::float AS latitude,
        l.longitude::float AS longitude,
        COALESCE(
          (
            SELECT ph.price::float
            FROM price_history ph
            WHERE ph.listing_id = l.id AND ph.recorded_at::date <= ${D}
            ORDER BY ph.recorded_at DESC
            LIMIT 1
          ),
          l.price::float
        ) AS price,
        l.area_sqm::float AS "areaSqm",
        l.transaction_type AS "transactionType",
        l.property_type AS "propertyType"
      FROM listings l
      WHERE l.first_seen::date <= ${D}
        AND (l.last_seen IS NULL OR l.last_seen::date >= ${D})
        AND l.transaction_type IN ('sale', 'rent')
    `);
    const listings: ListingForSnapshot[] = (result.rows ?? result) as ListingForSnapshot[];
    const rows = computeSnapshotRows(D, listings);
    await upsertSnapshotRows(db, rows);
    opts.onDay?.(D, rows.length);
    daysProcessed++;
    rowsWritten += rows.length;
    day = addDays(day, 1);
  }
  return { daysProcessed, rowsWritten };
}
