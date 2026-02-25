import snapshot from "./live-snapshot.json";

export interface Listing {
  id: string;
  source: string;
  source_url: string;
  title: string;
  price: number | null;
  currency_original: string;
  transaction_type: string;
  property_type: string;
  room_config: string | null;
  area_sqm: number | null;
  rooms: number | null;
  bathrooms: number | null;
  city: string | null;
  neighborhood: string | null;
  images: string[];
  image_count: number;
  poster_name: string | null;
  is_new_build: boolean | null;
  is_furnished: boolean | null;
  has_elevator: boolean | null;
  has_parking: boolean | null;
  first_seen: string;
}

/**
 * Live production stats from /api/stats — 16,258 active listings.
 * These are the REAL numbers, not the 130-listing sample.
 */
export const liveStats = snapshot.stats as {
  total_listings: number;
  by_city: Record<string, number>;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
  by_transaction: Record<string, number>;
};

export const allListings: Listing[] = (snapshot.listings as Record<string, unknown>[]).map(
  (item) => ({
    id: item.id as string,
    source: (item.source as string) ?? "",
    source_url: (item.source_url as string) ?? "",
    title: (item.title as string) ?? "",
    price: item.price as number | null,
    currency_original: (item.currency_original as string) ?? "EUR",
    transaction_type: (item.transaction_type as string) ?? "sale",
    property_type: (item.property_type as string) ?? "",
    room_config: item.room_config as string | null,
    area_sqm: item.area_sqm as number | null,
    rooms: item.rooms as number | null,
    bathrooms: item.bathrooms as number | null,
    city: item.city as string | null,
    neighborhood: item.neighborhood as string | null,
    images: (item.images as string[]) ?? [],
    image_count: (item.image_count as number) ?? 0,
    poster_name: item.poster_name as string | null,
    is_new_build: item.is_new_build as boolean | null,
    is_furnished: item.is_furnished as boolean | null,
    has_elevator: item.has_elevator as boolean | null,
    has_parking: item.has_parking as boolean | null,
    first_seen: (item.first_seen as string) ?? "",
  })
);

/** Listings with at least one image and a price */
export const listingsWithImages = allListings.filter(
  (l) => l.images.length > 0 && l.price !== null
);

/** Get the real live stats (from production /api/stats) */
export function getStats() {
  const s = liveStats;

  // Clean city names: merge "Tiranë" + "Tirane" + "Tirane Vendndodhja..."
  const cityMap: Record<string, number> = {};
  for (const [raw, count] of Object.entries(s.by_city)) {
    const clean = normalizeCityName(raw);
    cityMap[clean] = (cityMap[clean] || 0) + count;
  }

  const topCities = Object.entries(cityMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    totalActive: s.total_listings,
    forSale: s.by_transaction.sale ?? 0,
    forRent: s.by_transaction.rent ?? 0,
    sources: Object.keys(s.by_source).length,
    bySource: s.by_source,
    byType: s.by_type,
    avgPrice: computeAvgSalePrice(),
    topCities,
  };
}

/** Compute avg sale price from the 130-listing sample */
function computeAvgSalePrice(): number {
  const sales = allListings.filter(
    (l) => l.transaction_type === "sale" && l.price !== null && l.price > 1000
  );
  if (sales.length === 0) return 0;
  return Math.round(
    sales.reduce((sum, l) => sum + (l.price ?? 0), 0) / sales.length
  );
}

/** Normalize messy city names from the DB */
function normalizeCityName(raw: string): string {
  let name = raw.replace(/\s*Vendndodhja në hartë\s*/i, "").trim();
  // Handle ASCII variants
  const map: Record<string, string> = {
    tirane: "Tiranë",
    durres: "Durrës",
    vlore: "Vlorë",
    shkoder: "Shkodër",
    korce: "Korçë",
    sarande: "Sarandë",
    lushnje: "Lushnjë",
    kavaje: "Kavajë",
    kamez: "Kamëz",
    lezhe: "Lezhë",
    gjirokaster: "Gjirokastër",
    prishtine: "Prishtinë",
    himare: "Himarë",
    kurbin: "Kurbin",
    kruje: "Krujë",
    permet: "Përmet",
    peje: "Pejë",
    kuçove: "Kuçovë",
  };
  const lower = name.toLowerCase();
  if (map[lower]) return map[lower];
  return name;
}

/** Price data by source (from real production stats + sample prices) */
export function priceBySource() {
  const sourceMap: Record<string, { sale: number[]; rent: number[]; total: number }> = {};
  for (const l of allListings) {
    if (!sourceMap[l.source]) sourceMap[l.source] = { sale: [], rent: [], total: 0 };
    sourceMap[l.source].total++;
    if (l.price && l.price > 100 && l.transaction_type === "sale")
      sourceMap[l.source].sale.push(l.price);
    if (l.price && l.price > 50 && l.transaction_type === "rent")
      sourceMap[l.source].rent.push(l.price);
  }

  return Object.entries(sourceMap)
    .map(([name, data]) => ({
      name,
      realTotal: liveStats.by_source[name] ?? data.total,
      saleCount: data.sale.length,
      rentCount: data.rent.length,
      avgSale:
        data.sale.length > 0
          ? Math.round(data.sale.reduce((a, b) => a + b, 0) / data.sale.length)
          : 0,
      avgRent:
        data.rent.length > 0
          ? Math.round(data.rent.reduce((a, b) => a + b, 0) / data.rent.length)
          : 0,
    }))
    .sort((a, b) => b.realTotal - a.realTotal);
}
