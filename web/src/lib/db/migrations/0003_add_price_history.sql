-- Price history tracking: records price changes detected during scraper upserts
CREATE TABLE IF NOT EXISTS price_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    price real NOT NULL,
    currency varchar(10) DEFAULT 'EUR',
    recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_listing
    ON price_history(listing_id, recorded_at DESC);
