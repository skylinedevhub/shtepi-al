-- Migration 0013: Add API Keys table for Market Data API
-- Supports GH #20: versioned market data endpoints with key-based auth

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix VARCHAR(12) NOT NULL,
  name VARCHAR(200) NOT NULL,
  scopes JSONB DEFAULT '[]'::jsonb,
  rate_limit_per_minute INTEGER DEFAULT 60,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
