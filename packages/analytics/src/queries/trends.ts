import { sql } from "drizzle-orm";

export interface TrendPoint {
  period: string;
  avgPriceSqmEur: number | null;
  medianPriceEur: number | null;
  listingCount: number;
}

export interface PriceTrend {
  city: string | null;
  transactionType: "sale" | "rent";
  propertyType: string | null;
  days: number;
  points: TrendPoint[];
}

export interface TrendQuery {
  city: string | null;
  transactionType: "sale" | "rent";
  propertyType?: string | null;
  days: number;
}

export async function getPriceTrends(
  db: { execute: (q: any) => Promise<any> } | null,
  q: TrendQuery,
): Promise<PriceTrend> {
  const empty: PriceTrend = {
    city: q.city,
    transactionType: q.transactionType,
    propertyType: q.propertyType ?? null,
    days: q.days,
    points: [],
  };
  if (!db) return empty;

  const propertyType = q.propertyType ?? null;
  const result: any = await db.execute(sql`
    SELECT
      snapshot_date::text AS snapshot_date,
      avg_price_sqm_eur,
      median_price_eur,
      listing_count
    FROM market_snapshots
    WHERE ${q.city === null ? sql`city IS NULL` : sql`city = ${q.city}`}
      AND transaction_type = ${q.transactionType}
      AND ${propertyType === null ? sql`property_type IS NULL` : sql`property_type = ${propertyType}`}
      AND snapshot_date >= CURRENT_DATE - INTERVAL '1 day' * ${q.days}
    ORDER BY snapshot_date ASC
  `);

  const rows = (result.rows ?? result) as Array<{
    snapshot_date: string;
    avg_price_sqm_eur: string | number | null;
    median_price_eur: string | number | null;
    listing_count: number;
  }>;

  return {
    ...empty,
    points: rows.map((r) => ({
      period: r.snapshot_date,
      avgPriceSqmEur: r.avg_price_sqm_eur === null ? null : Number(r.avg_price_sqm_eur),
      medianPriceEur: r.median_price_eur === null ? null : Number(r.median_price_eur),
      listingCount: Number(r.listing_count),
    })),
  };
}
