-- 0012: Add listing refreshes table + last_refreshed_at column for auto-repost feature
-- Requires Premium+ plan. Listings can be refreshed once per 24h to boost visibility.

CREATE TABLE IF NOT EXISTS listing_refreshes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  refreshed_at timestamptz DEFAULT now(),
  type varchar(20) DEFAULT 'manual'
);

ALTER TABLE listings ADD COLUMN IF NOT EXISTS last_refreshed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_refreshes_listing ON listing_refreshes(listing_id);
