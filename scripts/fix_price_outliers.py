#!/usr/bin/env python3
"""Fix price outliers in existing data.

Deactivates listings with prices outside reasonable bounds:
- Sale: €500 – €10,000,000
- Rent: €50 – €50,000/month

Also fixes common price_period mismatches:
- Sale listings with price_period='monthly' → set to 'total'

Usage:
    python scripts/fix_price_outliers.py              # dry-run
    python scripts/fix_price_outliers.py --apply       # actually fix

Requires DATABASE_URL environment variable.
"""

import argparse
import os
import sys
from datetime import datetime, timezone

import psycopg2

PRICE_BOUNDS = {
    "sale": (500, 10_000_000),
    "rent": (50, 50_000),
}


def get_connection():
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def find_outliers(conn):
    """Find active listings with outlier prices."""
    cur = conn.cursor()
    cur.execute("""
        SELECT id::text, source, source_id, title, price, transaction_type, price_period
        FROM listings
        WHERE is_active = true
          AND price IS NOT NULL
          AND (
            (transaction_type = 'sale' AND (price < 500 OR price > 10000000))
            OR
            (transaction_type = 'rent' AND (price < 50 OR price > 50000))
          )
        ORDER BY price ASC
    """)
    rows = cur.fetchall()
    cur.close()
    return rows


def find_period_mismatches(conn):
    """Find sale listings with price_period='monthly'."""
    cur = conn.cursor()
    cur.execute("""
        SELECT id::text, source, source_id, title, price, price_period
        FROM listings
        WHERE is_active = true
          AND transaction_type = 'sale'
          AND price_period = 'monthly'
    """)
    rows = cur.fetchall()
    cur.close()
    return rows


def deactivate_outliers(conn, listing_ids):
    now = datetime.now(timezone.utc).isoformat()
    cur = conn.cursor()
    cur.execute("""
        UPDATE listings
        SET is_active = false,
            updated_at = %s,
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'price_outlier_deactivated', true,
                'outlier_date', %s
            )
        WHERE id::text = ANY(%s)
    """, (now, now, listing_ids))
    count = cur.rowcount
    conn.commit()
    cur.close()
    return count


def fix_price_periods(conn, listing_ids):
    now = datetime.now(timezone.utc).isoformat()
    cur = conn.cursor()
    cur.execute("""
        UPDATE listings
        SET price_period = 'total',
            updated_at = %s
        WHERE id::text = ANY(%s)
    """, (now, listing_ids))
    count = cur.rowcount
    conn.commit()
    cur.close()
    return count


def main():
    parser = argparse.ArgumentParser(description="Fix price outliers in existing data")
    parser.add_argument("--apply", action="store_true", help="Actually fix (default is dry-run)")
    args = parser.parse_args()

    conn = get_connection()

    # 1. Price outliers
    outliers = find_outliers(conn)
    print(f"Found {len(outliers)} price outliers")
    if outliers:
        by_type = {}
        for row in outliers:
            txn = row[5]
            by_type[txn] = by_type.get(txn, 0) + 1
        for txn, cnt in sorted(by_type.items()):
            print(f"  {txn}: {cnt}")

        print("\nExamples:")
        for row in outliers[:5]:
            print(f"  €{row[4]:,.0f} ({row[5]}) — {row[1]}/{row[2]}: {row[3][:50]}")
        if len(outliers) > 5:
            print(f"  ... and {len(outliers) - 5} more")

    # 2. Price period mismatches
    mismatches = find_period_mismatches(conn)
    print(f"\nFound {len(mismatches)} sale listings with price_period='monthly'")
    if mismatches:
        for row in mismatches[:5]:
            print(f"  €{row[4]:,.0f} — {row[1]}/{row[2]}: {row[3][:50]}")

    if args.apply:
        if outliers:
            ids = [r[0] for r in outliers]
            count = deactivate_outliers(conn, ids)
            print(f"\nDeactivated {count} price outliers")

        if mismatches:
            ids = [r[0] for r in mismatches]
            count = fix_price_periods(conn, ids)
            print(f"Fixed {count} price_period mismatches (monthly → total)")
    else:
        total = len(outliers) + len(mismatches)
        if total > 0:
            print(f"\nDry run — use --apply to fix {total} issues")

    conn.close()


if __name__ == "__main__":
    main()
