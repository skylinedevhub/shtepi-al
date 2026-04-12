/**
 * Plan queries and Stripe sync.
 */

import { eq, and, asc } from "drizzle-orm";
import { getDb } from "@/lib/db/drizzle";
import { plans } from "@/lib/db/schema";
import { getStripeServer } from "./stripe";
import type { Plan, PlanFeatures } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dbRowToPlan(row: typeof plans.$inferSelect): Plan {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    price_eur: row.priceEur,
    billing_interval: row.billingInterval,
    features: row.features as PlanFeatures,
    is_active: row.isActive ?? true,
    sort_order: row.sortOrder ?? 0,
    stripe_price_id: row.stripePriceId,
    stripe_product_id: row.stripeProductId,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Get all active plans, optionally filtered by type. Sorted by sort_order.
 */
export async function getPlans(
  type?: "agency" | "buyer" | "data"
): Promise<Plan[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(plans.isActive, true)];
  if (type) {
    conditions.push(eq(plans.type, type));
  }

  const rows = await db
    .select()
    .from(plans)
    .where(and(...conditions))
    .orderBy(asc(plans.sortOrder));

  return rows.map(dbRowToPlan);
}

/**
 * Get a single plan by its slug.
 */
export async function getPlanBySlug(slug: string): Promise<Plan | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db.select().from(plans).where(eq(plans.slug, slug));
  return row ? dbRowToPlan(row) : null;
}

/**
 * Get a single plan by its id.
 */
export async function getPlanById(id: string): Promise<Plan | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db.select().from(plans).where(eq(plans.id, id));
  return row ? dbRowToPlan(row) : null;
}

// ---------------------------------------------------------------------------
// Stripe sync
// ---------------------------------------------------------------------------

/**
 * Create or update Stripe Products + Prices for every active plan, then
 * persist the stripe_product_id and stripe_price_id back to the database.
 *
 * Intended for admin / CLI use only — not called from user-facing routes.
 */
export async function syncPlansToStripe(): Promise<void> {
  const db = getDb();
  const stripe = getStripeServer();
  if (!db || !stripe) {
    throw new Error(
      "Stripe ose databaza nuk jane te konfiguruara per sinkronizim"
    );
  }

  const allPlans = await db
    .select()
    .from(plans)
    .where(eq(plans.isActive, true))
    .orderBy(asc(plans.sortOrder));

  for (const plan of allPlans) {
    // --- Product ---
    let productId = plan.stripeProductId;
    if (productId) {
      // Update existing product
      await stripe.products.update(productId, {
        name: plan.name,
        metadata: { plan_slug: plan.slug, plan_type: plan.type },
      });
    } else {
      // Create new product
      const product = await stripe.products.create({
        name: plan.name,
        metadata: { plan_slug: plan.slug, plan_type: plan.type },
      });
      productId = product.id;
    }

    // --- Price ---
    // Stripe prices are immutable. If the plan already has a price we keep it;
    // if the amount changed we create a new one and archive the old one.
    let priceId = plan.stripePriceId;

    if (priceId) {
      const existingPrice = await stripe.prices.retrieve(priceId);
      const amountMatches = existingPrice.unit_amount === plan.priceEur;
      const intervalMatches =
        existingPrice.recurring?.interval ===
        (plan.billingInterval === "yearly" ? "year" : "month");

      if (!amountMatches || !intervalMatches) {
        // Archive old price, create new one
        await stripe.prices.update(priceId, { active: false });
        priceId = null;
      }
    }

    if (!priceId) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plan.priceEur,
        currency: "eur",
        recurring: {
          interval: plan.billingInterval === "yearly" ? "year" : "month",
        },
        metadata: { plan_slug: plan.slug },
      });
      priceId = price.id;
    }

    // --- Persist IDs back to DB ---
    await db
      .update(plans)
      .set({
        stripeProductId: productId,
        stripePriceId: priceId,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, plan.id));
  }
}
