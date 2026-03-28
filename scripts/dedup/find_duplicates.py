#!/usr/bin/env python3
"""Cross-source and within-source duplicate finder for ShtëpiAL.

Strategy A (quick wins):
  1. Within-source:  same source + title + price  → keep newest
  2. Exact title:    same title + city across sources → keep best
  3. Phone/poster:   same phone + city + price + area across sources → keep best

Usage:
  python scripts/dedup/find_duplicates.py --dry-run     # preview only
  python scripts/dedup/find_duplicates.py --apply        # mark duplicates inactive
  python scripts/dedup/find_duplicates.py --revert       # undo all dedup marks
"""

import argparse
import json
import os
import sys
import uuid
from collections import defaultdict
from datetime import datetime, timezone

import psycopg2
import psycopg2.extras


def get_db_url():
    """Read DATABASE_URL from environment or web/.env.local."""
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", "web", ".env.local")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    return line.split("=", 1)[1].strip().strip('"')
    print("ERROR: DATABASE_URL not found")
    sys.exit(1)


def score_listing(row):
    """Score a listing to determine which to keep as canonical.

    Higher score = better listing to keep.
    """
    score = 0
    # More images is better
    score += min(row["image_count"] or 0, 10) * 3
    # Has description
    if row["description"]:
        score += min(len(row["description"]), 500) // 50
    # Has neighborhood
    if row["neighborhood"]:
        score += 5
    # Has floor info
    if row["floor"] is not None:
        score += 3
    # Has area
    if row["area_sqm"] is not None:
        score += 3
    # Has room_config
    if row["room_config"]:
        score += 2
    # Has real coordinates (not city-center fallback)
    if row["latitude"] and row["longitude"]:
        score += 2
    # Recency bonus — newer is better
    if row["last_seen"]:
        score += 1
    # Source quality preference
    source_bonus = {"duashpi": 4, "njoftime": 3, "merrjep": 2, "mirlir": 1, "celesi": 0}
    score += source_bonus.get(row["source"], 0)
    return score


def find_within_source_dupes(cur):
    """Strategy 1: Same source + same title (length>20) + same price."""
    cur.execute("""
        SELECT source, title, price,
               array_agg(id::text ORDER BY last_seen DESC NULLS LAST) as ids
        FROM listings
        WHERE is_active = true
          AND title IS NOT NULL AND LENGTH(title) > 20
        GROUP BY source, title, price
        HAVING COUNT(*) > 1
    """)
    clusters = []
    for row in cur.fetchall():
        ids = row[3]
        clusters.append({
            "reason": "within_source",
            "detail": f"{row[0]}: {row[1][:60]}",
            "keep": ids[0],  # newest
            "deactivate": ids[1:],
        })
    return clusters


def find_exact_title_dupes(cur):
    """Strategy 2: Same title + city across different sources."""
    cur.execute("""
        SELECT title, city, array_agg(id::text) as ids
        FROM listings
        WHERE is_active = true
          AND title IS NOT NULL AND LENGTH(title) > 20
          AND city IS NOT NULL
        GROUP BY title, city
        HAVING COUNT(DISTINCT source) > 1
    """)

    clusters = []
    for row in cur.fetchall():
        ids = row[2]
        # Fetch full rows to score them
        cur.execute("""
            SELECT id::text, source, title, image_count, description, neighborhood,
                   floor, area_sqm, room_config, latitude, longitude, last_seen
            FROM listings WHERE id::text = ANY(%s)
        """, (ids,))
        rows = [dict(zip(
            ["id", "source", "title", "image_count", "description", "neighborhood",
             "floor", "area_sqm", "room_config", "latitude", "longitude", "last_seen"],
            r
        )) for r in cur.fetchall()]

        scored = sorted(rows, key=score_listing, reverse=True)
        clusters.append({
            "reason": "exact_title_cross_source",
            "detail": f"{row[1]}: {row[0][:60]}",
            "keep": scored[0]["id"],
            "deactivate": [r["id"] for r in scored[1:]],
        })
    return clusters


def find_phone_poster_dupes(cur):
    """Strategy 3: Same phone + city + price + area across sources."""
    cur.execute("""
        SELECT poster_phone, city, price, area_sqm,
               array_agg(id::text) as ids,
               COUNT(DISTINCT source) as src_count
        FROM listings
        WHERE is_active = true
          AND poster_phone IS NOT NULL AND poster_phone != ''
          AND city IS NOT NULL
          AND price IS NOT NULL
          AND area_sqm IS NOT NULL
        GROUP BY poster_phone, city, price, area_sqm
        HAVING COUNT(DISTINCT source) > 1
    """)

    clusters = []
    for row in cur.fetchall():
        ids = row[4]
        cur.execute("""
            SELECT id::text, source, title, image_count, description, neighborhood,
                   floor, area_sqm, room_config, latitude, longitude, last_seen
            FROM listings WHERE id::text = ANY(%s)
        """, (ids,))
        rows = [dict(zip(
            ["id", "source", "title", "image_count", "description", "neighborhood",
             "floor", "area_sqm", "room_config", "latitude", "longitude", "last_seen"],
            r
        )) for r in cur.fetchall()]

        scored = sorted(rows, key=score_listing, reverse=True)
        clusters.append({
            "reason": "phone_price_area",
            "detail": f"{row[0]} in {row[1]}: €{row[2]} {row[3]}m²",
            "keep": scored[0]["id"],
            "deactivate": [r["id"] for r in scored[1:]],
        })
    return clusters


def apply_dedup(cur, conn, clusters):
    """Mark duplicate listings as inactive with metadata."""
    now = datetime.now(timezone.utc).isoformat()
    deactivated = 0

    for cluster in clusters:
        for dup_id in cluster["deactivate"]:
            meta = {
                "dedup_canonical": cluster["keep"],
                "dedup_reason": cluster["reason"],
                "dedup_date": now,
            }
            cur.execute("""
                UPDATE listings
                SET is_active = false,
                    metadata = COALESCE(metadata, '{}'::jsonb) || %s::jsonb,
                    updated_at = NOW()
                WHERE id = %s AND is_active = true
            """, (json.dumps(meta), dup_id))
            deactivated += cur.rowcount

    conn.commit()
    return deactivated


def apply_grouping(cur, conn, clusters):
    """Assign listing_group_id to all members of each cluster.

    Unlike --apply, this does NOT deactivate any listings. All copies stay
    active but are linked by a shared group UUID for display purposes.
    """
    grouped = 0

    for cluster in clusters:
        all_ids = [cluster["keep"]] + cluster["deactivate"]
        if len(all_ids) < 2:
            continue

        group_id = str(uuid.uuid4())
        cur.execute("""
            UPDATE listings
            SET listing_group_id = %s::uuid,
                updated_at = NOW()
            WHERE id::text = ANY(%s)
              AND is_active = true
        """, (group_id, all_ids))
        grouped += cur.rowcount

    conn.commit()
    return grouped


def revert_dedup(cur, conn):
    """Re-activate all listings that were deduped."""
    cur.execute("""
        UPDATE listings
        SET is_active = true,
            metadata = metadata - 'dedup_canonical' - 'dedup_reason' - 'dedup_date',
            updated_at = NOW()
        WHERE is_active = false
          AND metadata ? 'dedup_canonical'
    """)
    reverted = cur.rowcount
    conn.commit()
    return reverted


def revert_grouping(cur, conn):
    """Remove all listing_group_id assignments."""
    cur.execute("""
        UPDATE listings
        SET listing_group_id = NULL,
            updated_at = NOW()
        WHERE listing_group_id IS NOT NULL
    """)
    ungrouped = cur.rowcount
    conn.commit()
    return ungrouped


def main():
    parser = argparse.ArgumentParser(description="ShtëpiAL duplicate finder")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--dry-run", action="store_true", help="Preview duplicates without changes")
    group.add_argument("--apply", action="store_true", help="Mark duplicates as inactive")
    group.add_argument("--group", action="store_true", help="Link duplicates via listing_group_id (all stay active)")
    group.add_argument("--revert", action="store_true", help="Undo all dedup marks")
    group.add_argument("--revert-groups", action="store_true", help="Remove all listing_group_id assignments")
    args = parser.parse_args()

    conn = psycopg2.connect(get_db_url())
    cur = conn.cursor()

    if args.revert:
        reverted = revert_dedup(cur, conn)
        print(f"Reverted {reverted} listings back to active")
        cur.close()
        conn.close()
        return

    if getattr(args, "revert_groups", False):
        ungrouped = revert_grouping(cur, conn)
        print(f"Removed grouping from {ungrouped} listings")
        cur.close()
        conn.close()
        return

    # Get baseline count
    cur.execute("SELECT COUNT(*) FROM listings WHERE is_active = true")
    active_before = cur.fetchone()[0]

    print(f"Active listings: {active_before}")
    print()

    # Run all strategies
    print("Strategy 1: Within-source duplicates...")
    within_source = find_within_source_dupes(cur)
    ws_dedup_count = sum(len(c["deactivate"]) for c in within_source)
    print(f"  Found {len(within_source)} clusters, {ws_dedup_count} duplicates to deactivate")

    print("Strategy 2: Exact title cross-source...")
    exact_title = find_exact_title_dupes(cur)
    et_dedup_count = sum(len(c["deactivate"]) for c in exact_title)
    print(f"  Found {len(exact_title)} clusters, {et_dedup_count} duplicates to deactivate")

    print("Strategy 3: Phone + price + area cross-source...")
    phone_poster = find_phone_poster_dupes(cur)
    pp_dedup_count = sum(len(c["deactivate"]) for c in phone_poster)
    print(f"  Found {len(phone_poster)} clusters, {pp_dedup_count} duplicates to deactivate")

    # Merge all clusters, deduplicating IDs across strategies
    all_clusters = within_source + exact_title + phone_poster
    seen_deactivated = set()
    merged = []
    for cluster in all_clusters:
        new_deactivate = [d for d in cluster["deactivate"] if d not in seen_deactivated]
        if new_deactivate:
            cluster["deactivate"] = new_deactivate
            merged.append(cluster)
            seen_deactivated.update(new_deactivate)

    total_dedup = len(seen_deactivated)
    print(f"\nTotal unique duplicates: {total_dedup}")
    print(f"Active after dedup: {active_before - total_dedup}")
    print(f"Reduction: {100 * total_dedup / active_before:.1f}%")

    if args.dry_run:
        print("\n--- DRY RUN: showing first 20 clusters ---")
        for i, cluster in enumerate(merged[:20]):
            print(f"\n  [{cluster['reason']}] {cluster['detail']}")
            print(f"    Keep: {cluster['keep']}")
            print(f"    Deactivate: {cluster['deactivate']}")

        # Summary by reason
        print("\n--- Summary by reason ---")
        by_reason = defaultdict(int)
        for c in merged:
            by_reason[c["reason"]] += len(c["deactivate"])
        for reason, count in sorted(by_reason.items(), key=lambda x: -x[1]):
            print(f"  {reason}: {count} listings")

    elif args.apply:
        deactivated = apply_dedup(cur, conn, merged)
        print(f"\nApplied: {deactivated} listings marked inactive")

    elif args.group:
        grouped = apply_grouping(cur, conn, merged)
        print(f"\nGrouped: {grouped} listings linked via listing_group_id (all stay active)")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
