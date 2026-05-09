import { eq, and, sql, desc, asc } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "../drizzle";
import { listings, priceHistory, profiles } from "../schema";
import type { Listing, ListingFilters, ListingsResponse, Stats, MapPin } from "../../types";
import {
  seedGetListings,
  seedGetListingById,
  seedSearchListings,
  seedGetMapListings,
  seedGetStats,
  seedGetAllActiveListingSlugs,
  seedGetListingByShortId,
  seedGetNeighborhoods,
} from "../seed";
import { dbRowToListing, buildFilterConditions } from "./_utils";

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

  // Ranking boost: when no explicit sort is chosen, agencies with active
  // subscriptions get priority based on their plan's ranking_boost (0-3).
  // Explicit sorts (price, area, newest) are user-chosen and bypass boost.
  const useRankingBoost = !filters.sort || filters.sort === "newest";
  const boostExpr = sql`COALESCE(
    (SELECT (p.features->>'ranking_boost')::int
     FROM agencies a
     JOIN subscriptions s ON s.agency_id = a.id AND s.status = 'active'
     JOIN plans p ON p.id = s.plan_id
     WHERE a.name = ${listings.posterName}
       AND ${listings.posterType} = 'agency'
     LIMIT 1
    ), 0)`;

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

  let rows;
  try {
    rows = await db
      .select()
      .from(listings)
      .where(where)
      .orderBy(
        ...(useRankingBoost
          ? [desc(boostExpr), orderByClause]
          : [orderByClause])
      )
      .limit(limit)
      .offset(offset);
  } catch {
    // Ranking boost subquery references subscriptions/plans tables which may
    // not exist yet if migration 0008 hasn't been run. Fall back to simple sort.
    rows = await db
      .select()
      .from(listings)
      .where(where)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);
  }

  const listingResults = rows.map(dbRowToListing);

  // Group enrichment (listing_group_id) is done on-demand via
  // getListingGroupInfo() on the detail page, not on list queries.
  // This avoids extra queries on the hot path and compatibility
  // issues when migration 0007 hasn't been run yet.

  return {
    listings: listingResults,
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

export async function getNeighborhoods(city: string): Promise<string[]> {
  const db = getDb();
  if (!db) return seedGetNeighborhoods(city);

  const rows = await db
    .selectDistinct({ neighborhood: listings.neighborhood })
    .from(listings)
    .where(
      and(
        eq(listings.city, city),
        eq(listings.isActive, true),
        sql`${listings.neighborhood} IS NOT NULL`,
        sql`${listings.neighborhood} != ''`
      )
    )
    .orderBy(listings.neighborhood);

  return rows.map((r) => r.neighborhood!);
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

// React cache() deduplicates calls with same args within a single request.
// This prevents double DB hits from generateMetadata + page component.
export const getListingByShortId = cache(async function getListingByShortId(
  shortId: string
): Promise<Listing | null> {
  const db = getDb();
  if (!db) return seedGetListingByShortId(shortId);

  // Construct UUID range from 8-char hex prefix to leverage the PK index.
  // shortId "b902fe46" -> range ["b902fe46-0000-...", "b902fe47-0000-...")
  const padded = shortId.padEnd(8, "0");
  const lowerUuid = `${padded}-0000-0000-0000-000000000000`;

  // Increment the hex prefix to form the upper bound.
  // Works for all values including 'f' suffix by carrying over.
  let carry = 1;
  const chars = padded.split("");
  for (let i = chars.length - 1; i >= 0 && carry; i--) {
    const val = parseInt(chars[i], 16) + carry;
    chars[i] = (val % 16).toString(16);
    carry = val >= 16 ? 1 : 0;
  }

  if (carry) {
    // All f's (ffffffff) — upper bound is max UUID
    const upperUuid = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const [row] = await db
      .select()
      .from(listings)
      .where(
        sql`${listings.id} >= ${lowerUuid}::uuid AND ${listings.id} <= ${upperUuid}::uuid`
      )
      .limit(1);
    return row ? dbRowToListing(row) : null;
  }

  const nextPadded = chars.join("");
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

// --- Listing Group queries ---

export interface ListingGroupMember {
  id: string;
  source: string;
  source_url: string;
  price: number | null;
}

export async function getListingGroupInfo(
  groupId: string
): Promise<ListingGroupMember[]> {
  const db = getDb();
  if (!db) return [];

  try {
    const rows = await db.execute(sql`
      SELECT id::text, source, source_url, price
      FROM listings
      WHERE listing_group_id = ${groupId}::uuid
        AND is_active = true
      ORDER BY image_count DESC NULLS LAST
    `);

    return (rows as unknown as { id: string; source: string; source_url: string; price: number | null }[]).map((r) => ({
      id: r.id,
      source: r.source ?? "",
      source_url: r.source_url ?? "",
      price: r.price,
    }));
  } catch {
    // listing_group_id column may not exist yet
    return [];
  }
}

// --- Price History queries ---

export interface PriceHistoryEntry {
  price: number;
  currency: string;
  recorded_at: string;
}

export async function getPriceHistory(
  listingId: string
): Promise<PriceHistoryEntry[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      price: priceHistory.price,
      currency: priceHistory.currency,
      recordedAt: priceHistory.recordedAt,
    })
    .from(priceHistory)
    .where(eq(priceHistory.listingId, listingId))
    .orderBy(asc(priceHistory.recordedAt));

  return rows.map((r) => ({
    price: r.price,
    currency: r.currency ?? "EUR",
    recorded_at: r.recordedAt?.toISOString() ?? "",
  }));
}

// --- Pending / moderation queries ---

export interface PendingListingsResponse {
  listings: (Listing & { user_email: string | null })[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export async function getPendingListings(
  page: number = 1,
  limit: number = 20
): Promise<PendingListingsResponse> {
  const db = getDb();
  if (!db)
    return { listings: [], total: 0, page, limit, has_more: false };

  const offset = (page - 1) * limit;

  const conditions = and(
    eq(listings.origin, "user"),
    eq(listings.status, "pending")
  );

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listings)
    .where(conditions);
  const total = Number(countResult.count);

  const rows = await db
    .select({
      listing: listings,
      userEmail: profiles.email,
    })
    .from(listings)
    .leftJoin(profiles, eq(listings.userId, profiles.id))
    .where(conditions)
    .orderBy(desc(listings.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    listings: rows.map((r) => ({
      ...dbRowToListing(r.listing),
      user_email: r.userEmail ?? null,
    })),
    total,
    page,
    limit,
    has_more: offset + rows.length < total,
  };
}

export async function updateListingStatus(
  id: string,
  status: "active" | "rejected" | "pending" | "draft" | "expired" | "archived",
  metadata?: Record<string, unknown>
): Promise<Listing | null> {
  const db = getDb();
  if (!db) return null;

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  // If active, also mark isActive
  if (status === "active") {
    updateData.isActive = true;
  } else if (status === "rejected" || status === "archived" || status === "expired") {
    updateData.isActive = false;
  }

  // Merge metadata if provided
  if (metadata) {
    updateData.metadata = sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify(metadata)}::jsonb`;
  }

  const [row] = await db
    .update(listings)
    .set(updateData)
    .where(eq(listings.id, id))
    .returning();

  return row ? dbRowToListing(row) : null;
}
