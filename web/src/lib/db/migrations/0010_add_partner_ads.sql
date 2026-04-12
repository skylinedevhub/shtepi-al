-- Partner Ads: lightweight partner ad system for mortgage/service partners
-- Migration 0010

CREATE TABLE IF NOT EXISTS partner_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name varchar(200) NOT NULL,
  partner_type varchar(50) NOT NULL,
  logo_url text,
  description text,
  click_url text NOT NULL,
  placement varchar(50) NOT NULL,
  price_monthly_eur integer,
  cities jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_ads_placement
  ON partner_ads(placement, is_active);
