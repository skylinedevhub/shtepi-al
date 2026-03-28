import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "./drizzle";
import { listings, profiles, favorites, priceHistory, agencies } from "./schema";
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
    listing_group_id: null,
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

// --- Favorites queries ---

export async function getUserFavorites(
  userId: string,
  page: number = 1,
  limit: number = 24
): Promise<ListingsResponse> {
  const db = getDb();
  if (!db)
    return { listings: [], total: 0, page, limit, has_more: false };

  const offset = (page - 1) * limit;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .where(and(eq(favorites.userId, userId), eq(listings.isActive, true)));
  const total = Number(countResult.count);

  const rows = await db
    .select({ listing: listings })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .where(and(eq(favorites.userId, userId), eq(listings.isActive, true)))
    .orderBy(desc(favorites.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    listings: rows.map((r) => dbRowToListing(r.listing)),
    total,
    page,
    limit,
    has_more: offset + rows.length < total,
  };
}

export async function isFavorited(
  userId: string,
  listingId: string
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const [row] = await db
    .select({ n: sql<number>`1` })
    .from(favorites)
    .where(
      and(eq(favorites.userId, userId), eq(favorites.listingId, listingId))
    )
    .limit(1);

  return !!row;
}

export async function toggleFavorite(
  userId: string,
  listingId: string
): Promise<{ favorited: boolean }> {
  const db = getDb();
  if (!db) return { favorited: false };

  const existing = await isFavorited(userId, listingId);

  if (existing) {
    await db
      .delete(favorites)
      .where(
        and(eq(favorites.userId, userId), eq(favorites.listingId, listingId))
      );
    return { favorited: false };
  } else {
    await db.insert(favorites).values({ userId, listingId });
    return { favorited: true };
  }
}

export async function getUserFavoriteIds(userId: string): Promise<string[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({ listingId: favorites.listingId })
    .from(favorites)
    .where(eq(favorites.userId, userId));

  return rows.map((r) => r.listingId);
}

// --- Admin queries ---

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

export async function getUserProfile(userId: string) {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId));

  return row ?? null;
}

export interface AdminStats {
  pending_count: number;
  active_user_listings: number;
  total_users: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const db = getDb();
  if (!db)
    return { pending_count: 0, active_user_listings: 0, total_users: 0 };

  const result = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM listings WHERE origin = 'user' AND status = 'pending')::int AS pending_count,
      (SELECT count(*) FROM listings WHERE origin = 'user' AND status = 'active')::int AS active_user_listings,
      (SELECT count(*) FROM profiles)::int AS total_users
  `);

  const row = (result as unknown as Record<string, unknown>[])[0] as {
    pending_count: number;
    active_user_listings: number;
    total_users: number;
  };

  return {
    pending_count: row.pending_count,
    active_user_listings: row.active_user_listings,
    total_users: row.total_users,
  };
}

// --- Agency queries ---

export interface AgencyWithCount {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  listing_count: number;
}

export interface AgenciesResponse {
  agencies: AgencyWithCount[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export async function getAgencies(
  page: number = 1,
  limit: number = 24
): Promise<AgenciesResponse> {
  const db = getDb();
  if (!db) {
    // Seed fallback: extract agencies from seed listings
    const seedModule = await import("./seed");
    const seedListings = seedModule.seedGetListings({});
    const agencyMap = new Map<string, number>();
    for (const l of seedListings.listings) {
      if (l.poster_type === "agency" && l.poster_name) {
        agencyMap.set(l.poster_name, (agencyMap.get(l.poster_name) ?? 0) + 1);
      }
    }
    const all: AgencyWithCount[] = Array.from(agencyMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        id: name,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        logo: null,
        email: null,
        phone: null,
        website: null,
        description: null,
        listing_count: count,
      }));
    const offset = (page - 1) * limit;
    return {
      agencies: all.slice(offset, offset + limit),
      total: all.length,
      page,
      limit,
      has_more: offset + limit < all.length,
    };
  }

  const offset = (page - 1) * limit;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencies);
  const total = Number(countResult.count);

  const rows = await db
    .select({
      id: agencies.id,
      name: agencies.name,
      slug: agencies.slug,
      logo: agencies.logo,
      email: agencies.email,
      phone: agencies.phone,
      website: agencies.website,
      description: agencies.description,
      listingCount: sql<number>`(
        SELECT count(*) FROM listings
        WHERE listings.poster_name = ${agencies.name}
          AND listings.poster_type = 'agency'
          AND listings.is_active = true
      )`,
    })
    .from(agencies)
    .orderBy(desc(sql`(
      SELECT count(*) FROM listings
      WHERE listings.poster_name = ${agencies.name}
        AND listings.poster_type = 'agency'
        AND listings.is_active = true
    )`))
    .limit(limit)
    .offset(offset);

  return {
    agencies: rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      logo: r.logo,
      email: r.email,
      phone: r.phone,
      website: r.website,
      description: r.description,
      listing_count: Number(r.listingCount),
    })),
    total,
    page,
    limit,
    has_more: offset + rows.length < total,
  };
}

export const getAgencyBySlug = cache(async function getAgencyBySlug(
  slug: string
): Promise<AgencyWithCount | null> {
  const db = getDb();
  if (!db) {
    // Seed fallback
    const result = await getAgencies(1, 1000);
    return result.agencies.find((a) => a.slug === slug) ?? null;
  }

  const [row] = await db
    .select({
      id: agencies.id,
      name: agencies.name,
      slug: agencies.slug,
      logo: agencies.logo,
      email: agencies.email,
      phone: agencies.phone,
      website: agencies.website,
      description: agencies.description,
      listingCount: sql<number>`(
        SELECT count(*) FROM listings
        WHERE listings.poster_name = ${agencies.name}
          AND listings.poster_type = 'agency'
          AND listings.is_active = true
      )`,
    })
    .from(agencies)
    .where(eq(agencies.slug, slug));

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo,
    email: row.email,
    phone: row.phone,
    website: row.website,
    description: row.description,
    listing_count: Number(row.listingCount),
  };
});

export async function getAgencyListings(
  agencyName: string,
  filters: ListingFilters
): Promise<ListingsResponse> {
  const db = getDb();
  if (!db) {
    const seedModule = await import("./seed");
    const all = seedModule.seedGetListings({});
    const filtered = all.listings.filter(
      (l) => l.poster_type === "agency" && l.poster_name === agencyName
    );
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 24;
    const offset = (page - 1) * limit;
    return {
      listings: filtered.slice(offset, offset + limit),
      total: filtered.length,
      page,
      limit,
      has_more: offset + limit < filtered.length,
    };
  }

  const conditions = buildFilterConditions(filters);
  conditions.push(eq(listings.posterName, agencyName));
  conditions.push(eq(listings.posterType, "agency"));

  const where = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listings)
    .where(where);
  const total = Number(countResult.count);

  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 24, 100);
  const offset = (page - 1) * limit;

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
