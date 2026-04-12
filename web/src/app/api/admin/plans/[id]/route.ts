import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
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

const planUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  priceEur: z.number().int().min(0).optional(),
  billingInterval: z.enum(["monthly", "yearly"]).optional(),
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
  }).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshem" }, { status: 400 });
  }

  const parsed = planUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Te dhena te pavlefshme", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Check plan exists
  const existing = await db
    .select({ id: plans.id, isActive: plans.isActive })
    .from(plans)
    .where(eq(plans.id, id))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json({ error: "Plani nuk u gjet" }, { status: 404 });
  }

  // If deactivating, check for active subscribers
  if (parsed.data.isActive === false && existing[0].isActive === true) {
    const activeSubscribers = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.planId, id),
          eq(subscriptions.status, "active")
        )
      );

    if (activeSubscribers[0]?.count > 0) {
      return NextResponse.json(
        {
          error: `Nuk mund te c'aktivizohet plani me ${activeSubscribers[0].count} abonente aktive`,
        },
        { status: 409 }
      );
    }
  }

  // Build update object
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.priceEur !== undefined) updateData.priceEur = parsed.data.priceEur;
  if (parsed.data.billingInterval !== undefined) updateData.billingInterval = parsed.data.billingInterval;
  if (parsed.data.features !== undefined) updateData.features = parsed.data.features;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;
  if (parsed.data.sortOrder !== undefined) updateData.sortOrder = parsed.data.sortOrder;

  const [updated] = await db
    .update(plans)
    .set(updateData)
    .where(eq(plans.id, id))
    .returning();

  return NextResponse.json({ plan: updated });
}
