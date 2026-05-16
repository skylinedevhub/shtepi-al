-- Migration 0014: market_snapshots + b2b_users

CREATE TABLE IF NOT EXISTS market_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  city TEXT NULL,
  transaction_type TEXT NOT NULL,
  property_type TEXT NULL,
  listing_count INTEGER NOT NULL,
  avg_price_eur NUMERIC(12, 2),
  median_price_eur NUMERIC(12, 2),
  avg_price_sqm_eur NUMERIC(10, 2),
  median_price_sqm_eur NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_market_snapshots_unique
  ON market_snapshots (
    snapshot_date,
    COALESCE(city, ''),
    transaction_type,
    COALESCE(property_type, '')
  );

CREATE INDEX IF NOT EXISTS idx_market_snapshots_lookup
  ON market_snapshots (city, transaction_type, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS b2b_users (
  user_id UUID PRIMARY KEY,
  organization TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  plan_slug TEXT,
  invited_by UUID,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_b2b_users_org ON b2b_users (organization);
