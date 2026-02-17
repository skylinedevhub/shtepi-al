"""Scrapy item pipelines for ShtëpiAL.

Pipeline chain: Validate → Normalize → Geocode → Dedup → Store
"""

import json
import os
import sqlite3
import time
import uuid
from datetime import datetime, timezone

import requests

from shtepi.city_coords import CITY_COORDS
from shtepi.normalizers import (
    extract_features,
    normalize_city,
    normalize_price,
    normalize_property_type,
    normalize_room_config,
    normalize_transaction_type,
)


class ValidationPipeline:
    """Drop items missing required fields."""

    REQUIRED_FIELDS = ("source", "source_id", "source_url", "title", "transaction_type")

    def process_item(self, item, spider):
        for field in self.REQUIRED_FIELDS:
            if not item.get(field):
                raise DropItem(f"Missing required field: {field}")
        # Drop listings with no images
        images = item.get("images")
        if not images or (isinstance(images, list) and len(images) == 0):
            raise DropItem(f"No images: {item.get('source')}/{item.get('source_id')}")
        return item


class NormalizationPipeline:
    """Normalize all fields to canonical forms."""

    def process_item(self, item, spider):
        # City
        item["city"] = normalize_city(item.get("city"))

        # Transaction type
        item["transaction_type"] = normalize_transaction_type(
            item.get("transaction_type")
        )

        # Property type
        item["property_type"] = normalize_property_type(item.get("property_type"))

        # Room config → config string + bedroom count + bathroom count
        config, bedrooms, bathrooms = normalize_room_config(item.get("room_config"))
        item["room_config"] = config
        if bedrooms is not None and not item.get("rooms"):
            item["rooms"] = bedrooms
        if bathrooms is not None and not item.get("bathrooms"):
            item["bathrooms"] = bathrooms

        # Price normalization
        price_eur, price_all, currency = normalize_price(
            item.get("price"),
            item.get("currency_original"),
        )
        item["price"] = price_eur
        item["price_all"] = price_all
        item["currency_original"] = currency

        # Extract features from description
        if item.get("description"):
            features = extract_features(item["description"])
            for key, val in features.items():
                if item.get(key) is None:
                    item[key] = val

        # Ensure images is a list
        images = item.get("images") or []
        if isinstance(images, str):
            try:
                images = json.loads(images)
            except (json.JSONDecodeError, TypeError):
                images = [images] if images else []
        item["images"] = images
        item["image_count"] = len(images)

        return item


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {"User-Agent": "ShtëpiAL/1.0 (real estate aggregator)"}


class GeocodingPipeline:
    """Resolve latitude/longitude for listings.

    Priority:
    1. Spider-provided coords (passthrough)
    2. Nominatim geocoding from address/neighborhood + city
    3. City center fallback from CITY_COORDS
    """

    def __init__(self):
        self._cache = {}       # address_key → (lat, lng) or None
        self._last_request = 0  # timestamp for rate limiting

    def process_item(self, item, spider):
        # 1. Already has coordinates from spider
        if item.get("latitude") and item.get("longitude"):
            return item

        city = item.get("city")
        address = item.get("address_raw") or item.get("neighborhood")

        # 2. Try Nominatim if we have address-level data
        if address and city:
            coords = self._geocode(address, city)
            if coords:
                item["latitude"], item["longitude"] = coords
                return item

        # 3. Fall back to city center
        if city and city in CITY_COORDS:
            item["latitude"], item["longitude"] = CITY_COORDS[city]
            return item

        return item

    def _geocode(self, address, city):
        """Geocode address via Nominatim with caching and rate limiting."""
        cache_key = f"{address}|{city}".lower()
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Rate limit: 1 req/sec
        now = time.time()
        elapsed = now - self._last_request
        if elapsed < 1.0:
            time.sleep(1.0 - elapsed)

        try:
            resp = requests.get(
                NOMINATIM_URL,
                params={"q": f"{address}, {city}, Albania", "format": "json", "limit": 1},
                headers=NOMINATIM_HEADERS,
                timeout=10,
            )
            self._last_request = time.time()

            if resp.status_code == 200:
                data = resp.json()
                if data:
                    coords = (float(data[0]["lat"]), float(data[0]["lon"]))
                    self._cache[cache_key] = coords
                    return coords

            self._cache[cache_key] = None
            return None

        except Exception:
            self._cache[cache_key] = None
            return None


class DedupPipeline:
    """Same-source dedup: update existing listings, insert new ones."""

    def __init__(self):
        self.seen = set()

    def process_item(self, item, spider):
        key = (item["source"], item["source_id"])
        if key in self.seen:
            raise DropItem(f"Duplicate in batch: {key}")
        self.seen.add(key)
        return item


class SQLitePipeline:
    """Store listings in SQLite database."""

    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = None

    @classmethod
    def from_crawler(cls, crawler):
        db_path = os.environ.get(
            "SQLITE_DB_PATH",
            crawler.settings.get("SQLITE_DB_PATH", "db/shtepi.db"),
        )
        if not os.path.isabs(db_path):
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            db_path = os.path.join(project_root, db_path)
        return cls(db_path)

    def open_spider(self, spider):
        self.conn = sqlite3.connect(self.db_path)
        self._init_db()

    def close_spider(self, spider):
        if self.conn:
            self.conn.commit()
            self.conn.close()

    def _init_db(self):
        """Create tables if they don't exist."""
        import os
        schema_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "db",
            "schema.sql",
        )
        if os.path.exists(schema_path):
            with open(schema_path) as f:
                self.conn.executescript(f.read())

    def process_item(self, item, spider):
        now = datetime.now(timezone.utc).isoformat()

        # Check if listing already exists
        cursor = self.conn.execute(
            "SELECT id, price FROM listings WHERE source = ? AND source_id = ?",
            (item["source"], item["source_id"]),
        )
        existing = cursor.fetchone()

        images_json = json.dumps(item.get("images", []))

        if existing:
            # Update existing listing
            self.conn.execute(
                """UPDATE listings SET
                    title = ?, description = ?, price = ?, price_all = ?,
                    currency_original = ?, price_period = ?,
                    property_type = ?, room_config = ?,
                    area_sqm = ?, area_net_sqm = ?, floor = ?, total_floors = ?,
                    rooms = ?, bathrooms = ?,
                    city = ?, neighborhood = ?, address_raw = ?,
                    latitude = ?, longitude = ?,
                    images = ?, image_count = ?,
                    poster_name = ?, poster_phone = ?, poster_type = ?,
                    is_active = 1, last_seen = ?,
                    has_elevator = ?, has_parking = ?,
                    is_furnished = ?, is_new_build = ?,
                    raw_json = ?
                WHERE id = ?""",
                (
                    item.get("title"),
                    item.get("description"),
                    item.get("price"),
                    item.get("price_all"),
                    item.get("currency_original"),
                    item.get("price_period", "total"),
                    item.get("property_type"),
                    item.get("room_config"),
                    item.get("area_sqm"),
                    item.get("area_net_sqm"),
                    item.get("floor"),
                    item.get("total_floors"),
                    item.get("rooms"),
                    item.get("bathrooms"),
                    item.get("city"),
                    item.get("neighborhood"),
                    item.get("address_raw"),
                    item.get("latitude"),
                    item.get("longitude"),
                    images_json,
                    item.get("image_count", 0),
                    item.get("poster_name"),
                    item.get("poster_phone"),
                    item.get("poster_type", "private"),
                    now,
                    item.get("has_elevator"),
                    item.get("has_parking"),
                    item.get("is_furnished"),
                    item.get("is_new_build"),
                    item.get("raw_json"),
                    existing[0],
                ),
            )
        else:
            # Insert new listing
            listing_id = str(uuid.uuid4())
            self.conn.execute(
                """INSERT INTO listings (
                    id, source, source_url, source_id,
                    title, description, price, price_all,
                    currency_original, price_period,
                    transaction_type, property_type, room_config,
                    area_sqm, area_net_sqm, floor, total_floors,
                    rooms, bathrooms,
                    city, neighborhood, address_raw,
                    latitude, longitude,
                    images, image_count,
                    poster_name, poster_phone, poster_type,
                    is_active, first_seen, last_seen, created_at,
                    has_elevator, has_parking, is_furnished, is_new_build,
                    raw_json
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?, ?,
                    1, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?
                )""",
                (
                    listing_id,
                    item["source"],
                    item["source_url"],
                    item["source_id"],
                    item.get("title"),
                    item.get("description"),
                    item.get("price"),
                    item.get("price_all"),
                    item.get("currency_original"),
                    item.get("price_period", "total"),
                    item["transaction_type"],
                    item.get("property_type"),
                    item.get("room_config"),
                    item.get("area_sqm"),
                    item.get("area_net_sqm"),
                    item.get("floor"),
                    item.get("total_floors"),
                    item.get("rooms"),
                    item.get("bathrooms"),
                    item.get("city"),
                    item.get("neighborhood"),
                    item.get("address_raw"),
                    item.get("latitude"),
                    item.get("longitude"),
                    images_json,
                    item.get("image_count", 0),
                    item.get("poster_name"),
                    item.get("poster_phone"),
                    item.get("poster_type", "private"),
                    now,
                    now,
                    item.get("created_at"),
                    item.get("has_elevator"),
                    item.get("has_parking"),
                    item.get("is_furnished"),
                    item.get("is_new_build"),
                    item.get("raw_json"),
                ),
            )

        self.conn.commit()
        return item


class PostgreSQLPipeline:
    """Store listings in PostgreSQL (Supabase) with batch upsert."""

    BUFFER_SIZE = 50

    @staticmethod
    def _to_bool(val):
        """Cast int/str to bool for PostgreSQL BOOLEAN columns, preserving None."""
        if val is None:
            return None
        return bool(val)

    def __init__(self, database_url):
        self.database_url = database_url
        self.conn = None
        self.buffer = []

    @classmethod
    def from_crawler(cls, crawler):
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            raise ValueError("DATABASE_URL environment variable required for PostgreSQLPipeline")
        return cls(database_url)

    def open_spider(self, spider):
        import psycopg2
        self.conn = psycopg2.connect(self.database_url)
        self.buffer = []

    def close_spider(self, spider):
        if self.buffer:
            self._flush()
        if self.conn:
            self.conn.close()

    def process_item(self, item, spider):
        self.buffer.append(dict(item))
        if len(self.buffer) >= self.BUFFER_SIZE:
            self._flush()
        return item

    def _reconnect(self):
        """Reconnect to PostgreSQL if connection was lost (e.g. idle timeout)."""
        import psycopg2
        try:
            if self.conn and not self.conn.closed:
                self.conn.close()
        except Exception:
            pass
        self.conn = psycopg2.connect(self.database_url)

    def _flush(self):
        if not self.buffer:
            return

        now = datetime.now(timezone.utc).isoformat()
        try:
            cursor = self.conn.cursor()
            cursor.execute("SELECT 1")
            cursor.close()
        except Exception:
            self._reconnect()

        failed = []
        cursor = self.conn.cursor()

        for item in self.buffer:
            images_json = json.dumps(item.get("images", []))
            listing_id = str(uuid.uuid4())
            params = {
                "id": listing_id,
                "source": item.get("source"),
                "source_url": item.get("source_url"),
                "source_id": item.get("source_id"),
                "title": item.get("title"),
                "description": item.get("description"),
                "price": item.get("price"),
                "price_all": item.get("price_all"),
                "currency_original": item.get("currency_original", "EUR"),
                "price_period": item.get("price_period", "total"),
                "transaction_type": item.get("transaction_type"),
                "property_type": item.get("property_type"),
                "room_config": item.get("room_config"),
                "area_sqm": item.get("area_sqm"),
                "area_net_sqm": item.get("area_net_sqm"),
                "floor": item.get("floor"),
                "total_floors": item.get("total_floors"),
                "rooms": item.get("rooms"),
                "bathrooms": item.get("bathrooms"),
                "city": item.get("city"),
                "neighborhood": item.get("neighborhood"),
                "address_raw": item.get("address_raw"),
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "images": images_json,
                "image_count": item.get("image_count", 0),
                "poster_name": item.get("poster_name"),
                "poster_phone": item.get("poster_phone"),
                "poster_type": item.get("poster_type", "private"),
                "now": now,
                "has_elevator": self._to_bool(item.get("has_elevator")),
                "has_parking": self._to_bool(item.get("has_parking")),
                "is_furnished": self._to_bool(item.get("is_furnished")),
                "is_new_build": self._to_bool(item.get("is_new_build")),
            }

            try:
                cursor.execute(
                    """INSERT INTO listings (
                        id, source, source_url, source_id,
                        title, description, price, price_all,
                        currency_original, price_period,
                        transaction_type, property_type, room_config,
                        area_sqm, area_net_sqm, floor, total_floors,
                        rooms, bathrooms,
                        city, neighborhood, address_raw,
                        latitude, longitude,
                        images, image_count,
                        poster_name, poster_phone, poster_type,
                        is_active, origin, status,
                        first_seen, last_seen, created_at, updated_at,
                        has_elevator, has_parking, is_furnished, is_new_build
                    ) VALUES (
                        %(id)s, %(source)s, %(source_url)s, %(source_id)s,
                        %(title)s, %(description)s, %(price)s, %(price_all)s,
                        %(currency_original)s, %(price_period)s,
                        %(transaction_type)s, %(property_type)s, %(room_config)s,
                        %(area_sqm)s, %(area_net_sqm)s, %(floor)s, %(total_floors)s,
                        %(rooms)s, %(bathrooms)s,
                        %(city)s, %(neighborhood)s, %(address_raw)s,
                        %(latitude)s, %(longitude)s,
                        %(images)s, %(image_count)s,
                        %(poster_name)s, %(poster_phone)s, %(poster_type)s,
                        true, 'scraped', 'active',
                        %(now)s, %(now)s, %(now)s, %(now)s,
                        %(has_elevator)s, %(has_parking)s, %(is_furnished)s, %(is_new_build)s
                    )
                    ON CONFLICT (source, source_id) WHERE source IS NOT NULL
                    DO UPDATE SET
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        price = EXCLUDED.price,
                        price_all = EXCLUDED.price_all,
                        currency_original = EXCLUDED.currency_original,
                        price_period = EXCLUDED.price_period,
                        property_type = EXCLUDED.property_type,
                        room_config = EXCLUDED.room_config,
                        area_sqm = EXCLUDED.area_sqm,
                        area_net_sqm = EXCLUDED.area_net_sqm,
                        floor = EXCLUDED.floor,
                        total_floors = EXCLUDED.total_floors,
                        rooms = EXCLUDED.rooms,
                        bathrooms = EXCLUDED.bathrooms,
                        city = EXCLUDED.city,
                        neighborhood = EXCLUDED.neighborhood,
                        address_raw = EXCLUDED.address_raw,
                        latitude = COALESCE(EXCLUDED.latitude, listings.latitude),
                        longitude = COALESCE(EXCLUDED.longitude, listings.longitude),
                        images = EXCLUDED.images,
                        image_count = EXCLUDED.image_count,
                        poster_name = EXCLUDED.poster_name,
                        poster_phone = EXCLUDED.poster_phone,
                        poster_type = EXCLUDED.poster_type,
                        is_active = true,
                        last_seen = EXCLUDED.last_seen,
                        updated_at = EXCLUDED.updated_at,
                        has_elevator = EXCLUDED.has_elevator,
                        has_parking = EXCLUDED.has_parking,
                        is_furnished = EXCLUDED.is_furnished,
                        is_new_build = EXCLUDED.is_new_build
                    """,
                    params,
                )
            except Exception as exc:
                self.conn.rollback()
                failed.append((item.get("source"), item.get("source_id"), str(exc)))
                cursor = self.conn.cursor()

        self.conn.commit()
        cursor.close()

        if failed:
            import logging
            logger = logging.getLogger(__name__)
            for source, source_id, err in failed:
                logger.warning("Failed to upsert %s/%s: %s", source, source_id, err)

        self.buffer = []


class DropItem(Exception):
    """Raised to drop an item from the pipeline."""
    pass
