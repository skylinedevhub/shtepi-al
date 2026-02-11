-- Full-text search using PostgreSQL tsvector + GIN index
-- Uses 'simple' dictionary (no Albanian stemmer available in PG)

-- Add tsvector column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(city, '') || ' ' ||
      coalesce(neighborhood, '')
    )
  ) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_listings_fts ON listings USING GIN (search_vector);
