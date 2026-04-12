/**
 * Subscription lifecycle — checkout, portal, cancel, usage.
 */

import { eq, and, count, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/drizzle";
import {
  subscriptions,
  plans,
  profiles,
  agencies,
  listings,
  leadCredits,
} from "@/lib/db/schema";
import { getStripeServer } from "./stripe";
import { getPlanBySlug } from "./plans";
import type { SubscriptionWithPlan, UsageSummary, Plan, PlanFeatures } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toSubscriptionWithPlan(
  sub: typeof subscriptions.$inferSelect,
  plan: typeof plans.$inferSelect
): SubscriptionWithPlan {
  return {
    id: sub.id,
    user_id: sub.userId,
    agency_id: sub.agencyId,
    plan_id: sub.planId,
    stripe_subscription_id: sub.stripeSubscriptionId,
    stripe_customer_id: sub.stripeCustomerId,
    status: sub.status,
    current_period_start: sub.currentPeriodStart?.toISOString() ?? null,
    current_period_end: sub.currentPeriodEnd?.toISOString() ?? null,
    canceled_at: sub.canceledAt?.toISOString() ?? null,
    created_at: sub.createdAt?.toISOString() ?? "",
    plan: {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      type: plan.type,
      price_eur: plan.priceEur,
      billing_interval: plan.billingInterval,
      features: plan.features as PlanFeatures,
      is_active: plan.isActive ?? true,
      sort_order: plan.sortOrder ?? 0,
      stripe_price_id: plan.stripePriceId,
      stripe_product_id: plan.stripeProductId,
    },
  };
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

/**
 * Create a Stripe Checkout Session for a subscription.
 * Returns the checkout URL or null if Stripe/DB is unavailable.
 */
export async function createCheckoutSession(
  userId: string,
  planSlug: string,
  agencyId?: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<string | null> {
  const db = getDb();
  const stripe = getStripeServer();
  if (!db || !stripe) return null;

  // Look up the plan
  const plan = await getPlanBySlug(planSlug);
  if (!plan || !plan.stripe_price_id) {
    throw new Error("Plani nuk u gjet ose nuk eshte i konfiguruar ne Stripe");
  }

  // Look up or create Stripe customer
  const [profile] = await db
    .select({ id: profiles.id, email: profiles.email, stripeCustomerId: profiles.stripeCustomerId })
    .from(profiles)
    .where(eq(profiles.id, userId));

  if (!profile) {
    throw new Error("Perdoruesi nuk u gjet");
  }

  let stripeCustomerId = profile.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: profile.email ?? undefined,
      metadata: { user_id: userId },
    });
    stripeCustomerId = customer.id;

    await db
      .update(profiles)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(profiles.id, userId));
  }

  // If agency subscription, also store customer on agency
  if (agencyId) {
    const [agency] = await db
      .select({ id: agencies.id, stripeCustomerId: agencies.stripeCustomerId })
      .from(agencies)
      .where(eq(agencies.id, agencyId));

    if (agency && !agency.stripeCustomerId) {
      await db
        .update(agencies)
        .set({ stripeCustomerId, updatedAt: new Date() })
        .where(eq(agencies.id, agencyId));
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shtepi.al";
  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: successUrl || `${baseUrl}/dashboard/billing?success=true`,
    cancel_url: cancelUrl || `${baseUrl}/dashboard/billing?canceled=true`,
    subscription_data: {
      metadata: {
        user_id: userId,
        plan_slug: planSlug,
        ...(agencyId ? { agency_id: agencyId } : {}),
      },
    },
    metadata: {
      user_id: userId,
      plan_slug: planSlug,
      ...(agencyId ? { agency_id: agencyId } : {}),
    },
  });

  return session.url;
}

// ---------------------------------------------------------------------------
// Customer Portal
// ---------------------------------------------------------------------------

/**
 * Create a Stripe Customer Portal session.
 * Returns the portal URL or null.
 */
export async function createCustomerPortalSession(
  stripeCustomerId: string,
  returnUrl?: string
): Promise<string | null> {
  const stripe = getStripeServer();
  if (!stripe) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://shtepi.al";
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl || `${baseUrl}/dashboard/billing`,
  });

  return session.url;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get the active subscription (with plan details) for a user.
 */
export async function getSubscription(
  userId: string
): Promise<SubscriptionWithPlan | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({
      subscription: subscriptions,
      plan: plans,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.userId, userId),
        sql`${subscriptions.status} IN ('active', 'trialing', 'past_due')`
      )
    )
    .limit(1);

  if (rows.length === 0) return null;
  return toSubscriptionWithPlan(rows[0].subscription, rows[0].plan);
}

/**
 * Get the active subscription for an agency.
 */
export async function getAgencySubscription(
  agencyId: string
): Promise<SubscriptionWithPlan | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({
      subscription: subscriptions,
      plan: plans,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.agencyId, agencyId),
        sql`${subscriptions.status} IN ('active', 'trialing', 'past_due')`
      )
    )
    .limit(1);

  if (rows.length === 0) return null;
  return toSubscriptionWithPlan(rows[0].subscription, rows[0].plan);
}

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

/**
 * Cancel a subscription at the end of the current billing period.
 */
export async function cancelSubscription(subscriptionId: string): Promise<boolean> {
  const db = getDb();
  const stripe = getStripeServer();
  if (!db || !stripe) return false;

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId));

  if (!sub || !sub.stripeSubscriptionId) return false;

  // Cancel at period end (not immediately)
  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await db
    .update(subscriptions)
    .set({ canceledAt: new Date(), updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId));

  return true;
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

/**
 * Compute usage for an agency against their plan limits.
 */
export async function getUsage(agencyId: string): Promise<UsageSummary | null> {
  const db = getDb();
  if (!db) return null;

  // Get the agency's active subscription + plan
  const sub = await getAgencySubscription(agencyId);
  if (!sub) return null;

  const features = sub.plan.features;

  // Count active listings owned by agency members
  const [listingCount] = await db
    .select({ count: count() })
    .from(listings)
    .innerJoin(profiles, eq(listings.userId, profiles.id))
    .where(
      and(eq(profiles.agencyId, agencyId), eq(listings.isActive, true))
    );

  // Count used lead credits for current period
  const now = new Date();
  const [credits] = await db
    .select({
      used: sql<number>`COALESCE(SUM(${leadCredits.usedCredits}), 0)`,
    })
    .from(leadCredits)
    .where(
      and(
        eq(leadCredits.agencyId, agencyId),
        sql`${leadCredits.periodEnd} >= ${now}`
      )
    );

  return {
    listings_used: listingCount?.count ?? 0,
    listings_limit: features.listing_limit,
    leads_used: Number(credits?.used ?? 0),
    leads_limit: features.lead_limit_monthly,
    plan_name: sub.plan.name,
    plan_slug: sub.plan.slug,
  };
}
