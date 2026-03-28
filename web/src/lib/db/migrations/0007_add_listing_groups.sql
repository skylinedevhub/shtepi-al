-- Listing groups: link duplicate listings across sources
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_listings_group
    ON listings(listing_group_id) WHERE listing_group_id IS NOT NULL;
