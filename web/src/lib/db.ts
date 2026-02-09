import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { Listing, ListingFilters, ListingsResponse, Stats } from "./types";

function resolveDbPath(): string {
  if (process.env.SQLITE_DB_PATH) return process.env.SQLITE_DB_PATH;
  for (const candidate of [
    "data/shtepi.db",
    "db/shtepi.db",
    "../db/shtepi.db",
  ]) {
    const abs = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(abs)) return abs;
  }
  return path.join(process.cwd(), "data", "shtepi.db");
}

const DB_PATH = resolveDbPath();

let _db: Database.Database | null = null;

function getDb(): Database.Database | null {
  if (_db) return _db;
  if (!fs.existsSync(DB_PATH)) return null;
  try {
    _db = new Database(DB_PATH, { readonly: true });
    return _db;
  } catch {
    return null;
  }
}

// --- JSON seed fallback (for Vercel where SQLite binary may not work) ---
// Static import so Vercel's bundler includes the file
import seedData from "../../data/seed-listings.json";

let _seedListings: Listing[] | null = null;

function getSeedListings(): Listing[] {
  if (_seedListings) return _seedListings;
  _seedListings = (seedData as Record<string, unknown>[]).map(rowToListing);
  return _seedListings;
}

// --- Helpers ---

function rowToListing(row: Record<string, unknown>): Listing {
  return {
    ...row,
    images:
      typeof row.images === "string"
        ? JSON.parse(row.images || "[]")
        : row.images ?? [],
    is_active: Boolean(row.is_active),
    has_elevator: row.has_elevator == null ? null : Boolean(row.has_elevator),
    has_parking: row.has_parking == null ? null : Boolean(row.has_parking),
    is_furnished: row.is_furnished == null ? null : Boolean(row.is_furnished),
    is_new_build: row.is_new_build == null ? null : Boolean(row.is_new_build),
  } as Listing;
}

// --- Seed-based fallback implementations ---

function seedGetListings(filters: ListingFilters): ListingsResponse {
  let listings = getSeedListings();

  if (filters.city) listings = listings.filter((l) => l.city === filters.city);
  if (filters.transaction_type)
    listings = listings.filter(
      (l) => l.transaction_type === filters.transaction_type
    );
  if (filters.property_type)
    listings = listings.filter(
      (l) => l.property_type === filters.property_type
    );
  if (filters.price_min != null)
    listings = listings.filter(
      (l) => l.price != null && l.price >= filters.price_min!
    );
  if (filters.price_max != null)
    listings = listings.filter(
      (l) => l.price != null && l.price <= filters.price_max!
    );
  if (filters.rooms_min != null)
    listings = listings.filter(
      (l) => l.rooms != null && l.rooms >= filters.rooms_min!
    );
  if (filters.rooms_max != null)
    listings = listings.filter(
      (l) => l.rooms != null && l.rooms <= filters.rooms_max!
    );
  if (filters.area_min != null)
    listings = listings.filter(
      (l) => l.area_sqm != null && l.area_sqm >= filters.area_min!
    );
  if (filters.area_max != null)
    listings = listings.filter(
      (l) => l.area_sqm != null && l.area_sqm <= filters.area_max!
    );
  if (filters.neighborhood)
    listings = listings.filter(
      (l) => l.neighborhood === filters.neighborhood
    );
  if (filters.source)
    listings = listings.filter((l) => l.source === filters.source);

  // Sort
  switch (filters.sort) {
    case "price_asc":
      listings = [...listings].sort(
        (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity)
      );
      break;
    case "price_desc":
      listings = [...listings].sort(
        (a, b) => (b.price ?? 0) - (a.price ?? 0)
      );
      break;
    case "area_desc":
      listings = [...listings].sort(
        (a, b) => (b.area_sqm ?? 0) - (a.area_sqm ?? 0)
      );
      break;
    default:
      // newest: seed data already sorted by first_seen DESC
      break;
  }

  const total = listings.length;
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 24, 100);
  const offset = (page - 1) * limit;
  const sliced = listings.slice(offset, offset + limit);

  return {
    listings: sliced,
    total,
    page,
    limit,
    has_more: offset + sliced.length < total,
  };
}

function seedGetListingById(id: string): Listing | null {
  return getSeedListings().find((l) => l.id === id) ?? null;
}

function seedSearchListings(
  query: string,
  limit: number,
  page: number
): ListingsResponse {
  const q = query.toLowerCase();
  const matches = getSeedListings().filter(
    (l) =>
      l.title.toLowerCase().includes(q) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      (l.city && l.city.toLowerCase().includes(q)) ||
      (l.neighborhood && l.neighborhood.toLowerCase().includes(q))
  );

  const offset = (page - 1) * limit;
  const sliced = matches.slice(offset, offset + limit);

  return {
    listings: sliced,
    total: matches.length,
    page,
    limit,
    has_more: offset + sliced.length < matches.length,
  };
}

function seedGetStats(): Stats {
  const listings = getSeedListings();
  const byCity: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const byTransaction: Record<string, number> = {};

  for (const l of listings) {
    if (l.city) byCity[l.city] = (byCity[l.city] ?? 0) + 1;
    if (l.property_type)
      byType[l.property_type] = (byType[l.property_type] ?? 0) + 1;
    if (l.source) bySource[l.source] = (bySource[l.source] ?? 0) + 1;
    if (l.transaction_type)
      byTransaction[l.transaction_type] =
        (byTransaction[l.transaction_type] ?? 0) + 1;
  }

  return {
    total_listings: listings.length,
    by_city: byCity,
    by_type: byType,
    by_source: bySource,
    by_transaction: byTransaction,
  };
}

// --- Public API: SQLite first, JSON seed fallback ---

export function getListings(filters: ListingFilters): ListingsResponse {
  const db = getDb();
  if (!db) return seedGetListings(filters);

  const conditions: string[] = ["is_active = 1"];
  const params: unknown[] = [];

  if (filters.city) {
    conditions.push("city = ?");
    params.push(filters.city);
  }
  if (filters.transaction_type) {
    conditions.push("transaction_type = ?");
    params.push(filters.transaction_type);
  }
  if (filters.property_type) {
    conditions.push("property_type = ?");
    params.push(filters.property_type);
  }
  if (filters.price_min != null) {
    conditions.push("price >= ?");
    params.push(filters.price_min);
  }
  if (filters.price_max != null) {
    conditions.push("price <= ?");
    params.push(filters.price_max);
  }
  if (filters.rooms_min != null) {
    conditions.push("rooms >= ?");
    params.push(filters.rooms_min);
  }
  if (filters.rooms_max != null) {
    conditions.push("rooms <= ?");
    params.push(filters.rooms_max);
  }
  if (filters.area_min != null) {
    conditions.push("area_sqm >= ?");
    params.push(filters.area_min);
  }
  if (filters.area_max != null) {
    conditions.push("area_sqm <= ?");
    params.push(filters.area_max);
  }
  if (filters.neighborhood) {
    conditions.push("neighborhood = ?");
    params.push(filters.neighborhood);
  }
  if (filters.source) {
    conditions.push("source = ?");
    params.push(filters.source);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM listings ${where}`)
    .get(...params) as { count: number };
  const total = countRow.count;

  let orderBy = "first_seen DESC";
  switch (filters.sort) {
    case "price_asc":
      orderBy = "price ASC NULLS LAST";
      break;
    case "price_desc":
      orderBy = "price DESC NULLS LAST";
      break;
    case "area_desc":
      orderBy = "area_sqm DESC NULLS LAST";
      break;
    case "newest":
    default:
      orderBy = "first_seen DESC";
  }

  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 24, 100);
  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT * FROM listings ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset) as Record<string, unknown>[];

  return {
    listings: rows.map(rowToListing),
    total,
    page,
    limit,
    has_more: offset + rows.length < total,
  };
}

export function getListingById(id: string): Listing | null {
  const db = getDb();
  if (!db) return seedGetListingById(id);
  const row = db
    .prepare("SELECT * FROM listings WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  return row ? rowToListing(row) : null;
}

export function searchListings(
  query: string,
  limit: number = 24,
  page: number = 1
): ListingsResponse {
  const db = getDb();
  if (!db) return seedSearchListings(query, limit, page);
  const offset = (page - 1) * limit;

  const countRow = db
    .prepare(
      `SELECT COUNT(*) as count FROM listings_fts WHERE listings_fts MATCH ?`
    )
    .get(query) as { count: number };

  const rows = db
    .prepare(
      `SELECT l.* FROM listings l
       JOIN listings_fts fts ON l.rowid = fts.rowid
       WHERE listings_fts MATCH ?
       AND l.is_active = 1
       ORDER BY rank
       LIMIT ? OFFSET ?`
    )
    .all(query, limit, offset) as Record<string, unknown>[];

  return {
    listings: rows.map(rowToListing),
    total: countRow.count,
    page,
    limit,
    has_more: offset + rows.length < countRow.count,
  };
}

export function getStats(): Stats {
  const db = getDb();
  if (!db) return seedGetStats();

  const total = (
    db
      .prepare("SELECT COUNT(*) as count FROM listings WHERE is_active = 1")
      .get() as { count: number }
  ).count;

  const byCity = Object.fromEntries(
    (
      db
        .prepare(
          "SELECT city, COUNT(*) as count FROM listings WHERE is_active = 1 AND city IS NOT NULL GROUP BY city ORDER BY count DESC"
        )
        .all() as { city: string; count: number }[]
    ).map((r) => [r.city, r.count])
  );

  const byType = Object.fromEntries(
    (
      db
        .prepare(
          "SELECT property_type, COUNT(*) as count FROM listings WHERE is_active = 1 GROUP BY property_type ORDER BY count DESC"
        )
        .all() as { property_type: string; count: number }[]
    ).map((r) => [r.property_type, r.count])
  );

  const bySource = Object.fromEntries(
    (
      db
        .prepare(
          "SELECT source, COUNT(*) as count FROM listings WHERE is_active = 1 GROUP BY source ORDER BY count DESC"
        )
        .all() as { source: string; count: number }[]
    ).map((r) => [r.source, r.count])
  );

  const byTransaction = Object.fromEntries(
    (
      db
        .prepare(
          "SELECT transaction_type, COUNT(*) as count FROM listings WHERE is_active = 1 GROUP BY transaction_type ORDER BY count DESC"
        )
        .all() as { transaction_type: string; count: number }[]
    ).map((r) => [r.transaction_type, r.count])
  );

  return {
    total_listings: total,
    by_city: byCity,
    by_type: byType,
    by_source: bySource,
    by_transaction: byTransaction,
  };
}
