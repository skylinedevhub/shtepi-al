#!/usr/bin/env python3
"""Mark stale listings as inactive.

A listing is stale if it hasn't been seen by any spider for N days
(default: 14). This means the listing likely no longer exists on
the source site.

Usage:
    python scripts/mark_stale.py                  # dry-run (default)
    python scripts/mark_stale.py --apply           # actually deactivate
    python scripts/mark_stale.py --days 7          # custom staleness threshold
    python scripts/mark_stale.py --revert          # re-activate stale-deactivated listings

Requires DATABASE_URL environment variable.
"""

import argparse
import os
import sys
from datetime import datetime, timezone, timedelta

import psycopg2


def get_connection():
    url = os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


def find_stale(conn, days):
    """Find active scraped listings not seen in the last N days."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    cur = conn.cursor()
    cur.execute("""
        SELECT id::text, source, source_id, title, city, last_seen
        FROM listings
        WHERE is_active = true
          AND origin = 'scraped'
          AND last_seen < %s
        ORDER BY last_seen ASC
    """, (cutoff,))
    rows = cur.fetchall()
    cur.close()
    return rows


def mark_inactive(conn, listing_ids):
    """Set is_active=false and record staleness metadata."""
    now = datetime.now(timezone.utc).isoformat()
    cur = conn.cursor()
    cur.execute("""
        UPDATE listings
        SET is_active = false,
            updated_at = %s,
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'stale_deactivated', true,
                'stale_date', %s
            )
        WHERE id::text = ANY(%s)
    """, (now, now, listing_ids))
    count = cur.rowcount
    conn.commit()
    cur.close()
    return count


def revert_stale(conn):
    """Re-activate listings that were deactivated by staleness check."""
    now = datetime.now(timezone.utc).isoformat()
    cur = conn.cursor()
    cur.execute("""
        UPDATE listings
        SET is_active = true,
            updated_at = %s,
            metadata = metadata - 'stale_deactivated' - 'stale_date'
        WHERE is_active = false
          AND metadata->>'stale_deactivated' = 'true'
    """, (now,))
    count = cur.rowcount
    conn.commit()
    cur.close()
    return count


def main():
    parser = argparse.ArgumentParser(description="Mark stale listings as inactive")
    parser.add_argument("--days", type=int, default=14,
                        help="Days since last_seen to consider stale (default: 14)")
    parser.add_argument("--apply", action="store_true",
                        help="Actually deactivate (default is dry-run)")
    parser.add_argument("--revert", action="store_true",
                        help="Re-activate all stale-deactivated listings")
    args = parser.parse_args()

    conn = get_connection()

    if args.revert:
        count = revert_stale(conn)
        print(f"Re-activated {count} stale-deactivated listings")
        conn.close()
        return

    stale = find_stale(conn, args.days)
    print(f"Found {len(stale)} stale listings (not seen in {args.days} days)")

    if not stale:
        conn.close()
        return

    # Group by source for summary
    by_source = {}
    for row in stale:
        src = row[1]
        by_source[src] = by_source.get(src, 0) + 1

    print("\nBy source:")
    for src, cnt in sorted(by_source.items(), key=lambda x: -x[1]):
        print(f"  {src}: {cnt}")

    # Show oldest
    print(f"\nOldest: {stale[0][5]} ({stale[0][1]}/{stale[0][2]}: {stale[0][3][:60]})")
    print(f"Newest: {stale[-1][5]} ({stale[-1][1]}/{stale[-1][2]}: {stale[-1][3][:60]})")

    if args.apply:
        ids = [row[0] for row in stale]
        count = mark_inactive(conn, ids)
        print(f"\nDeactivated {count} stale listings")
    else:
        print(f"\nDry run — use --apply to deactivate these {len(stale)} listings")

    conn.close()


if __name__ == "__main__":
    main()
