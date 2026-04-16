import { eq, and, sql, desc, asc } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "../drizzle";
import { listings, agencies } from "../schema";
import type { ListingFilters, ListingsResponse } from "../../types";
import { dbRowToListing, buildFilterConditions } from "./_utils";

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
    const seedModule = await import("../seed");
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

  const rows = await db.execute(sql`
    SELECT
      a.id, a.name, a.slug, a.logo, a.email, a.phone, a.website, a.description,
      COALESCE(count(l.id), 0)::int AS listing_count
    FROM agencies a
    LEFT JOIN listings l
      ON l.poster_name = a.name
      AND l.poster_type = 'agency'
      AND l.is_active = true
    GROUP BY a.id
    ORDER BY count(l.id) DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as unknown as {
    id: string; name: string; slug: string | null; logo: string | null;
    email: string | null; phone: string | null; website: string | null;
    description: string | null; listing_count: number;
  }[];

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
      listing_count: Number(r.listing_count),
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

  const rows = await db.execute(sql`
    SELECT
      a.id, a.name, a.slug, a.logo, a.email, a.phone, a.website, a.description,
      COALESCE(count(l.id), 0)::int AS listing_count
    FROM agencies a
    LEFT JOIN listings l
      ON l.poster_name = a.name
      AND l.poster_type = 'agency'
      AND l.is_active = true
    WHERE a.slug = ${slug}
    GROUP BY a.id
    LIMIT 1
  `) as unknown as {
    id: string; name: string; slug: string | null; logo: string | null;
    email: string | null; phone: string | null; website: string | null;
    description: string | null; listing_count: number;
  }[];

  const row = rows[0];
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
    listing_count: Number(row.listing_count),
  };
});

export async function getAgencyListings(
  agencyName: string,
  filters: ListingFilters
): Promise<ListingsResponse> {
  const db = getDb();
  if (!db) {
    const seedModule = await import("../seed");
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
