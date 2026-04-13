export interface Listing {
  id: string;
  source: string;
  source_url: string;
  source_id: string;
  title: string;
  description: string | null;
  price: number | null;
  price_all: number | null;
  currency_original: string;
  price_period: string;
  transaction_type: string;
  property_type: string;
  room_config: string | null;
  area_sqm: number | null;
  area_net_sqm: number | null;
  floor: number | null;
  total_floors: number | null;
  rooms: number | null;
  bathrooms: number | null;
  city: string | null;
  neighborhood: string | null;
  address_raw: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  image_count: number;
  poster_name: string | null;
  poster_phone: string | null;
  poster_type: string;
  is_active: boolean;
  first_seen: string;
  last_seen: string;
  created_at: string | null;
  has_elevator: boolean | null;
  has_parking: boolean | null;
  is_furnished: boolean | null;
  is_new_build: boolean | null;
  listing_group_id: string | null;
  group_count?: number;
  group_sources?: string[];
}

export interface MapPin {
  id: string;
  title: string;
  price: number | null;
  price_period: string;
  room_config: string | null;
  area_sqm: number | null;
  city: string | null;
  neighborhood: string | null;
  latitude: number;
  longitude: number;
  first_image: string | null;
}

export interface ListingFilters {
  city?: string;
  transaction_type?: string;
  property_type?: string;
  price_min?: number;
  price_max?: number;
  rooms_min?: number;
  rooms_max?: number;
  area_min?: number;
  area_max?: number;
  neighborhood?: string;
  source?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "area_desc";
  page?: number;
  limit?: number;
  sw_lat?: number;
  sw_lng?: number;
  ne_lat?: number;
  ne_lng?: number;
}

export interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface Stats {
  total_listings: number;
  by_city: Record<string, number>;
  by_type: Record<string, number>;
  by_source: Record<string, number>;
  by_transaction: Record<string, number>;
}

// --- Revenue model types ---

export interface PlanFeatures {
  listing_limit: number | null;
  lead_limit_monthly: number | null;
  featured_cities: number | null;
  has_crm_export: boolean;
  has_whatsapp_routing: boolean;
  has_api_access: boolean;
  has_analytics_advanced: boolean;
  team_seats: number;
  ranking_boost: number;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  type: "agency" | "buyer" | "data";
  price_eur: number; // cents
  billing_interval: "monthly" | "yearly";
  features: PlanFeatures;
  is_active: boolean;
  sort_order: number;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  agency_id: string | null;
  plan_id: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  subscription_id: string;
  stripe_invoice_id: string | null;
  amount_eur: number; // cents
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  pdf_url: string | null;
  hosted_invoice_url: string | null;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface AdCampaign {
  id: string;
  agency_id: string;
  name: string;
  type: "sponsored_listing" | "banner" | "hero_carousel" | "city_takeover" | "sidebar";
  bid_type: "cpm" | "cpc" | "cpl" | "flat_monthly";
  bid_amount_eur: number; // cents
  budget_eur: number | null;
  spent_eur: number;
  target_cities: string[] | null;
  target_devices: string[] | null;
  start_date: string;
  end_date: string;
  status: "draft" | "active" | "paused" | "completed" | "rejected";
  max_impressions_per_user: number;
  listing_ids: string[] | null;
  creative_url: string | null;
  click_url: string | null;
}

export interface LeadCredit {
  id: string;
  agency_id: string;
  plan_credits: number;
  bonus_credits: number;
  used_credits: number;
  period_start: string;
  period_end: string;
}

// --- Developer project types ---

export interface DeveloperProject {
  id: string;
  developer_name: string;
  project_name: string;
  slug: string;
  description: string | null;
  project_type: string | null;
  status: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  price_from_eur: number | null;
  price_to_eur: number | null;
  units_total: number | null;
  units_available: number | null;
  completion_date: string | null;
  amenities: string[] | null;
  images: string[];
  brochure_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  website: string | null;
  campaign_id: string | null;
  is_featured: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProjectFilters {
  city?: string;
  project_type?: string;
  status?: string;
  price_min?: number;
  price_max?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export interface ProjectsResponse {
  projects: DeveloperProject[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// --- Buyer Plus types ---

export interface PriceAlert {
  id: string;
  user_id: string;
  listing_id: string;
  threshold_eur: number | null;
  is_active: boolean;
  triggered_at: string | null;
  created_at: string;
}

export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, unknown>;
  notify: boolean;
  last_notified_at: string | null;
  created_at: string;
}

export interface FairPriceScore {
  score: number;
  label: string;
  color: string;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: Plan;
}

export interface UsageSummary {
  listings_used: number;
  listings_limit: number | null;
  leads_used: number;
  leads_limit: number | null;
  plan_name: string;
  plan_slug: string;
}

// --- Valuation types (re-exported from valuation module for API responses) ---

export type {
  ValuationResult,
  ValuationBreakdown,
  CadastralZone,
} from "./valuation/types";
