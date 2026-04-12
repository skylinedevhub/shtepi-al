import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/drizzle";
import { getStripeServer } from "@/lib/billing/stripe";
import {
  subscriptions,
  invoices,
  agencies,
  profiles,
  plans,
  leadCredits,
} from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status });
}

/** Map Stripe subscription status string to our enum values. */
function mapStatus(
  stripeStatus: string
): "trialing" | "active" | "past_due" | "canceled" | "incomplete" {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
      return "canceled";
    default:
      return "incomplete";
  }
}

/**
 * Extract period dates from a Stripe subscription.
 * In Stripe API v2026-03-25 (dahlia), current_period_start/end moved from
 * the Subscription object to individual SubscriptionItem objects.
 */
function getSubscriptionPeriod(sub: Stripe.Subscription): {
  periodStart: Date | null;
  periodEnd: Date | null;
} {
  const firstItem = sub.items.data[0];
  if (!firstItem) {
    return { periodStart: null, periodEnd: null };
  }
  return {
    periodStart: new Date(firstItem.current_period_start * 1000),
    periodEnd: new Date(firstItem.current_period_end * 1000),
  };
}

/**
 * Extract the subscription ID from a Stripe Invoice.
 * In Stripe API v2026-03-25 (dahlia), invoice.subscription was replaced by
 * invoice.parent.subscription_details.subscription.
 */
function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | null {
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails) return null;
  const sub = subDetails.subscription;
  if (typeof sub === "string") return sub;
  return sub?.id ?? null;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!stripeSubscriptionId || !stripeCustomerId) {
    console.error(
      "[stripe-webhook] checkout.session.completed missing subscription or customer",
      { sessionId: session.id }
    );
    return;
  }

  const planSlug = session.metadata?.planSlug;
  const agencyId = session.metadata?.agencyId;
  const userId = session.metadata?.userId;

  if (!planSlug || !userId) {
    console.error(
      "[stripe-webhook] checkout.session.completed missing metadata (planSlug, userId)",
      { sessionId: session.id }
    );
    return;
  }

  // Look up the plan by slug
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, planSlug))
    .limit(1);

  if (!plan) {
    console.error("[stripe-webhook] plan not found for slug:", planSlug);
    return;
  }

  const now = new Date();

  // Upsert subscription
  await db
    .insert(subscriptions)
    .values({
      userId,
      agencyId: agencyId || null,
      planId: plan.id,
      stripeSubscriptionId,
      stripeCustomerId,
      status: "active",
      currentPeriodStart: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        planId: plan.id,
        stripeCustomerId,
        status: "active",
        currentPeriodStart: now,
        updatedAt: now,
      },
    });

  // Update profile's stripe_customer_id
  await db
    .update(profiles)
    .set({ stripeCustomerId, updatedAt: now })
    .where(eq(profiles.id, userId));

  // Update agency if provided
  if (agencyId) {
    await db
      .update(agencies)
      .set({
        stripeCustomerId,
        planId: plan.id,
        subscriptionStatus: "active",
        updatedAt: now,
      })
      .where(eq(agencies.id, agencyId));
  }

  console.log("[stripe-webhook] checkout.session.completed processed", {
    sessionId: session.id,
    userId,
    agencyId,
    planSlug,
  });
}

async function handleSubscriptionCreated(
  sub: Stripe.Subscription
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const stripeSubscriptionId = sub.id;
  const stripeCustomerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  const status = mapStatus(sub.status);
  const now = new Date();
  const { periodStart, periodEnd } = getSubscriptionPeriod(sub);

  // We may not have full metadata here if the subscription was created
  // via checkout — in that case, checkout.session.completed handles the
  // initial insert. This upsert ensures we capture subscriptions created
  // via other flows (API, dashboard, etc.).
  const planSlug = sub.metadata?.planSlug;
  const userId = sub.metadata?.userId;
  const agencyId = sub.metadata?.agencyId;

  if (!planSlug || !userId) {
    // If metadata is missing, the subscription was likely created via checkout
    // and we'll rely on checkout.session.completed to set everything up.
    // Just update if a record already exists.
    const existing = await db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(subscriptions)
        .set({
          status,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    }

    console.log(
      "[stripe-webhook] subscription.created — updated existing record",
      { stripeSubscriptionId }
    );
    return;
  }

  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.slug, planSlug))
    .limit(1);

  if (!plan) {
    console.error(
      "[stripe-webhook] subscription.created — plan not found:",
      planSlug
    );
    return;
  }

  await db
    .insert(subscriptions)
    .values({
      userId,
      agencyId: agencyId || null,
      planId: plan.id,
      stripeSubscriptionId,
      stripeCustomerId: stripeCustomerId || null,
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      },
    });

  console.log("[stripe-webhook] subscription.created processed", {
    stripeSubscriptionId,
  });
}

async function handleSubscriptionUpdated(
  sub: Stripe.Subscription
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const stripeSubscriptionId = sub.id;
  const status = mapStatus(sub.status);
  const now = new Date();
  const { periodStart, periodEnd } = getSubscriptionPeriod(sub);

  // Check if plan changed — look up by Stripe price ID on the first item
  const stripePriceId = sub.items.data[0]?.price?.id;
  let newPlanId: string | undefined;

  if (stripePriceId) {
    const [matchedPlan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.stripePriceId, stripePriceId))
      .limit(1);
    if (matchedPlan) {
      newPlanId = matchedPlan.id;
    }
  }

  // Update subscription record
  const updateData: Record<string, unknown> = {
    status,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
    updatedAt: now,
  };

  if (newPlanId) {
    updateData.planId = newPlanId;
  }

  await db
    .update(subscriptions)
    .set(updateData)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

  // Update agency subscription status
  const [existingSub] = await db
    .select({ agencyId: subscriptions.agencyId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (existingSub?.agencyId) {
    const agencyUpdate: Record<string, unknown> = {
      subscriptionStatus: status,
      updatedAt: now,
    };
    if (newPlanId) {
      agencyUpdate.planId = newPlanId;
    }
    await db
      .update(agencies)
      .set(agencyUpdate)
      .where(eq(agencies.id, existingSub.agencyId));
  }

  console.log("[stripe-webhook] subscription.updated processed", {
    stripeSubscriptionId,
    status,
    newPlanId: newPlanId || "unchanged",
  });
}

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const stripeSubscriptionId = sub.id;
  const now = new Date();

  // Get the subscription to find the agency
  const [existingSub] = await db
    .select({ agencyId: subscriptions.agencyId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  // Mark subscription as canceled
  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: now,
      updatedAt: now,
    })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

  // Clear agency plan and set status to canceled
  if (existingSub?.agencyId) {
    await db
      .update(agencies)
      .set({
        planId: null,
        subscriptionStatus: "canceled",
        updatedAt: now,
      })
      .where(eq(agencies.id, existingSub.agencyId));
  }

  console.log("[stripe-webhook] subscription.deleted processed", {
    stripeSubscriptionId,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const db = getDb();
  if (!db) return;

  const stripeInvoiceId = invoice.id;
  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);

  if (!stripeSubscriptionId) {
    console.warn(
      "[stripe-webhook] invoice.paid missing subscription ID, skipping",
      { invoiceId: stripeInvoiceId }
    );
    return;
  }

  // Find internal subscription record
  const [sub] = await db
    .select({
      id: subscriptions.id,
      agencyId: subscriptions.agencyId,
      planId: subscriptions.planId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (!sub) {
    console.warn(
      "[stripe-webhook] invoice.paid — no subscription record found for",
      stripeSubscriptionId
    );
    return;
  }

  const now = new Date();

  // Upsert invoice
  await db
    .insert(invoices)
    .values({
      subscriptionId: sub.id,
      stripeInvoiceId,
      amountEur: invoice.amount_paid ?? 0,
      status: "paid",
      pdfUrl: invoice.invoice_pdf || null,
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
      periodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : null,
      periodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : null,
      paidAt: now,
    })
    .onConflictDoUpdate({
      target: invoices.stripeInvoiceId,
      set: {
        amountEur: invoice.amount_paid ?? 0,
        status: "paid",
        pdfUrl: invoice.invoice_pdf || null,
        hostedInvoiceUrl: invoice.hosted_invoice_url || null,
        paidAt: now,
      },
    });

  // Reset lead credits for this billing period
  if (sub.agencyId) {
    // Look up the plan to get lead_limit_monthly
    const [plan] = await db
      .select({ features: plans.features })
      .from(plans)
      .where(eq(plans.id, sub.planId))
      .limit(1);

    const leadLimit =
      (plan?.features as { lead_limit_monthly?: number | null })
        ?.lead_limit_monthly ?? 0;

    if (leadLimit > 0) {
      const periodStart = invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : now;
      const periodEnd = invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(leadCredits).values({
        agencyId: sub.agencyId,
        planCredits: leadLimit,
        bonusCredits: 0,
        usedCredits: 0,
        periodStart,
        periodEnd,
      });
    }
  }

  console.log("[stripe-webhook] invoice.paid processed", {
    stripeInvoiceId,
    subscriptionId: sub.id,
  });
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const db = getDb();
  if (!db) return;

  const stripeInvoiceId = invoice.id;
  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);

  if (!stripeSubscriptionId) {
    console.warn(
      "[stripe-webhook] invoice.payment_failed missing subscription ID",
      { invoiceId: stripeInvoiceId }
    );
    return;
  }

  // Find internal subscription
  const [sub] = await db
    .select({
      id: subscriptions.id,
      agencyId: subscriptions.agencyId,
    })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);

  if (!sub) {
    console.warn(
      "[stripe-webhook] invoice.payment_failed — no subscription for",
      stripeSubscriptionId
    );
    return;
  }

  const now = new Date();

  // Upsert invoice with failed status
  await db
    .insert(invoices)
    .values({
      subscriptionId: sub.id,
      stripeInvoiceId,
      amountEur: invoice.amount_due ?? 0,
      status: "open",
      pdfUrl: invoice.invoice_pdf || null,
      hostedInvoiceUrl: invoice.hosted_invoice_url || null,
      periodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : null,
      periodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : null,
    })
    .onConflictDoUpdate({
      target: invoices.stripeInvoiceId,
      set: {
        amountEur: invoice.amount_due ?? 0,
        status: "open",
      },
    });

  // Set subscription to past_due
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: now })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));

  // Update agency status
  if (sub.agencyId) {
    await db
      .update(agencies)
      .set({ subscriptionStatus: "past_due", updatedAt: now })
      .where(eq(agencies.id, sub.agencyId));
  }

  console.log("[stripe-webhook] invoice.payment_failed processed", {
    stripeInvoiceId,
    subscriptionId: sub.id,
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const stripe = getStripeServer();
  if (!stripe) {
    console.error("[stripe-webhook] Stripe not configured (missing secret key)");
    return json(500, { error: "Stripe not configured" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error(
      "[stripe-webhook] STRIPE_WEBHOOK_SECRET not set"
    );
    return json(500, { error: "Webhook secret not configured" });
  }

  // Read raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return json(400, { error: "Missing stripe-signature header" });
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return json(400, { error: `Webhook signature verification failed: ${message}` });
  }

  console.log("[stripe-webhook] Received event:", event.type, event.id);

  // Process the event — always return 200 to Stripe, even on processing errors
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      default:
        console.log("[stripe-webhook] Unhandled event type:", event.type);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      "[stripe-webhook] Error processing event",
      event.type,
      event.id,
      message
    );
    // Still return 200 — we don't want Stripe to retry on our processing errors
  }

  return json(200, { received: true });
}
