import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/drizzle";
import { adImpressions, adClicks, adCampaigns } from "../db/schema";
import { incrementFrequencyCache } from "./frequency";

// --- Impression batching ---
// Collect impressions in memory, flush to DB periodically

interface PendingImpression {
  campaignId: string;
  listingId: string | null;
  placement: string;
  userFingerprint: string | null;
  device: string | null;
  cityContext: string | null;
}

const impressionBuffer: PendingImpression[] = [];
const FLUSH_INTERVAL_MS = 5000; // 5 seconds
const FLUSH_THRESHOLD = 50; // or 50 items
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    flushTimer = null;
    await flushImpressions();
  }, FLUSH_INTERVAL_MS);
}

/** Add an impression to the buffer. Flushes when threshold reached or timer fires. */
export function recordImpression(impression: PendingImpression) {
  impressionBuffer.push(impression);

  // Update frequency cache immediately
  if (impression.userFingerprint) {
    incrementFrequencyCache(impression.userFingerprint, impression.campaignId);
  }

  if (impressionBuffer.length >= FLUSH_THRESHOLD) {
    void flushImpressions();
  } else {
    startFlushTimer();
  }
}

/** Flush buffered impressions to DB. */
export async function flushImpressions(): Promise<number> {
  if (impressionBuffer.length === 0) return 0;

  const batch = impressionBuffer.splice(0, impressionBuffer.length);
  const db = getDb();
  if (!db) return 0;

  try {
    await db.insert(adImpressions).values(
      batch.map((imp) => ({
        campaignId: imp.campaignId,
        listingId: imp.listingId,
        placement: imp.placement as
          | "search_top"
          | "search_sidebar"
          | "homepage_latest"
          | "city_page"
          | "detail_sidebar"
          | "mobile_sticky"
          | "hero_carousel",
        userFingerprint: imp.userFingerprint,
        device: imp.device,
        cityContext: imp.cityContext,
      }))
    );

    // CPM billing: impressions are accumulated and spend is settled
    // in a separate daily aggregation step, not per-flush.

    return batch.length;
  } catch (err) {
    // Re-add failed batch to buffer for retry
    impressionBuffer.unshift(...batch);
    console.error("[ads] Failed to flush impressions:", err);
    return 0;
  }
}

/** Record a click and update CPC campaign spend. */
export async function recordClick(
  impressionId: number | null,
  campaignId: string
): Promise<void> {
  const db = getDb();
  if (!db) return;

  // Insert click record
  await db.insert(adClicks).values({
    impressionId: impressionId,
    campaignId,
  });

  // For CPC campaigns, increment spent_eur by bid amount
  await db
    .update(adCampaigns)
    .set({
      spentEur: sql`${adCampaigns.spentEur} + ${adCampaigns.bidAmountEur}`,
    })
    .where(eq(adCampaigns.id, campaignId));
}
