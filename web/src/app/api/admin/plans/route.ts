import { NextRequest, NextResponse } from "next/server";
import { eq, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/db/queries";
import { getDb } from "@/lib/db/drizzle";
import { plans, subscriptions } from "@/lib/db/schema";
import { validateCsrf } from "@/lib/csrf";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const limiter = createRateLimiter({ limit: 30, windowMs: 3600_000 });

async function verifyAdmin(): Promise<{ error?: NextResponse }> {
  const supabase = await createClient();
  if (!supabase) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const profile = await getUserProfile(user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {};
}

export async function GET() {
  const { error: authError } = await verifyAdmin();
  if (authError) return authError;

  const db = getDb();
  if (!db) {
    return NextResponse.json({ plans: [] });
  }

  // Get all plans with subscriber counts
  const allPlans = await db
    .select({
      id: plans.id,
      name: plans.name,
      slug: plans.slug,
      type: plans.type,
      priceEur: plans.priceEur,
      billingInterval: plans.billingInterval,
      features: plans.features,
      isActive: plans.isActive,
      sortOrder: plans.sortOrder,
      stripePriceId: plans.stripePriceId,
      stripeProductId: plans.stripeProductId,
      createdAt: plans.createdAt,
      updatedAt: plans.updatedAt,
      subscriberCount: sql<number>`count(${subscriptions.id})::int`.as("subscriber_count"),
    })
    .from(plans)
    .leftJoin(
      subscriptions,
      sql`${subscriptions.planId} = ${plans.id} AND ${subscriptions.status} = 'active'`
    )
    .groupBy(plans.id)
    .orderBy(asc(plans.sortOrder), asc(plans.createdAt));

  return NextResponse.json({ plans: allPlans });
}

const planCreateSchema = z.object({
  name: z.string().min(1, "Emri i planit eshte i detyrueshem").max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, "Slug duhet te permbaje vetem shkronja, numra dhe vija"),
  type: z.enum(["agency", "buyer", "data"]),
  priceEur: z.number().int().min(0, "Cmimi duhet te jete pozitiv"),
  billingInterval: z.enum(["monthly", "yearly"]).default("monthly"),
  features: z.object({
    listing_limit: z.number().nullable(),
    lead_limit_monthly: z.number().nullable(),
    featured_cities: z.number().nullable(),
    has_crm_export: z.boolean(),
    has_whatsapp_routing: z.boolean(),
    has_api_access: z.boolean(),
    has_analytics_advanced: z.boolean(),
    team_seats: z.number().int().min(1),
    ranking_boost: z.number().int().min(0).max(3),
  }),
  sortOrder: z.number().int().default(0),
});

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { error: authError } = await verifyAdmin();
  if (authError) return authError;

  const ip = getClientIp(request.headers);
  const { success } = limiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Keni bere shume kerkesa. Provoni me vone." },
      { status: 429 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "Databaza nuk eshte e disponueshme" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshem" }, { status: 400 });
  }

  const parsed = planCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Te dhena te pavlefshme", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Check for duplicate slug
  const existing = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.slug, parsed.data.slug))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Nje plan me kete slug ekziston tashme" },
      { status: 409 }
    );
  }

  const [newPlan] = await db
    .insert(plans)
    .values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      type: parsed.data.type,
      priceEur: parsed.data.priceEur,
      billingInterval: parsed.data.billingInterval,
      features: parsed.data.features,
      sortOrder: parsed.data.sortOrder,
      isActive: true,
    })
    .returning();

  return NextResponse.json({ plan: newPlan }, { status: 201 });
}
