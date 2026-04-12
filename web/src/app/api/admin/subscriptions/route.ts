import { NextRequest, NextResponse } from "next/server";
import { eq, sql, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/db/queries";
import { getDb } from "@/lib/db/drizzle";
import { subscriptions, plans, agencies } from "@/lib/db/schema";
import { parseNumericParam } from "@/lib/parse-numeric";

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

const VALID_STATUSES = ["trialing", "active", "past_due", "canceled", "incomplete"] as const;

export async function GET(request: NextRequest) {
  const { error: authError } = await verifyAdmin();
  if (authError) return authError;

  const db = getDb();
  if (!db) {
    return NextResponse.json({
      subscriptions: [],
      total: 0,
      stats: { activeCount: 0, mrr: 0, planBreakdown: [] },
    });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status");
  const page = Math.max(1, parseNumericParam(searchParams.get("page")) ?? 1);
  const limit = Math.min(50, Math.max(1, parseNumericParam(searchParams.get("limit")) ?? 20));
  const offset = (page - 1) * limit;

  // Build WHERE clause
  const whereConditions = [];
  if (statusFilter && VALID_STATUSES.includes(statusFilter as typeof VALID_STATUSES[number])) {
    whereConditions.push(eq(subscriptions.status, statusFilter as typeof VALID_STATUSES[number]));
  }

  const whereClause = whereConditions.length > 0 ? whereConditions[0] : undefined;

  // Get subscriptions with plan and agency info
  const rows = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      agencyId: subscriptions.agencyId,
      planId: subscriptions.planId,
      status: subscriptions.status,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      canceledAt: subscriptions.canceledAt,
      createdAt: subscriptions.createdAt,
      planName: plans.name,
      planPriceEur: plans.priceEur,
      planType: plans.type,
      agencyName: agencies.name,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .leftJoin(agencies, eq(subscriptions.agencyId, agencies.id))
    .where(whereClause)
    .orderBy(desc(subscriptions.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(whereClause);

  // Get aggregate stats: active count, MRR, plan breakdown
  const [activeStats] = await db
    .select({
      activeCount: sql<number>`count(*)::int`,
      mrr: sql<number>`coalesce(sum(${plans.priceEur}), 0)::int`,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.status, "active"));

  const planBreakdown = await db
    .select({
      planId: plans.id,
      planName: plans.name,
      count: sql<number>`count(*)::int`,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.status, "active"))
    .groupBy(plans.id, plans.name);

  return NextResponse.json({
    subscriptions: rows,
    total: countResult?.count ?? 0,
    page,
    limit,
    stats: {
      activeCount: activeStats?.activeCount ?? 0,
      mrr: activeStats?.mrr ?? 0,
      planBreakdown,
    },
  });
}
