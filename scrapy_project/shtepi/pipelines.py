"""Scrapy item pipelines for ShtëpiAL.

Pipeline chain: Validate → Normalize → Dedup → Store
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone

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
        db_path = crawler.settings.get("SQLITE_DB_PATH", "db/shtepi.db")
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


class DropItem(Exception):
    """Raised to drop an item from the pipeline."""
    pass
