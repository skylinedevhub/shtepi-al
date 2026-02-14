-- Migration: create_profiles_and_rls
-- Applied: 2026-02-13
-- Supabase project: cuavbqbazncfwhvlvfaw (shtepi-al)

-- ============================================
-- 1. Enums
-- ============================================

DO $$ BEGIN
  CREATE TYPE origin AS ENUM ('scraped', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('draft', 'pending', 'active', 'rejected', 'expired', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'agent', 'agency_admin', 'moderator', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. Agencies table
-- ============================================

CREATE TABLE IF NOT EXISTS agencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  logo TEXT,
  email VARCHAR(255),
  phone VARCHAR(50),
  website TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. Profiles table (linked to auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  image TEXT,
  role user_role DEFAULT 'user',
  phone VARCHAR(50),
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. Auto-create profile on signup trigger
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, image)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. Listings table
-- ============================================

CREATE TABLE IF NOT EXISTS listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source VARCHAR(50),
  source_url TEXT,
  source_id VARCHAR(255),
  title TEXT NOT NULL,
  description TEXT,
  price REAL,
  price_all REAL,
  currency_original VARCHAR(10) DEFAULT 'EUR',
  price_period VARCHAR(20) DEFAULT 'total',
  transaction_type VARCHAR(20) NOT NULL,
  property_type VARCHAR(30),
  room_config VARCHAR(20),
  area_sqm REAL,
  area_net_sqm REAL,
  floor INTEGER,
  total_floors INTEGER,
  rooms INTEGER,
  bathrooms INTEGER,
  city VARCHAR(100),
  neighborhood VARCHAR(200),
  address_raw TEXT,
  latitude REAL,
  longitude REAL,
  images JSONB DEFAULT '[]',
  image_count INTEGER DEFAULT 0,
  poster_name VARCHAR(200),
  poster_phone VARCHAR(50),
  poster_type VARCHAR(20) DEFAULT 'private',
  is_active BOOLEAN DEFAULT TRUE,
  has_elevator BOOLEAN,
  has_parking BOOLEAN,
  is_furnished BOOLEAN,
  is_new_build BOOLEAN,
  origin origin DEFAULT 'scraped',
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status listing_status DEFAULT 'active',
  metadata JSONB,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_transaction ON listings(transaction_type);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings(property_type);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_origin ON listings(origin);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_first_seen ON listings(first_seen);
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_source_dedup ON listings(source, source_id) WHERE source IS NOT NULL;

-- ============================================
-- 6. Listing images table
-- ============================================

CREATE TABLE IF NOT EXISTS listing_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  blob_path TEXT,
  position INTEGER DEFAULT 0,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing ON listing_images(listing_id);

-- ============================================
-- 7. Favorites table
-- ============================================

CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- ============================================
-- 8. Row Level Security
-- ============================================

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active listings" ON listings FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create own listings" ON listings FOR INSERT WITH CHECK (auth.uid() = user_id AND origin = 'user');
CREATE POLICY "Users can update own listings" ON listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own listings" ON listings FOR DELETE USING (auth.uid() = user_id AND origin = 'user');

CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users manage own favorites" ON favorites FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read agencies" ON agencies FOR SELECT USING (true);

CREATE POLICY "Anyone can read listing images" ON listing_images FOR SELECT USING (true);
CREATE POLICY "Owner can manage listing images" ON listing_images FOR ALL
  USING (EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_images.listing_id AND listings.user_id = auth.uid()));

-- ============================================
-- 9. Storage bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own listing images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'listing-images' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own listing images" ON storage.objects FOR UPDATE
  USING (bucket_id = 'listing-images' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own listing images" ON storage.objects FOR DELETE
  USING (bucket_id = 'listing-images' AND auth.role() = 'authenticated' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public read listing images" ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');
