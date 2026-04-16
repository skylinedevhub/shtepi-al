import { eq, gte, lte, sql } from "drizzle-orm";
import { listings } from "../schema";
import type { Listing, ListingFilters } from "../../types";

export type DbRow = typeof listings.$inferSelect;

export function dbRowToListing(row: DbRow): Listing {
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

export function buildFilterConditions(filters: ListingFilters) {
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
  if (filters.sw_lat != null)
    conditions.push(gte(listings.latitude, filters.sw_lat));
  if (filters.ne_lat != null)
    conditions.push(lte(listings.latitude, filters.ne_lat));
  if (filters.sw_lng != null)
    conditions.push(gte(listings.longitude, filters.sw_lng));
  if (filters.ne_lng != null)
    conditions.push(lte(listings.longitude, filters.ne_lng));

  return conditions;
}
