-- ShtëpiAL Database Schema (SQLite)
-- Normalized schema for Albanian real estate listings

CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,                          -- UUID
    source TEXT NOT NULL,                          -- "merrjep" | "celesi" | "mirlir" | "njoftime"
    source_url TEXT NOT NULL,
    source_id TEXT NOT NULL,

    -- Core
    title TEXT NOT NULL,
    description TEXT,
    price REAL,                                   -- normalized to EUR
    price_all REAL,                               -- price in Albanian Lek
    currency_original TEXT DEFAULT 'EUR',          -- "EUR" | "ALL" | "USD"
    price_period TEXT DEFAULT 'total',             -- "total" (sale) | "monthly" (rent)

    -- Classification
    transaction_type TEXT NOT NULL,                -- "sale" | "rent"
    property_type TEXT DEFAULT 'apartment',        -- "apartment" | "house" | "villa" | "land" | "commercial" | "garage"
    room_config TEXT,                              -- raw Albanian: "1+1", "2+1+2", "garsoniere"

    -- Dimensions
    area_sqm REAL,
    area_net_sqm REAL,
    floor INTEGER,
    total_floors INTEGER,
    rooms INTEGER,
    bathrooms INTEGER,

    -- Location
    city TEXT,
    neighborhood TEXT,
    address_raw TEXT,

    -- Media
    images TEXT DEFAULT '[]',                      -- JSON array of image URLs
    image_count INTEGER DEFAULT 0,

    -- Contact
    poster_name TEXT,
    poster_phone TEXT,
    poster_type TEXT DEFAULT 'private',            -- "private" | "agency"

    -- Status
    is_active INTEGER DEFAULT 1,                  -- boolean
    first_seen TEXT NOT NULL,                      -- ISO datetime
    last_seen TEXT NOT NULL,                       -- ISO datetime
    created_at TEXT,                               -- listing creation date if available

    -- Features
    has_elevator INTEGER,                          -- boolean or null
    has_parking INTEGER,
    is_furnished INTEGER,
    is_new_build INTEGER,

    -- Raw data for reprocessing
    raw_json TEXT,

    UNIQUE(source, source_id)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_transaction_type ON listings(transaction_type);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON listings(property_type);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
CREATE INDEX IF NOT EXISTS idx_listings_area_sqm ON listings(area_sqm);
CREATE INDEX IF NOT EXISTS idx_listings_neighborhood ON listings(neighborhood);
CREATE INDEX IF NOT EXISTS idx_listings_rooms ON listings(rooms);
CREATE INDEX IF NOT EXISTS idx_listings_is_active ON listings(is_active);
CREATE INDEX IF NOT EXISTS idx_listings_first_seen ON listings(first_seen);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS listings_fts USING fts5(
    title,
    description,
    neighborhood,
    city,
    content='listings',
    content_rowid='rowid'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS listings_ai AFTER INSERT ON listings BEGIN
    INSERT INTO listings_fts(rowid, title, description, neighborhood, city)
    VALUES (new.rowid, new.title, new.description, new.neighborhood, new.city);
END;

CREATE TRIGGER IF NOT EXISTS listings_ad AFTER DELETE ON listings BEGIN
    INSERT INTO listings_fts(listings_fts, rowid, title, description, neighborhood, city)
    VALUES ('delete', old.rowid, old.title, old.description, old.neighborhood, old.city);
END;

CREATE TRIGGER IF NOT EXISTS listings_au AFTER UPDATE ON listings BEGIN
    INSERT INTO listings_fts(listings_fts, rowid, title, description, neighborhood, city)
    VALUES ('delete', old.rowid, old.title, old.description, old.neighborhood, old.city);
    INSERT INTO listings_fts(rowid, title, description, neighborhood, city)
    VALUES (new.rowid, new.title, new.description, new.neighborhood, new.city);
END;
