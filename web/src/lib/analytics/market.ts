/**
 * Market analytics engine.
 *
 * Calculates price indices, trends, and market metrics from listing data.
 * Powers both the market data dashboard (€199/mo) and API (€499/mo).
 */

import { sql, eq, and, gte, lte, desc } from "drizzle-orm";
import { getDb } from "../db/drizzle";
import { listings } from "../db/schema";

export interface CityMetrics {
  city: string;
  avg_price_sqm: number | null;
  median_price: number | null;
  total_listings: number;
  sale_count: number;
  rent_count: number;
  avg_rent_sqm: number | null;
  rent_yield: number | null; // annual rent / sale price
}

export interface MarketOverview {
  cities: CityMetrics[];
  total_listings: number;
  national_avg_price_sqm: number | null;
  generated_at: string;
}

export interface PriceTrend {
  period: string; // YYYY-MM
  avg_price_sqm: number;
  median_price: number;
  listing_count: number;
}

/** Calculate market metrics for all cities. */
export async function getMarketOverview(): Promise<MarketOverview> {
  const db = getDb();
  if (!db) {
    return {
      cities: [],
      total_listings: 0,
      national_avg_price_sqm: null,
      generated_at: new Date().toISOString(),
    };
  }

  const rows = await db
    .select({
      city: listings.city,
      avgPriceSqm: sql<number>`AVG(CASE WHEN ${listings.areaSqm} > 0 AND ${listings.transactionType} = 'sale' THEN ${listings.price} / ${listings.areaSqm} END)`,
      medianPrice: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${listings.price}) FILTER (WHERE ${listings.price} IS NOT NULL)`,
      totalListings: sql<number>`count(*)`,
      saleCount: sql<number>`count(*) FILTER (WHERE ${listings.transactionType} = 'sale')`,
      rentCount: sql<number>`count(*) FILTER (WHERE ${listings.transactionType} = 'rent')`,
      avgRentSqm: sql<number>`AVG(CASE WHEN ${listings.areaSqm} > 0 AND ${listings.transactionType} = 'rent' THEN ${listings.price} / ${listings.areaSqm} END)`,
    })
    .from(listings)
    .where(eq(listings.isActive, true))
    .groupBy(listings.city)
    .orderBy(sql`count(*) DESC`);

  const cities: CityMetrics[] = rows
    .filter((r) => r.city != null)
    .map((r) => {
      const avgSale = r.avgPriceSqm ? Number(r.avgPriceSqm) : null;
      const avgRent = r.avgRentSqm ? Number(r.avgRentSqm) : null;

      // Rent yield = (monthly_rent_sqm * 12) / sale_price_sqm
      let rentYield: number | null = null;
      if (avgSale && avgRent && avgSale > 0) {
        rentYield = Math.round(((avgRent * 12) / avgSale) * 1000) / 10; // percentage with 1 decimal
      }

      return {
        city: r.city!,
        avg_price_sqm: avgSale ? Math.round(avgSale) : null,
        median_price: r.medianPrice ? Math.round(Number(r.medianPrice)) : null,
        total_listings: Number(r.totalListings),
        sale_count: Number(r.saleCount),
        rent_count: Number(r.rentCount),
        avg_rent_sqm: avgRent ? Math.round(avgRent * 100) / 100 : null,
        rent_yield: rentYield,
      };
    });

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listings)
    .where(eq(listings.isActive, true));

  const nationalAvg = cities.length > 0
    ? Math.round(
        cities.reduce((sum, c) => sum + (c.avg_price_sqm ?? 0) * c.sale_count, 0) /
          Math.max(1, cities.reduce((sum, c) => sum + (c.avg_price_sqm ? c.sale_count : 0), 0))
      )
    : null;

  return {
    cities,
    total_listings: Number(totalResult.count),
    national_avg_price_sqm: nationalAvg || null,
    generated_at: new Date().toISOString(),
  };
}

/** Get city-specific metrics with price distribution. */
export async function getCityMetrics(city: string): Promise<{
  metrics: CityMetrics | null;
  price_distribution: { bucket: string; count: number }[];
}> {
  const overview = await getMarketOverview();
  const metrics = overview.cities.find((c) => c.city === city) ?? null;

  const db = getDb();
  if (!db || !metrics) {
    return { metrics, price_distribution: [] };
  }

  // Price distribution buckets
  const buckets = await db
    .select({
      bucket: sql<string>`CASE
        WHEN ${listings.price} < 50000 THEN '0-50k'
        WHEN ${listings.price} < 100000 THEN '50-100k'
        WHEN ${listings.price} < 200000 THEN '100-200k'
        WHEN ${listings.price} < 500000 THEN '200-500k'
        ELSE '500k+'
      END`,
      count: sql<number>`count(*)`,
    })
    .from(listings)
    .where(
      and(
        eq(listings.isActive, true),
        eq(listings.city, city),
        eq(listings.transactionType, "sale"),
        sql`${listings.price} IS NOT NULL`
      )
    )
    .groupBy(sql`1`)
    .orderBy(sql`MIN(${listings.price})`);

  return {
    metrics,
    price_distribution: buckets.map((b) => ({
      bucket: b.bucket,
      count: Number(b.count),
    })),
  };
}

/** Calculate a simple inventory depth metric. */
export async function getInventoryDepth(): Promise<
  { city: string; active: number; new_this_month: number; deactivated_this_month: number }[]
> {
  const db = getDb();
  if (!db) return [];

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const rows = await db
    .select({
      city: listings.city,
      active: sql<number>`count(*) FILTER (WHERE ${listings.isActive} = true)`,
      newThisMonth: sql<number>`count(*) FILTER (WHERE ${listings.firstSeen} >= ${monthAgo.toISOString()})`,
      deactivated: sql<number>`count(*) FILTER (WHERE ${listings.isActive} = false AND ${listings.lastSeen} >= ${monthAgo.toISOString()})`,
    })
    .from(listings)
    .groupBy(listings.city)
    .orderBy(sql`count(*) FILTER (WHERE ${listings.isActive} = true) DESC`);

  return rows
    .filter((r) => r.city != null)
    .map((r) => ({
      city: r.city!,
      active: Number(r.active),
      new_this_month: Number(r.newThisMonth),
      deactivated_this_month: Number(r.deactivated),
    }));
}
