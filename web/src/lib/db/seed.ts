import type { Listing, ListingFilters, ListingsResponse, Stats, MapPin } from "../types";
import seedData from "../../../data/seed-listings.json";

let _seedListings: Listing[] | null = null;

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
    listing_group_id: (row.listing_group_id as string) ?? null,
  } as Listing;
}

function getSeedListings(): Listing[] {
  if (_seedListings) return _seedListings;
  _seedListings = (seedData as Record<string, unknown>[]).map(rowToListing);
  return _seedListings;
}

export function seedGetListings(filters: ListingFilters): ListingsResponse {
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

export function seedGetMapListings(filters: ListingFilters): MapPin[] {
  let all = getSeedListings();

  if (filters.city) all = all.filter((l) => l.city === filters.city);
  if (filters.transaction_type)
    all = all.filter((l) => l.transaction_type === filters.transaction_type);
  if (filters.property_type)
    all = all.filter((l) => l.property_type === filters.property_type);
  if (filters.price_min != null)
    all = all.filter((l) => l.price != null && l.price >= filters.price_min!);
  if (filters.price_max != null)
    all = all.filter((l) => l.price != null && l.price <= filters.price_max!);
  if (filters.rooms_min != null)
    all = all.filter((l) => l.rooms != null && l.rooms >= filters.rooms_min!);
  if (filters.rooms_max != null)
    all = all.filter((l) => l.rooms != null && l.rooms <= filters.rooms_max!);
  if (filters.area_min != null)
    all = all.filter(
      (l) => l.area_sqm != null && l.area_sqm >= filters.area_min!
    );
  if (filters.area_max != null)
    all = all.filter(
      (l) => l.area_sqm != null && l.area_sqm <= filters.area_max!
    );
  if (filters.neighborhood)
    all = all.filter((l) => l.neighborhood === filters.neighborhood);
  if (filters.source)
    all = all.filter((l) => l.source === filters.source);

  return all
    .filter((l) => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      price_period: l.price_period,
      room_config: l.room_config,
      area_sqm: l.area_sqm,
      city: l.city,
      neighborhood: l.neighborhood,
      latitude: l.latitude!,
      longitude: l.longitude!,
      first_image: l.images[0] ?? null,
    }));
}

export function seedGetListingById(id: string): Listing | null {
  return getSeedListings().find((l) => l.id === id) ?? null;
}

export function seedSearchListings(
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

export function seedGetListingByShortId(shortId: string): Listing | null {
  return (
    getSeedListings().find((l) =>
      l.id.replace(/-/g, "").startsWith(shortId)
    ) ?? null
  );
}

export function seedGetAllActiveListingSlugs(): Array<{
  id: string;
  title: string;
  city: string | null;
  last_seen: string;
}> {
  return getSeedListings().map((l) => ({
    id: l.id,
    title: l.title,
    city: l.city,
    last_seen: l.last_seen,
  }));
}

export function seedGetStats(): Stats {
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
