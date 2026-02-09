import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import type { Listing, ListingFilters, ListingsResponse, Stats } from "./types";

function resolveDbPath(): string {
  if (process.env.SQLITE_DB_PATH) return process.env.SQLITE_DB_PATH;
  // Try relative to CWD (works whether started from project root or web/)
  for (const candidate of ["db/shtepi.db", "../db/shtepi.db"]) {
    const abs = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(abs)) return abs;
  }
  return path.join(process.cwd(), "db", "shtepi.db");
}

const DB_PATH = resolveDbPath();

let _db: Database.Database | null = null;

function getDb(): Database.Database | null {
  if (_db) return _db;
  if (!fs.existsSync(DB_PATH)) return null;
  _db = new Database(DB_PATH, { readonly: true });
  return _db;
}

const EMPTY_RESPONSE: ListingsResponse = {
  listings: [],
  total: 0,
  page: 1,
  limit: 24,
  has_more: false,
};

const EMPTY_STATS: Stats = {
  total_listings: 0,
  by_city: {},
  by_type: {},
  by_source: {},
  by_transaction: {},
};

function rowToListing(row: Record<string, unknown>): Listing {
  return {
    ...row,
    images: JSON.parse((row.images as string) || "[]"),
    is_active: Boolean(row.is_active),
    has_elevator: row.has_elevator == null ? null : Boolean(row.has_elevator),
    has_parking: row.has_parking == null ? null : Boolean(row.has_parking),
    is_furnished: row.is_furnished == null ? null : Boolean(row.is_furnished),
    is_new_build: row.is_new_build == null ? null : Boolean(row.is_new_build),
  } as Listing;
}

export function getListings(filters: ListingFilters): ListingsResponse {
  const db = getDb();
  if (!db) return EMPTY_RESPONSE;
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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM listings ${where}`)
    .get(...params) as { count: number };
  const total = countRow.count;

  // Sort
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
  if (!db) return null;
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
  if (!db) return EMPTY_RESPONSE;
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
  if (!db) return EMPTY_STATS;

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
