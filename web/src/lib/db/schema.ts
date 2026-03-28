import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// --- Enums ---

export const originEnum = pgEnum("origin", ["scraped", "user"]);
export const listingStatusEnum = pgEnum("listing_status", [
  "draft",
  "pending",
  "active",
  "rejected",
  "expired",
  "archived",
]);
export const userRoleEnum = pgEnum("user_role", [
  "user",
  "agent",
  "agency_admin",
  "moderator",
  "admin",
]);

// --- Listings ---

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Scraper fields
    source: varchar("source", { length: 50 }),
    sourceUrl: text("source_url"),
    sourceId: varchar("source_id", { length: 255 }),
    // Core fields
    title: text("title").notNull(),
    description: text("description"),
    price: real("price"),
    priceAll: real("price_all"),
    currencyOriginal: varchar("currency_original", { length: 10 }).default(
      "EUR"
    ),
    pricePeriod: varchar("price_period", { length: 20 }).default("total"),
    transactionType: varchar("transaction_type", { length: 20 }).notNull(),
    propertyType: varchar("property_type", { length: 30 }),
    roomConfig: varchar("room_config", { length: 20 }),
    areaSqm: real("area_sqm"),
    areaNetSqm: real("area_net_sqm"),
    floor: integer("floor"),
    totalFloors: integer("total_floors"),
    rooms: integer("rooms"),
    bathrooms: integer("bathrooms"),
    // Location
    city: varchar("city", { length: 100 }),
    neighborhood: varchar("neighborhood", { length: 200 }),
    addressRaw: text("address_raw"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    // Media
    images: jsonb("images").$type<string[]>().default([]),
    imageCount: integer("image_count").default(0),
    // Contact
    posterName: varchar("poster_name", { length: 200 }),
    posterPhone: varchar("poster_phone", { length: 50 }),
    posterType: varchar("poster_type", { length: 20 }).default("private"),
    // Booleans
    isActive: boolean("is_active").default(true),
    hasElevator: boolean("has_elevator"),
    hasParking: boolean("has_parking"),
    isFurnished: boolean("is_furnished"),
    isNewBuild: boolean("is_new_build"),
    // Grouping (cross-source dedup)
    listingGroupId: uuid("listing_group_id"),
    // Platform fields
    origin: originEnum("origin").default("scraped"),
    userId: uuid("user_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    status: listingStatusEnum("status").default("active"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    // Timestamps
    firstSeen: timestamp("first_seen", { withTimezone: true }).defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_listings_city").on(table.city),
    index("idx_listings_transaction").on(table.transactionType),
    index("idx_listings_property_type").on(table.propertyType),
    index("idx_listings_price").on(table.price),
    index("idx_listings_status").on(table.status),
    index("idx_listings_origin").on(table.origin),
    index("idx_listings_user_id").on(table.userId),
    index("idx_listings_first_seen").on(table.firstSeen),
    // Partial unique index: scraped listings dedup by (source, source_id)
    uniqueIndex("idx_listings_source_dedup")
      .on(table.source, table.sourceId)
      .where(sql`source IS NOT NULL`),
    // Performance: partial composite indexes for common query patterns
    index("idx_listings_active_city")
      .on(table.city, table.firstSeen)
      .where(sql`is_active = true`),
    index("idx_listings_active_transaction_date")
      .on(table.transactionType, table.firstSeen)
      .where(sql`is_active = true`),
    index("idx_listings_group")
      .on(table.listingGroupId)
      .where(sql`listing_group_id IS NOT NULL`),
    index("idx_listings_geo")
      .on(table.latitude, table.longitude)
      .where(sql`latitude IS NOT NULL AND longitude IS NOT NULL AND is_active = true`),
  ]
);

// --- Profiles (linked to Supabase auth.users) ---

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // References auth.users(id) — enforced via SQL migration
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  image: text("image"),
  role: userRoleEnum("role").default("user"),
  phone: varchar("phone", { length: 50 }),
  agencyId: uuid("agency_id").references(() => agencies.id, {
    onDelete: "set null",
  }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- Agencies ---

export const agencies = pgTable("agencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique(),
  logo: text("logo"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  website: text("website"),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- Listing images ---

export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    blobPath: text("blob_path"),
    position: integer("position").default(0),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_listing_images_listing").on(table.listingId)]
);

// --- Price History ---

export const priceHistory = pgTable(
  "price_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    price: real("price").notNull(),
    currency: varchar("currency", { length: 10 }).default("EUR"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_price_history_listing").on(table.listingId, table.recordedAt),
  ]
);

// --- Inquiries ---

export const inquiries = pgTable(
  "inquiries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    senderName: varchar("sender_name", { length: 255 }).notNull(),
    senderEmail: varchar("sender_email", { length: 255 }).notNull(),
    senderPhone: varchar("sender_phone", { length: 50 }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_inquiries_listing").on(table.listingId, table.createdAt),
  ]
);

// --- Favorites ---

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.listingId] })]
);
