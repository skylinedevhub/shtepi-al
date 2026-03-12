-- Migration: add_performance_indexes
-- Applied: 2026-03-12
-- Purpose: Optimize common query patterns for listings

-- Composite partial index for city browsing (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_active_city
  ON listings (city, first_seen DESC)
  WHERE is_active = true;

-- Composite partial index for transaction_type filtering + date ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_active_transaction_date
  ON listings (transaction_type, first_seen DESC)
  WHERE is_active = true;

-- Composite partial index for property_type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_active_property_type
  ON listings (property_type, first_seen DESC)
  WHERE is_active = true;

-- Geo index for map pin queries (WHERE latitude IS NOT NULL AND longitude IS NOT NULL)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_geo
  ON listings (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND is_active = true;

-- Text pattern index for short-id prefix lookup (id::text LIKE 'prefix%')
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_id_text_pattern
  ON listings ((id::text) text_pattern_ops);

-- Partial index on is_active itself for count queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_active
  ON listings (is_active)
  WHERE is_active = true;

-- Price range partial index for filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_listings_active_price
  ON listings (price)
  WHERE is_active = true AND price IS NOT NULL;
