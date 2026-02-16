import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";
import { getDb } from "./drizzle";
import { listings } from "./schema";
import type { Listing, ListingFilters, ListingsResponse, Stats } from "../types";
import {
  seedGetListings,
  seedGetListingById,
  seedSearchListings,
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

export async function getListings(
  filters: ListingFilters
): Promise<ListingsResponse> {
  const db = getDb();
  if (!db) return seedGetListings(filters);

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

  const where = and(...conditions);

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

  const activeFilter = eq(listings.isActive, true);

  const [totalResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listings)
    .where(activeFilter);
  const total = Number(totalResult.count);

  const cityRows = await db
    .select({
      city: listings.city,
      count: sql<number>`count(*)`,
    })
    .from(listings)
    .where(and(activeFilter, sql`city IS NOT NULL`))
    .groupBy(listings.city)
    .orderBy(desc(sql`count(*)`));

  const typeRows = await db
    .select({
      propertyType: listings.propertyType,
      count: sql<number>`count(*)`,
    })
    .from(listings)
    .where(activeFilter)
    .groupBy(listings.propertyType)
    .orderBy(desc(sql`count(*)`));

  const sourceRows = await db
    .select({
      source: listings.source,
      count: sql<number>`count(*)`,
    })
    .from(listings)
    .where(activeFilter)
    .groupBy(listings.source)
    .orderBy(desc(sql`count(*)`));

  const transactionRows = await db
    .select({
      transactionType: listings.transactionType,
      count: sql<number>`count(*)`,
    })
    .from(listings)
    .where(activeFilter)
    .groupBy(listings.transactionType)
    .orderBy(desc(sql`count(*)`));

  return {
    total_listings: total,
    by_city: Object.fromEntries(
      cityRows.map((r) => [r.city, Number(r.count)])
    ),
    by_type: Object.fromEntries(
      typeRows.map((r) => [r.propertyType, Number(r.count)])
    ),
    by_source: Object.fromEntries(
      sourceRows.map((r) => [r.source, Number(r.count)])
    ),
    by_transaction: Object.fromEntries(
      transactionRows.map((r) => [r.transactionType, Number(r.count)])
    ),
  };
}

export interface ListingSlugRow {
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

export async function getListingByShortId(
  shortId: string
): Promise<Listing | null> {
  const db = getDb();
  if (!db) return seedGetListingByShortId(shortId);

  const [row] = await db
    .select()
    .from(listings)
    .where(sql`${listings.id}::text LIKE ${shortId + "%"}`)
    .limit(1);

  return row ? dbRowToListing(row) : null;
}
