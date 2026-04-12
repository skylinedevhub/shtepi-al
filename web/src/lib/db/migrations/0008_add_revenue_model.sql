-- Revenue model: subscription plans, billing, ads, and lead tracking
-- Migration 0008 — all revenue model tables and schema changes

-- ============================================================
-- ENUMS
-- ============================================================

DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('agency', 'buyer', 'data');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_interval AS ENUM ('monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_type AS ENUM ('sponsored_listing', 'banner', 'hero_carousel', 'city_takeover', 'sidebar');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE bid_type AS ENUM ('cpm', 'cpc', 'cpl', 'flat_monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE ad_placement AS ENUM ('search_top', 'search_sidebar', 'homepage_latest', 'city_page', 'detail_sidebar', 'mobile_sticky', 'hero_carousel');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inquiry_status AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE inquiry_source AS ENUM ('contact_form', 'whatsapp', 'phone', 'external');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- BILLING TABLES
-- ============================================================

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) NOT NULL,
  slug varchar(50) NOT NULL UNIQUE,
  type plan_type NOT NULL,
  price_eur integer NOT NULL,  -- cents
  billing_interval billing_interval NOT NULL DEFAULT 'monthly',
  features jsonb NOT NULL DEFAULT '{}',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  stripe_price_id text,
  stripe_product_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  plan_id uuid NOT NULL REFERENCES plans(id),
  stripe_subscription_id text,
  stripe_customer_id text,
  status subscription_status NOT NULL DEFAULT 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_agency ON subscriptions(agency_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  stripe_invoice_id text,
  amount_eur integer NOT NULL,  -- cents
  status invoice_status NOT NULL DEFAULT 'draft',
  pdf_url text,
  hosted_invoice_url text,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_method_id text NOT NULL,
  type varchar(20) DEFAULT 'card',
  last4 varchar(4),
  brand varchar(30),
  exp_month integer,
  exp_year integer,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);

-- ============================================================
-- AD SYSTEM TABLES
-- ============================================================

-- Ad Campaigns
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name varchar(200) NOT NULL,
  type campaign_type NOT NULL,
  bid_type bid_type NOT NULL,
  bid_amount_eur integer NOT NULL,  -- cents
  budget_eur integer,               -- cents, null = unlimited
  spent_eur integer DEFAULT 0,      -- cents
  target_cities jsonb,
  target_devices jsonb,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  max_impressions_per_user integer DEFAULT 3,
  listing_ids jsonb,
  creative_url text,
  creative_alt text,
  click_url text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_agency ON ad_campaigns(agency_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status_dates ON ad_campaigns(status, start_date, end_date);

-- Ad Impressions (high-volume, append-only)
CREATE TABLE IF NOT EXISTS ad_impressions (
  id bigserial PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  placement ad_placement NOT NULL,
  user_fingerprint varchar(64),
  device varchar(20),
  city_context varchar(100),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impressions_campaign_date ON ad_impressions(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_impressions_frequency ON ad_impressions(user_fingerprint, campaign_id);

-- Ad Clicks
CREATE TABLE IF NOT EXISTS ad_clicks (
  id bigserial PRIMARY KEY,
  impression_id integer,
  campaign_id uuid NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clicks_campaign_date ON ad_clicks(campaign_id, created_at);

-- Lead Credits
CREATE TABLE IF NOT EXISTS lead_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  plan_credits integer NOT NULL,
  bonus_credits integer DEFAULT 0,
  used_credits integer DEFAULT 0,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_credits_agency_period ON lead_credits(agency_id, period_end);

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- Agencies: add billing columns
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS plan_id uuid;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS subscription_status varchar(20);

-- Profiles: add billing columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Inquiries: add lead tracking columns
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS inquiry_status inquiry_status DEFAULT 'new';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS inquiry_source inquiry_source DEFAULT 'contact_form';
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS lead_score integer;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS contacted_at timestamptz;
ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_inquiries_agency ON inquiries(agency_id, created_at);

-- ============================================================
-- SEED PLANS
-- ============================================================

INSERT INTO plans (name, slug, type, price_eur, billing_interval, features, sort_order)
VALUES
  ('Starter', 'starter', 'agency', 4900, 'monthly', '{
    "listing_limit": 30,
    "lead_limit_monthly": 20,
    "featured_cities": 1,
    "has_crm_export": false,
    "has_whatsapp_routing": false,
    "has_api_access": false,
    "has_analytics_advanced": false,
    "team_seats": 1,
    "ranking_boost": 1
  }', 1),
  ('Growth', 'growth', 'agency', 14900, 'monthly', '{
    "listing_limit": 200,
    "lead_limit_monthly": null,
    "featured_cities": 3,
    "has_crm_export": true,
    "has_whatsapp_routing": true,
    "has_api_access": false,
    "has_analytics_advanced": true,
    "team_seats": 3,
    "ranking_boost": 2
  }', 2),
  ('Premium', 'premium', 'agency', 39900, 'monthly', '{
    "listing_limit": null,
    "lead_limit_monthly": null,
    "featured_cities": null,
    "has_crm_export": true,
    "has_whatsapp_routing": true,
    "has_api_access": true,
    "has_analytics_advanced": true,
    "team_seats": 10,
    "ranking_boost": 3
  }', 3),
  ('Enterprise', 'enterprise', 'agency', 0, 'monthly', '{
    "listing_limit": null,
    "lead_limit_monthly": null,
    "featured_cities": null,
    "has_crm_export": true,
    "has_whatsapp_routing": true,
    "has_api_access": true,
    "has_analytics_advanced": true,
    "team_seats": 999,
    "ranking_boost": 3
  }', 4),
  ('Buyer Plus', 'buyer-plus', 'buyer', 499, 'monthly', '{
    "listing_limit": null,
    "lead_limit_monthly": null,
    "featured_cities": 0,
    "has_crm_export": false,
    "has_whatsapp_routing": false,
    "has_api_access": false,
    "has_analytics_advanced": false,
    "team_seats": 1,
    "ranking_boost": 0
  }', 10),
  ('Market Data Dashboard', 'data-dashboard', 'data', 19900, 'monthly', '{
    "listing_limit": null,
    "lead_limit_monthly": null,
    "featured_cities": 0,
    "has_crm_export": false,
    "has_whatsapp_routing": false,
    "has_api_access": false,
    "has_analytics_advanced": true,
    "team_seats": 1,
    "ranking_boost": 0
  }', 20),
  ('Market Data API', 'data-api', 'data', 49900, 'monthly', '{
    "listing_limit": null,
    "lead_limit_monthly": null,
    "featured_cities": 0,
    "has_crm_export": false,
    "has_whatsapp_routing": false,
    "has_api_access": true,
    "has_analytics_advanced": true,
    "team_seats": 1,
    "ranking_boost": 0
  }', 21)
ON CONFLICT (slug) DO NOTHING;
