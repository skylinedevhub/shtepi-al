import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "../db/drizzle";
import { adCampaigns } from "../db/schema";
import { checkFrequencyCap } from "./frequency";

export interface AdContext {
  placement: string;
  city?: string;
  device?: "desktop" | "mobile";
  userFingerprint?: string;
  excludeListingIds?: string[];
  limit?: number;
}

export interface ServedAd {
  campaign_id: string;
  listing_id: string | null;
  creative_url: string | null;
  click_url: string | null;
  bid_type: string;
  campaign_name: string;
}

/**
 * Get ads for a given placement, respecting targeting, budget, and frequency caps.
 *
 * Rules:
 * - Only active campaigns within their date range
 * - Budget cap: don't serve if spent >= budget
 * - City targeting: campaign target_cities must include context city (or be null for all)
 * - Device targeting: campaign target_devices must include context device (or be null for all)
 * - Frequency cap: max N impressions per user per campaign in 24h
 * - No duplicate listings (exclude already-shown organic listing IDs)
 * - Max ads per placement: search_top=3, homepage_latest=1, city_page=2, detail_sidebar=2, mobile_sticky=1, hero_carousel=1
 */
export async function getAdsForPlacement(
  ctx: AdContext
): Promise<ServedAd[]> {
  const db = getDb();
  if (!db) return [];

  const now = new Date();
  const maxAds = getMaxAdsForPlacement(ctx.placement, ctx.limit);

  // Find eligible campaigns
  const conditions = [
    eq(adCampaigns.status, "active"),
    lte(adCampaigns.startDate, now),
    gte(adCampaigns.endDate, now),
    // Budget check: spent < budget (or budget is null for flat monthly)
    sql`(${adCampaigns.budgetEur} IS NULL OR ${adCampaigns.spentEur} < ${adCampaigns.budgetEur})`,
  ];

  // Map placement to campaign type
  const campaignType = placementToCampaignType(ctx.placement);
  if (campaignType) {
    conditions.push(eq(adCampaigns.type, campaignType));
  }

  const campaigns = await db
    .select()
    .from(adCampaigns)
    .where(and(...conditions))
    .orderBy(sql`${adCampaigns.bidAmountEur} DESC`) // highest bid first
    .limit(maxAds * 3); // fetch extra for filtering

  const results: ServedAd[] = [];

  for (const campaign of campaigns) {
    if (results.length >= maxAds) break;

    // City targeting
    const targetCities = campaign.targetCities as string[] | null;
    if (targetCities && ctx.city && !targetCities.includes(ctx.city)) {
      continue;
    }

    // Device targeting
    const targetDevices = campaign.targetDevices as string[] | null;
    if (targetDevices && ctx.device && !targetDevices.includes(ctx.device)) {
      continue;
    }

    // Frequency cap
    if (ctx.userFingerprint) {
      const capped = await checkFrequencyCap(
        ctx.userFingerprint,
        campaign.id,
        campaign.maxImpressionsPerUser ?? 3
      );
      if (capped) continue;
    }

    // Find a listing to promote (for sponsored_listing type)
    let listingId: string | null = null;
    const campaignListings = campaign.listingIds as string[] | null;
    if (campaignListings && campaignListings.length > 0) {
      // Find first listing not already shown organically
      const excludeSet = new Set(ctx.excludeListingIds ?? []);
      const availableId = campaignListings.find((id) => !excludeSet.has(id));
      if (!availableId && campaign.type === "sponsored_listing") {
        continue; // All listings already shown organically
      }
      listingId = availableId ?? null;
    }

    results.push({
      campaign_id: campaign.id,
      listing_id: listingId,
      creative_url: campaign.creativeUrl,
      click_url: campaign.clickUrl,
      bid_type: campaign.bidType,
      campaign_name: campaign.name,
    });
  }

  return results;
}

/** Max sponsored slots per placement. */
function getMaxAdsForPlacement(
  placement: string,
  override?: number
): number {
  if (override) return Math.min(override, 5);
  const defaults: Record<string, number> = {
    search_top: 3,
    search_sidebar: 2,
    homepage_latest: 1,
    city_page: 2,
    detail_sidebar: 2,
    mobile_sticky: 1,
    hero_carousel: 1,
  };
  return defaults[placement] ?? 1;
}

/** Map ad placement to the campaign type that serves it. */
function placementToCampaignType(placement: string) {
  const mapping: Record<string, string> = {
    search_top: "sponsored_listing",
    search_sidebar: "sidebar",
    homepage_latest: "sponsored_listing",
    city_page: "sponsored_listing",
    detail_sidebar: "sidebar",
    mobile_sticky: "sponsored_listing",
    hero_carousel: "hero_carousel",
  };
  return mapping[placement] as
    | "sponsored_listing"
    | "banner"
    | "hero_carousel"
    | "city_takeover"
    | "sidebar"
    | undefined;
}
