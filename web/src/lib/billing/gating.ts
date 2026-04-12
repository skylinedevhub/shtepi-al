import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db/drizzle";
import {
  subscriptions,
  plans,
  agencies,
  listings,
  leadCredits,
} from "../db/schema";
import type { PlanFeatures } from "../db/schema";

// --- Free tier defaults (no subscription) ---
const FREE_TIER: PlanFeatures = {
  listing_limit: 5,
  lead_limit_monthly: 5,
  featured_cities: 0,
  has_crm_export: false,
  has_whatsapp_routing: false,
  has_api_access: false,
  has_analytics_advanced: false,
  team_seats: 1,
  ranking_boost: 0,
};

// --- In-memory cache (5 min TTL) ---
const planCache = new Map<
  string,
  { features: PlanFeatures; planName: string; planSlug: string; expiry: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Clear cached limits for an agency (call on subscription changes). */
export function invalidatePlanCache(agencyId: string) {
  planCache.delete(`agency:${agencyId}`);
}

/** Clear cached limits for a user (call on subscription changes). */
export function invalidateUserPlanCache(userId: string) {
  planCache.delete(`user:${userId}`);
}

/** Get the effective plan features for an agency. */
export async function getAgencyPlanLimits(agencyId: string): Promise<{
  features: PlanFeatures;
  planName: string;
  planSlug: string;
}> {
  const cacheKey = `agency:${agencyId}`;
  const cached = planCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached;
  }

  const db = getDb();
  if (!db) {
    return { features: FREE_TIER, planName: "Free", planSlug: "free" };
  }

  const rows = await db
    .select({
      features: plans.features,
      planName: plans.name,
      planSlug: plans.slug,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.agencyId, agencyId),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1);

  const result =
    rows.length > 0
      ? {
          features: rows[0].features as PlanFeatures,
          planName: rows[0].planName,
          planSlug: rows[0].planSlug,
        }
      : { features: FREE_TIER, planName: "Free", planSlug: "free" };

  planCache.set(cacheKey, { ...result, expiry: Date.now() + CACHE_TTL_MS });
  return result;
}

/** Get the effective plan features for a user (buyer plan). */
export async function getUserPlanLimits(userId: string): Promise<{
  features: PlanFeatures;
  planName: string;
  planSlug: string;
}> {
  const cacheKey = `user:${userId}`;
  const cached = planCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached;
  }

  const db = getDb();
  if (!db) {
    return { features: FREE_TIER, planName: "Free", planSlug: "free" };
  }

  const rows = await db
    .select({
      features: plans.features,
      planName: plans.name,
      planSlug: plans.slug,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1);

  const result =
    rows.length > 0
      ? {
          features: rows[0].features as PlanFeatures,
          planName: rows[0].planName,
          planSlug: rows[0].planSlug,
        }
      : { features: FREE_TIER, planName: "Free", planSlug: "free" };

  planCache.set(cacheKey, { ...result, expiry: Date.now() + CACHE_TTL_MS });
  return result;
}

// --- Limit checking ---

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  message?: string;
}

/** Check listing count against plan limit. */
export async function checkListingLimit(
  agencyId: string
): Promise<LimitCheckResult> {
  const { features } = await getAgencyPlanLimits(agencyId);

  if (features.listing_limit === null) {
    return { allowed: true, current: 0, limit: null };
  }

  const db = getDb();
  if (!db) {
    return { allowed: true, current: 0, limit: features.listing_limit };
  }

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listings)
    .where(
      and(
        eq(listings.posterType, "agency"),
        eq(listings.isActive, true),
        sql`${listings.posterName} = (SELECT name FROM ${agencies} WHERE id = ${agencyId})`
      )
    );

  const current = Number(result.count);
  const allowed = current < features.listing_limit;

  return {
    allowed,
    current,
    limit: features.listing_limit,
    message: allowed
      ? undefined
      : `Keni arritur limitin e njoftimeve (${current}/${features.listing_limit}). Përmirësoni planin tuaj.`,
  };
}

/** Check lead credits for the current period. */
export async function checkLeadLimit(
  agencyId: string
): Promise<LimitCheckResult> {
  const { features } = await getAgencyPlanLimits(agencyId);

  if (features.lead_limit_monthly === null) {
    return { allowed: true, current: 0, limit: null };
  }

  const db = getDb();
  if (!db) {
    return { allowed: true, current: 0, limit: features.lead_limit_monthly };
  }

  const now = new Date();
  const rows = await db
    .select({
      planCredits: leadCredits.planCredits,
      bonusCredits: leadCredits.bonusCredits,
      usedCredits: leadCredits.usedCredits,
    })
    .from(leadCredits)
    .where(
      and(
        eq(leadCredits.agencyId, agencyId),
        sql`${leadCredits.periodEnd} > ${now.toISOString()}`
      )
    )
    .orderBy(sql`${leadCredits.periodEnd} DESC`)
    .limit(1);

  if (rows.length === 0) {
    // No credit record yet — use plan default
    return {
      allowed: true,
      current: 0,
      limit: features.lead_limit_monthly,
    };
  }

  const { planCredits: pc, bonusCredits: bc, usedCredits: uc } = rows[0];
  const totalCredits = (pc ?? 0) + (bc ?? 0);
  const used = uc ?? 0;
  const allowed = used < totalCredits;

  return {
    allowed,
    current: used,
    limit: totalCredits,
    message: allowed
      ? undefined
      : "Keni arritur limitin e leads për këtë muaj.",
  };
}

/** Deduct one lead credit. Returns true if successful. */
export async function deductLeadCredit(agencyId: string): Promise<boolean> {
  const check = await checkLeadLimit(agencyId);
  if (!check.allowed) return false;

  const db = getDb();
  if (!db) return true;

  const now = new Date();
  await db
    .update(leadCredits)
    .set({ usedCredits: sql`used_credits + 1` })
    .where(
      and(
        eq(leadCredits.agencyId, agencyId),
        sql`${leadCredits.periodEnd} > ${now.toISOString()}`
      )
    );

  return true;
}

/** Require a minimum plan tier. Throws an object with status + message on failure. */
export async function requirePlan(
  minPlanSlug: "starter" | "growth" | "premium",
  agencyId: string
): Promise<void> {
  const planOrder = ["free", "starter", "growth", "premium", "enterprise"];
  const { planSlug } = await getAgencyPlanLimits(agencyId);

  const currentIdx = planOrder.indexOf(planSlug);
  const requiredIdx = planOrder.indexOf(minPlanSlug);

  if (currentIdx < requiredIdx) {
    const planNames: Record<string, string> = {
      starter: "Starter",
      growth: "Growth",
      premium: "Premium",
    };
    throw {
      status: 403,
      message: `Kjo veçori kërkon planin ${planNames[minPlanSlug]} ose më lart.`,
    };
  }
}

export { FREE_TIER };
