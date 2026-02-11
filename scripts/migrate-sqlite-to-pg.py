#!/usr/bin/env python3
"""One-time migration: SQLite → Neon PostgreSQL.

Usage:
    DATABASE_URL=postgresql://... python scripts/migrate-sqlite-to-pg.py [path/to/shtepi.db]

Reads all listings from SQLite and inserts them into PostgreSQL via Neon.
Uses ON CONFLICT to handle re-runs safely (upsert by source + source_id).
"""

import json
import os
import sqlite3
import sys
from datetime import datetime, timezone

import psycopg2

SQLITE_PATH = sys.argv[1] if len(sys.argv) > 1 else "db/shtepi.db"
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable required")
    sys.exit(1)

if not os.path.exists(SQLITE_PATH):
    print(f"ERROR: SQLite database not found at {SQLITE_PATH}")
    sys.exit(1)


def main():
    # Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT * FROM listings")
    rows = cursor.fetchall()
    print(f"Found {len(rows)} listings in SQLite")

    # Connect to PostgreSQL
    pg_conn = psycopg2.connect(DATABASE_URL)
    pg_cursor = pg_conn.cursor()

    inserted = 0
    updated = 0
    errors = 0

    for row in rows:
        row_dict = dict(row)
        try:
            # Parse images from JSON string to actual array
            images_raw = row_dict.get("images", "[]")
            if isinstance(images_raw, str):
                try:
                    images = json.loads(images_raw)
                except (json.JSONDecodeError, TypeError):
                    images = []
            else:
                images = images_raw or []

            pg_cursor.execute(
                """
                INSERT INTO listings (
                    id, source, source_url, source_id,
                    title, description, price, price_all,
                    currency_original, price_period,
                    transaction_type, property_type, room_config,
                    area_sqm, area_net_sqm, floor, total_floors,
                    rooms, bathrooms,
                    city, neighborhood, address_raw,
                    images, image_count,
                    poster_name, poster_phone, poster_type,
                    is_active, origin, status,
                    first_seen, last_seen, created_at
                ) VALUES (
                    %(id)s, %(source)s, %(source_url)s, %(source_id)s,
                    %(title)s, %(description)s, %(price)s, %(price_all)s,
                    %(currency_original)s, %(price_period)s,
                    %(transaction_type)s, %(property_type)s, %(room_config)s,
                    %(area_sqm)s, %(area_net_sqm)s, %(floor)s, %(total_floors)s,
                    %(rooms)s, %(bathrooms)s,
                    %(city)s, %(neighborhood)s, %(address_raw)s,
                    %(images)s, %(image_count)s,
                    %(poster_name)s, %(poster_phone)s, %(poster_type)s,
                    %(is_active)s, 'scraped', 'active',
                    %(first_seen)s, %(last_seen)s, %(created_at)s
                )
                ON CONFLICT (source, source_id) WHERE source IS NOT NULL
                DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    price = EXCLUDED.price,
                    price_all = EXCLUDED.price_all,
                    last_seen = EXCLUDED.last_seen
                """,
                {
                    "id": row_dict["id"],
                    "source": row_dict.get("source"),
                    "source_url": row_dict.get("source_url"),
                    "source_id": row_dict.get("source_id"),
                    "title": row_dict.get("title"),
                    "description": row_dict.get("description"),
                    "price": row_dict.get("price"),
                    "price_all": row_dict.get("price_all"),
                    "currency_original": row_dict.get("currency_original", "EUR"),
                    "price_period": row_dict.get("price_period", "total"),
                    "transaction_type": row_dict.get("transaction_type"),
                    "property_type": row_dict.get("property_type"),
                    "room_config": row_dict.get("room_config"),
                    "area_sqm": row_dict.get("area_sqm"),
                    "area_net_sqm": row_dict.get("area_net_sqm"),
                    "floor": row_dict.get("floor"),
                    "total_floors": row_dict.get("total_floors"),
                    "rooms": row_dict.get("rooms"),
                    "bathrooms": row_dict.get("bathrooms"),
                    "city": row_dict.get("city"),
                    "neighborhood": row_dict.get("neighborhood"),
                    "address_raw": row_dict.get("address_raw"),
                    "images": json.dumps(images),
                    "image_count": row_dict.get("image_count", len(images)),
                    "poster_name": row_dict.get("poster_name"),
                    "poster_phone": row_dict.get("poster_phone"),
                    "poster_type": row_dict.get("poster_type", "private"),
                    "is_active": bool(row_dict.get("is_active", True)),
                    "first_seen": row_dict.get("first_seen"),
                    "last_seen": row_dict.get("last_seen"),
                    "created_at": row_dict.get("created_at"),
                },
            )

            if pg_cursor.statusmessage == "INSERT 0 1":
                inserted += 1
            else:
                updated += 1

        except Exception as e:
            errors += 1
            print(f"  ERROR on {row_dict.get('id', '?')}: {e}")
            pg_conn.rollback()
            continue

    pg_conn.commit()
    pg_cursor.close()
    pg_conn.close()
    sqlite_conn.close()

    print(f"\nMigration complete:")
    print(f"  Inserted: {inserted}")
    print(f"  Updated:  {updated}")
    print(f"  Errors:   {errors}")


if __name__ == "__main__":
    main()
