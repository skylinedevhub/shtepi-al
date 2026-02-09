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
