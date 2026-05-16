import { sql } from "drizzle-orm";

export interface CityMetrics {
  city: string;
  avg_price_sqm: number | null;
  median_price: number | null;
  total_listings: number;
  sale_count: number;
  rent_count: number;
  avg_rent_sqm: number | null;
  rent_yield: number | null;
}

export interface MarketOverview {
  cities: CityMetrics[];
  total_listings: number;
  national_avg_price_sqm: number | null;
  generated_at: string;
}

export async function getMarketOverview(
  db: { execute: (q: any) => Promise<any> } | null,
): Promise<MarketOverview> {
  if (!db) {
    return {
      cities: [],
      total_listings: 0,
      national_avg_price_sqm: null,
      generated_at: new Date().toISOString(),
    };
  }

  const result: any = await db.execute(sql`
    SELECT
      city,
      AVG(CASE WHEN area_sqm > 0 AND transaction_type = 'sale' THEN price / area_sqm END) AS avg_price_sqm,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) FILTER (WHERE price IS NOT NULL) AS median_price,
      COUNT(*) AS total_listings,
      COUNT(*) FILTER (WHERE transaction_type = 'sale') AS sale_count,
      COUNT(*) FILTER (WHERE transaction_type = 'rent') AS rent_count,
      AVG(CASE WHEN area_sqm > 0 AND transaction_type = 'rent' THEN price / area_sqm END) AS avg_rent_sqm
    FROM listings
    WHERE is_active = true
    GROUP BY city
    ORDER BY COUNT(*) DESC
  `);

  const rows = (result.rows ?? result) as any[];

  const cities: CityMetrics[] = rows
    .filter((r) => r.city != null)
    .map((r) => {
      const avgSale = r.avg_price_sqm ? Number(r.avg_price_sqm) : null;
      const avgRent = r.avg_rent_sqm ? Number(r.avg_rent_sqm) : null;
      let rentYield: number | null = null;
      if (avgSale && avgRent && avgSale > 0) {
        rentYield = Math.round(((avgRent * 12) / avgSale) * 1000) / 10;
      }
      return {
        city: r.city as string,
        avg_price_sqm: avgSale ? Math.round(avgSale) : null,
        median_price: r.median_price ? Math.round(Number(r.median_price)) : null,
        total_listings: Number(r.total_listings),
        sale_count: Number(r.sale_count),
        rent_count: Number(r.rent_count),
        avg_rent_sqm: avgRent ? Math.round(avgRent * 100) / 100 : null,
        rent_yield: rentYield,
      };
    });

  const totalResult: any = await db.execute(sql`
    SELECT COUNT(*) AS count FROM listings WHERE is_active = true
  `);
  const totalCount = Number(
    (totalResult.rows ?? totalResult)[0]?.count ?? 0,
  );

  const nationalAvg =
    cities.length > 0
      ? Math.round(
          cities.reduce((sum, c) => sum + (c.avg_price_sqm ?? 0) * c.sale_count, 0) /
            Math.max(1, cities.reduce((sum, c) => sum + (c.avg_price_sqm ? c.sale_count : 0), 0)),
        )
      : null;

  return {
    cities,
    total_listings: totalCount,
    national_avg_price_sqm: nationalAvg || null,
    generated_at: new Date().toISOString(),
  };
}
