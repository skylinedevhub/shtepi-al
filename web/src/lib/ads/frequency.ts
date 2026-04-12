import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../db/drizzle";
import { adImpressions } from "../db/schema";

// --- LRU frequency cache ---
// Key: "fingerprint:campaignId", Value: count in last 24h
// Reduces DB hits for repeated checks on same user+campaign
const LRU_MAX = 1000;
const LRU_TTL_MS = 60 * 60 * 1000; // 1 hour

const cache = new Map<string, { count: number; expiry: number }>();

function lruGet(key: string): number | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiry < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.count;
}

function lruSet(key: string, count: number) {
  // Evict oldest entries if over capacity
  if (cache.size >= LRU_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { count, expiry: Date.now() + LRU_TTL_MS });
}

/**
 * Check if a user has exceeded the frequency cap for a campaign.
 * Returns true if capped (should NOT show ad).
 */
export async function checkFrequencyCap(
  userFingerprint: string,
  campaignId: string,
  maxImpressions: number
): Promise<boolean> {
  const cacheKey = `${userFingerprint}:${campaignId}`;

  // Check LRU cache first
  const cached = lruGet(cacheKey);
  if (cached !== null) {
    return cached >= maxImpressions;
  }

  const db = getDb();
  if (!db) return false;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(adImpressions)
    .where(
      and(
        eq(adImpressions.userFingerprint, userFingerprint),
        eq(adImpressions.campaignId, campaignId),
        gte(adImpressions.createdAt, twentyFourHoursAgo)
      )
    );

  const count = Number(result.count);
  lruSet(cacheKey, count);

  return count >= maxImpressions;
}

/** Increment frequency count in cache after recording an impression. */
export function incrementFrequencyCache(
  userFingerprint: string,
  campaignId: string
) {
  const cacheKey = `${userFingerprint}:${campaignId}`;
  const cached = lruGet(cacheKey);
  if (cached !== null) {
    lruSet(cacheKey, cached + 1);
  }
}

/** Clear entire frequency cache (for testing). */
export function clearFrequencyCache() {
  cache.clear();
}
