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
  bigserial,
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

// --- Revenue model enums ---

export const planTypeEnum = pgEnum("plan_type", [
  "agency",
  "buyer",
  "data",
]);
export const billingIntervalEnum = pgEnum("billing_interval", [
  "monthly",
  "yearly",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "open",
  "paid",
  "void",
  "uncollectible",
]);
export const campaignTypeEnum = pgEnum("campaign_type", [
  "sponsored_listing",
  "banner",
  "hero_carousel",
  "city_takeover",
  "sidebar",
]);
export const bidTypeEnum = pgEnum("bid_type", ["cpm", "cpc", "cpl", "flat_monthly"]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "rejected",
]);
export const adPlacementEnum = pgEnum("ad_placement", [
  "search_top",
  "search_sidebar",
  "homepage_latest",
  "city_page",
  "detail_sidebar",
  "mobile_sticky",
  "hero_carousel",
]);
export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
]);
export const inquirySourceEnum = pgEnum("inquiry_source", [
  "contact_form",
  "whatsapp",
  "phone",
  "external",
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
    // NOTE: listing_group_id column exists in DB (migration 0007) but is
    // intentionally omitted from the Drizzle schema to avoid SELECT failures
    // on databases that haven't run the migration yet. Access it via raw SQL.
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
    // idx_listings_group defined in migration 0007, not in Drizzle (column omitted for compat)
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
  // Billing fields
  stripeCustomerId: text("stripe_customer_id"),
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
  // Billing fields
  stripeCustomerId: text("stripe_customer_id"),
  planId: uuid("plan_id"), // denormalized shortcut — FK added via migration
  subscriptionStatus: varchar("subscription_status", { length: 20 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- Plans ---

export interface PlanFeatures {
  listing_limit: number | null; // null = unlimited
  lead_limit_monthly: number | null;
  featured_cities: number | null; // null = unlimited
  has_crm_export: boolean;
  has_whatsapp_routing: boolean;
  has_api_access: boolean;
  has_analytics_advanced: boolean;
  team_seats: number;
  ranking_boost: number; // 0-3
}

export const plans = pgTable("plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  type: planTypeEnum("type").notNull(),
  priceEur: integer("price_eur").notNull(), // cents
  billingInterval: billingIntervalEnum("billing_interval")
    .notNull()
    .default("monthly"),
  features: jsonb("features").$type<PlanFeatures>().notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  stripePriceId: text("stripe_price_id"),
  stripeProductId: text("stripe_product_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// --- Subscriptions ---

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    agencyId: uuid("agency_id").references(() => agencies.id, {
      onDelete: "set null",
    }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeCustomerId: text("stripe_customer_id"),
    status: subscriptionStatusEnum("status").notNull().default("incomplete"),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_subscriptions_user").on(table.userId),
    index("idx_subscriptions_agency").on(table.agencyId),
    uniqueIndex("idx_subscriptions_stripe").on(table.stripeSubscriptionId),
  ]
);

// --- Invoices ---

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    stripeInvoiceId: text("stripe_invoice_id"),
    amountEur: integer("amount_eur").notNull(), // cents
    status: invoiceStatusEnum("status").notNull().default("draft"),
    pdfUrl: text("pdf_url"),
    hostedInvoiceUrl: text("hosted_invoice_url"),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_invoices_subscription").on(table.subscriptionId),
    uniqueIndex("idx_invoices_stripe").on(table.stripeInvoiceId),
  ]
);

// --- Payment Methods ---

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stripePaymentMethodId: text("stripe_payment_method_id").notNull(),
    type: varchar("type", { length: 20 }).default("card"),
    last4: varchar("last4", { length: 4 }),
    brand: varchar("brand", { length: 30 }),
    expMonth: integer("exp_month"),
    expYear: integer("exp_year"),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_payment_methods_user").on(table.userId)]
);

// --- Ad Campaigns ---

export const adCampaigns = pgTable(
  "ad_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    type: campaignTypeEnum("type").notNull(),
    bidType: bidTypeEnum("bid_type").notNull(),
    bidAmountEur: integer("bid_amount_eur").notNull(), // cents
    budgetEur: integer("budget_eur"), // cents, null = unlimited (flat monthly)
    spentEur: integer("spent_eur").default(0), // cents
    targetCities: jsonb("target_cities").$type<string[]>(),
    targetDevices: jsonb("target_devices").$type<string[]>(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    status: campaignStatusEnum("status").notNull().default("draft"),
    maxImpressionsPerUser: integer("max_impressions_per_user").default(3),
    listingIds: jsonb("listing_ids").$type<string[]>(),
    creativeUrl: text("creative_url"),
    creativeAlt: text("creative_alt"),
    clickUrl: text("click_url"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_campaigns_agency").on(table.agencyId),
    index("idx_campaigns_status_dates").on(
      table.status,
      table.startDate,
      table.endDate
    ),
  ]
);

// --- Ad Impressions (high-volume) ---

export const adImpressions = pgTable(
  "ad_impressions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    placement: adPlacementEnum("placement").notNull(),
    userFingerprint: varchar("user_fingerprint", { length: 64 }),
    device: varchar("device", { length: 20 }),
    cityContext: varchar("city_context", { length: 100 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_impressions_campaign_date").on(
      table.campaignId,
      table.createdAt
    ),
    index("idx_impressions_frequency").on(
      table.userFingerprint,
      table.campaignId
    ),
  ]
);

// --- Ad Clicks ---

export const adClicks = pgTable(
  "ad_clicks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    impressionId: integer("impression_id"), // not FK'd for performance
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => adCampaigns.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_clicks_campaign_date").on(table.campaignId, table.createdAt),
  ]
);

// --- Lead Credits ---

export const leadCredits = pgTable(
  "lead_credits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    planCredits: integer("plan_credits").notNull(),
    bonusCredits: integer("bonus_credits").default(0),
    usedCredits: integer("used_credits").default(0),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_lead_credits_agency_period").on(
      table.agencyId,
      table.periodEnd
    ),
  ]
);

// --- Developer Projects ---
export const developerProjects = pgTable(
  "developer_projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    developerName: varchar("developer_name", { length: 200 }).notNull(),
    projectName: varchar("project_name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    description: text("description"),
    projectType: varchar("project_type", { length: 50 }),
    status: varchar("project_status", { length: 50 }).default("selling"),
    city: varchar("city", { length: 100 }),
    neighborhood: varchar("neighborhood", { length: 200 }),
    address: text("address"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    priceFromEur: integer("price_from_eur"),
    priceToEur: integer("price_to_eur"),
    unitsTotal: integer("units_total"),
    unitsAvailable: integer("units_available"),
    completionDate: timestamp("completion_date", { withTimezone: true }),
    amenities: jsonb("amenities").$type<string[]>(),
    images: jsonb("images").$type<string[]>().default([]),
    brochureUrl: text("brochure_url"),
    contactPhone: varchar("contact_phone", { length: 50 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactWhatsapp: varchar("contact_whatsapp", { length: 50 }),
    website: text("website"),
    campaignId: uuid("campaign_id"),
    isFeatured: boolean("is_featured").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_projects_city").on(table.city),
    index("idx_projects_featured").on(table.isFeatured),
  ]
);

// --- Price Alerts (Buyer Plus) ---
export const priceAlerts = pgTable(
  "price_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
    thresholdEur: real("threshold_eur"),
    isActive: boolean("is_active").default(true),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_price_alerts_user").on(table.userId),
    index("idx_price_alerts_listing").on(table.listingId),
  ]
);

// --- Saved Searches (Buyer Plus) ---
export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    filters: jsonb("filters").$type<Record<string, unknown>>().notNull(),
    notify: boolean("notify").default(false),
    lastNotifiedAt: timestamp("last_notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_saved_searches_user").on(table.userId),
  ]
);

// --- Partner Ads ---

export const partnerAds = pgTable(
  "partner_ads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    partnerName: varchar("partner_name", { length: 200 }).notNull(),
    partnerType: varchar("partner_type", { length: 50 }).notNull(),
    logoUrl: text("logo_url"),
    description: text("description"),
    clickUrl: text("click_url").notNull(),
    placement: varchar("placement", { length: 50 }).notNull(),
    priceMonthlyEur: integer("price_monthly_eur"),
    cities: jsonb("cities").$type<string[]>(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_partner_ads_placement").on(table.placement, table.isActive),
  ]
);

// --- Listing Refreshes ---
export const listingRefreshes = pgTable(
  "listing_refreshes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true }).defaultNow(),
    type: varchar("type", { length: 20 }).default("manual"),
  },
  (table) => [
    index("idx_refreshes_listing").on(table.listingId),
  ]
);

// --- API Keys ---
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull(),
    keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    scopes: jsonb("scopes").$type<string[]>().default([]),
    rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_api_keys_user").on(table.userId),
    index("idx_api_keys_prefix").on(table.keyPrefix),
  ]
);

// --- Coupons ---
export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  discountType: varchar("discount_type", { length: 20 }).notNull(),
  discountValue: integer("discount_value").notNull(),
  applicablePlans: jsonb("applicable_plans").$type<string[]>(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => profiles.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// --- Affiliates ---
export const affiliates = pgTable("affiliates", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 50 }).notNull().unique(),
  commissionRate: integer("commission_rate").default(20),
  totalReferrals: integer("total_referrals").default(0),
  totalEarnedEur: integer("total_earned_eur").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// --- Referrals ---
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    affiliateId: uuid("affiliate_id").notNull().references(() => affiliates.id),
    referredUserId: uuid("referred_user_id").notNull().references(() => profiles.id),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    commissionEur: integer("commission_eur"),
    status: varchar("status", { length: 20 }).default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_referrals_affiliate").on(table.affiliateId),
  ]
);

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
    // Lead tracking fields
    status: inquiryStatusEnum("inquiry_status").default("new"),
    agencyId: uuid("agency_id").references(() => agencies.id, {
      onDelete: "set null",
    }),
    source: inquirySourceEnum("inquiry_source").default("contact_form"),
    leadScore: integer("lead_score"),
    notes: text("notes"),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_inquiries_listing").on(table.listingId, table.createdAt),
    index("idx_inquiries_agency").on(table.agencyId, table.createdAt),
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

// --- Cadastral Zones (property valuation reference data) ---

export const cadastralZones = pgTable("cadastral_zones", {
  zkNumer: integer("zk_numer").primaryKey(),
  zkEmer: text("zk_emer"),
  displayLabel: text("display_label"),
  buildingPriceZoneId: integer("building_price_zone_id"),
});

// --- Building Price Zones (Lek/m² by building type) ---

export const buildingPriceZones = pgTable("building_price_zones", {
  id: integer("id").primaryKey(),
  priceBanimi: integer("price_banimi"),
  priceTregtimi: integer("price_tregtimi"),
  priceIndustriale: integer("price_industriale"),
  priceBujqesoreBlegtorale: integer("price_bujqesore_blegtorale"),
});

// --- Land Prices per Zone (Lek/m²) ---

export const landPrices = pgTable("land_prices", {
  zkNumer: integer("zk_numer").primaryKey(),
  truall: real("truall"),
  kullote: real("kullote"),
  bujqesore: real("bujqesore"),
  pyll: real("pyll"),
});

// --- Property Valuations (saved calculation results) ---

export const propertyValuations = pgTable(
  "property_valuations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    zkNumer: integer("zk_numer").notNull(),
    propertyNo: text("property_no"),
    areaSqm: real("area_sqm").notNull(),
    buildYear: integer("build_year").notNull(),
    propertyType: text("property_type").notNull(),
    marketValueAll: real("market_value_all").notNull(),
    referenceValueAll: real("reference_value_all").notNull(),
    breakdown: jsonb("breakdown").$type<Record<string, number>>(),
    listingId: uuid("listing_id").references(() => listings.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_valuations_zk").on(table.zkNumer),
    index("idx_valuations_listing").on(table.listingId),
  ]
);
