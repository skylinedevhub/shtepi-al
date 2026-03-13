import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "./drizzle";
import { listings } from "./schema";
import type { Listing, ListingFilters, ListingsResponse, Stats, MapPin } from "../types";
import {
  seedGetListings,
  seedGetListingById,
  seedSearchListings,
  seedGetMapListings,
  seedGetStats,
  seedGetAllActiveListingSlugs,
  seedGetListingByShortId,
} from "./seed";

type DbRow = typeof listings.$inferSelect;

function dbRowToListing(row: DbRow): Listing {
  return {
    id: row.id,
    source: row.source ?? "",
    source_url: row.sourceUrl ?? "",
    source_id: row.sourceId ?? "",
    title: row.title,
    description: row.description,
    price: row.price,
    price_all: row.priceAll,
    currency_original: row.currencyOriginal ?? "EUR",
    price_period: row.pricePeriod ?? "total",
    transaction_type: row.transactionType,
    property_type: row.propertyType ?? "",
    room_config: row.roomConfig,
    area_sqm: row.areaSqm,
    area_net_sqm: row.areaNetSqm,
    floor: row.floor,
    total_floors: row.totalFloors,
    rooms: row.rooms,
    bathrooms: row.bathrooms,
    city: row.city,
    neighborhood: row.neighborhood,
    address_raw: row.addressRaw,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    images: (row.images as string[]) ?? [],
    image_count: row.imageCount ?? 0,
    poster_name: row.posterName,
    poster_phone: row.posterPhone,
    poster_type: row.posterType ?? "private",
    is_active: row.isActive ?? true,
    first_seen: row.firstSeen?.toISOString() ?? "",
    last_seen: row.lastSeen?.toISOString() ?? "",
    created_at: row.createdAt?.toISOString() ?? null,
    has_elevator: row.hasElevator,
    has_parking: row.hasParking,
    is_furnished: row.isFurnished,
    is_new_build: row.isNewBuild,
  };
}

function buildFilterConditions(filters: ListingFilters) {
  const conditions = [eq(listings.isActive, true)];

  if (filters.city) conditions.push(eq(listings.city, filters.city));
  if (filters.transaction_type)
    conditions.push(eq(listings.transactionType, filters.transaction_type));
  if (filters.property_type)
    conditions.push(eq(listings.propertyType, filters.property_type));
  if (filters.price_min != null)
    conditions.push(gte(listings.price, filters.price_min));
  if (filters.price_max != null)
    conditions.push(lte(listings.price, filters.price_max));
  if (filters.rooms_min != null)
    conditions.push(gte(listings.rooms, filters.rooms_min));
  if (filters.rooms_max != null)
    conditions.push(lte(listings.rooms, filters.rooms_max));
  if (filters.area_min != null)
    conditions.push(gte(listings.areaSqm, filters.area_min));
  if (filters.area_max != null)
    conditions.push(lte(listings.areaSqm, filters.area_max));
  if (filters.neighborhood)
    conditions.push(eq(listings.neighborhood, filters.neighborhood));
  if (filters.source) conditions.push(eq(listings.source, filters.source));

  return conditions;
}

export async function getListings(
  filters: ListingFilters
): Promise<ListingsResponse> {
  const db = getDb();
  if (!db) return seedGetListings(filters);

  const where = and(...buildFilterConditions(filters));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listings)
    .where(where);
  const total = Number(countResult.count);

  let orderByClause;
  switch (filters.sort) {
    case "price_asc":
      orderByClause = asc(sql`price NULLS LAST`);
      break;
    case "price_desc":
      orderByClause = desc(sql`price NULLS LAST`);
      break;
    case "area_desc":
      orderByClause = desc(sql`area_sqm NULLS LAST`);
      break;
    case "newest":
    default:
      orderByClause = desc(listings.firstSeen);
  }

  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 24, 100);
  const offset = (page - 1) * limit;

  const rows = await db
    .select()
    .from(listings)
    .where(where)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  return {
    listings: rows.map(dbRowToListing),
    total,
    page,
    limit,
    has_more: offset + rows.length < total,
  };
}

/** Returns lightweight map pins for geocoded listings (no pagination). */
export async function getMapListings(
  filters: ListingFilters
): Promise<MapPin[]> {
  const db = getDb();
  if (!db) return seedGetMapListings(filters);

  const conditions = buildFilterConditions(filters);
  conditions.push(sql`${listings.latitude} IS NOT NULL`);
  conditions.push(sql`${listings.longitude} IS NOT NULL`);

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      price: listings.price,
      pricePeriod: listings.pricePeriod,
      roomConfig: listings.roomConfig,
      areaSqm: listings.areaSqm,
      city: listings.city,
      neighborhood: listings.neighborhood,
      latitude: listings.latitude,
      longitude: listings.longitude,
      firstImage: sql<string | null>`${listings.images}->>0`,
    })
    .from(listings)
    .where(and(...conditions));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    price: row.price,
    price_period: row.pricePeriod ?? "total",
    room_config: row.roomConfig,
    area_sqm: row.areaSqm,
    city: row.city,
    neighborhood: row.neighborhood,
    latitude: row.latitude!,
    longitude: row.longitude!,
    first_image: row.firstImage,
  }));
}

export async function getListingById(id: string): Promise<Listing | null> {
  const db = getDb();
  if (!db) return seedGetListingById(id);

  const [row] = await db.select().from(listings).where(eq(listings.id, id));
  return row ? dbRowToListing(row) : null;
}

export async function searchListings(
  query: string,
  limit: number = 24,
  page: number = 1
): Promise<ListingsResponse> {
  const db = getDb();
  if (!db) return seedSearchListings(query, limit, page);

  const offset = (page - 1) * limit;

  // Use stored search_vector column + GIN index
  const tsquery = sql`plainto_tsquery('simple', ${query})`;
  const searchCondition = sql`search_vector @@ ${tsquery}`;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listings)
    .where(and(eq(listings.isActive, true), searchCondition));
  const total = Number(countResult.count);

  const rows = await db
    .select()
    .from(listings)
    .where(and(eq(listings.isActive, true), searchCondition))
    .orderBy(desc(sql`ts_rank(search_vector, ${tsquery})`))
    .limit(limit)
    .offset(offset);

  return {
    listings: rows.map(dbRowToListing),
    total,
    page,
    limit,
    has_more: offset + rows.length < total,
  };
}

export async function getStats(): Promise<Stats> {
  const db = getDb();
  if (!db) return seedGetStats();

  // Single query: count + all group-bys via scalar subqueries (1 round trip)
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM listings WHERE is_active = true) AS total,
      (SELECT jsonb_object_agg(city, cnt) FROM (
        SELECT city, count(*)::int AS cnt FROM listings
        WHERE is_active = true AND city IS NOT NULL
        GROUP BY city ORDER BY cnt DESC
      ) t) AS by_city,
      (SELECT jsonb_object_agg(property_type, cnt) FROM (
        SELECT property_type, count(*)::int AS cnt FROM listings
        WHERE is_active = true AND property_type IS NOT NULL
        GROUP BY property_type ORDER BY cnt DESC
      ) t) AS by_type,
      (SELECT jsonb_object_agg(source, cnt) FROM (
        SELECT source, count(*)::int AS cnt FROM listings
        WHERE is_active = true AND source IS NOT NULL
        GROUP BY source ORDER BY cnt DESC
      ) t) AS by_source,
      (SELECT jsonb_object_agg(transaction_type, cnt) FROM (
        SELECT transaction_type, count(*)::int AS cnt FROM listings
        WHERE is_active = true AND transaction_type IS NOT NULL
        GROUP BY transaction_type ORDER BY cnt DESC
      ) t) AS by_transaction
  `);

  const row = (result as unknown as Record<string, unknown>[])[0] as {
    total: string | number;
    by_city: Record<string, number> | null;
    by_type: Record<string, number> | null;
    by_source: Record<string, number> | null;
    by_transaction: Record<string, number> | null;
  };

  return {
    total_listings: Number(row.total),
    by_city: row.by_city ?? {},
    by_type: row.by_type ?? {},
    by_source: row.by_source ?? {},
    by_transaction: row.by_transaction ?? {},
  };
}

interface ListingSlugRow {
  id: string;
  title: string;
  city: string | null;
  last_seen: string;
}

export async function getAllActiveListingSlugs(): Promise<ListingSlugRow[]> {
  const db = getDb();
  if (!db) return seedGetAllActiveListingSlugs();

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      city: listings.city,
      lastSeen: listings.lastSeen,
    })
    .from(listings)
    .where(eq(listings.isActive, true))
    .orderBy(desc(listings.firstSeen));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    city: r.city,
    last_seen: r.lastSeen?.toISOString() ?? "",
  }));
}

// React cache() deduplicates calls with same args within a single request.
// This prevents double DB hits from generateMetadata + page component.
export const getListingByShortId = cache(async function getListingByShortId(
  shortId: string
): Promise<Listing | null> {
  const db = getDb();
  if (!db) return seedGetListingByShortId(shortId);

  // Construct UUID range from 8-char hex prefix to leverage the PK index.
  // shortId "b902fe46" → range ["b902fe46-0000-...", "b902fe47-0000-...")
  const padded = shortId.padEnd(8, "0");
  const lowerUuid = `${padded}-0000-0000-0000-000000000000`;

  const lastChar = parseInt(padded[7], 16);
  if (lastChar >= 15) {
    // Edge case: 'f' suffix — fall back to text LIKE (rare)
    const [row] = await db
      .select()
      .from(listings)
      .where(sql`${listings.id}::text LIKE ${shortId + "%"}`)
      .limit(1);
    return row ? dbRowToListing(row) : null;
  }

  const nextPadded = padded.slice(0, 7) + (lastChar + 1).toString(16);
  const upperUuid = `${nextPadded}-0000-0000-0000-000000000000`;

  const [row] = await db
    .select()
    .from(listings)
    .where(
      and(
        sql`${listings.id} >= ${lowerUuid}::uuid`,
        sql`${listings.id} < ${upperUuid}::uuid`
      )
    )
    .limit(1);

  return row ? dbRowToListing(row) : null;
});
