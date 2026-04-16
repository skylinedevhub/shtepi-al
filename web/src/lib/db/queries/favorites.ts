import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "../drizzle";
import { listings, favorites } from "../schema";
import type { ListingsResponse } from "../../types";
import { dbRowToListing } from "./_utils";

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
