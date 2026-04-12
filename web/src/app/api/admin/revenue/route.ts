import { NextResponse } from "next/server";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/db/queries";
import { getDb } from "@/lib/db/drizzle";
import {
  subscriptions,
  plans,
  agencies,
  invoices,
  adCampaigns,
  profiles,
} from "@/lib/db/schema";

async function verifyAdmin(): Promise<{ error?: NextResponse }> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const profile = await getUserProfile(user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {};
}

export async function GET() {
  const { error: authError } = await verifyAdmin();
  if (authError) return authError;

  const db = getDb();
  if (!db) {
    return NextResponse.json({
      mrr: 0,
      mrr_growth: 0,
      active_subscriptions: 0,
      churn_rate: 0,
      arpa: 0,
      ltv: 0,
      revenue_by_source: {
        agency_subscriptions: 0,
        ads: 0,
        buyer_plus: 0,
        data: 0,
      },
      top_agencies: [],
      recent_invoices: [],
    });
  }

  // --- MRR: sum of active subscription plan prices (cents) ---
  const [mrrResult] = await db
    .select({
      mrr: sql<number>`coalesce(sum(${plans.priceEur}), 0)::int`,
      activeCount: sql<number>`count(*)::int`,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.status, "active"));

  const mrrCents = mrrResult?.mrr ?? 0;
  const mrr = Math.round(mrrCents / 100);
  const activeSubscriptions = mrrResult?.activeCount ?? 0;

  // --- Churn rate: canceled this month / total at start of month * 100 ---
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [churnResult] = await db
    .select({
      canceledThisMonth: sql<number>`count(*) filter (where ${subscriptions.canceledAt} >= ${monthStart.toISOString()})::int`,
      totalAtStart: sql<number>`count(*) filter (where ${subscriptions.createdAt} < ${monthStart.toISOString()} and (${subscriptions.status} = 'active' or (${subscriptions.status} = 'canceled' and ${subscriptions.canceledAt} >= ${monthStart.toISOString()})))::int`,
    })
    .from(subscriptions);

  const canceledThisMonth = churnResult?.canceledThisMonth ?? 0;
  const totalAtStart = churnResult?.totalAtStart ?? 0;
  const churnRate =
    totalAtStart > 0
      ? Math.round((canceledThisMonth / totalAtStart) * 1000) / 10
      : 0;

  // --- ARPA: MRR / active subscriptions ---
  const arpa =
    activeSubscriptions > 0 ? Math.round(mrr / activeSubscriptions) : 0;

  // --- LTV: ARPA / (churn_rate / 100), or ARPA * 20 if churn is 0 ---
  const ltv =
    churnRate > 0
      ? Math.round(arpa / (churnRate / 100))
      : arpa * 20;

  // --- MRR Growth: compare to last month's MRR ---
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [lastMonthMrrResult] = await db
    .select({
      mrr: sql<number>`coalesce(sum(${plans.priceEur}), 0)::int`,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.status, "active"),
        sql`${subscriptions.createdAt} < ${monthStart.toISOString()}`
      )
    );

  const lastMonthMrr = Math.round((lastMonthMrrResult?.mrr ?? 0) / 100);
  const mrrGrowth =
    lastMonthMrr > 0
      ? Math.round(((mrr - lastMonthMrr) / lastMonthMrr) * 1000) / 10
      : mrr > 0
        ? 100
        : 0;

  // --- Revenue by source: group subscriptions by plan type ---
  const revenueByType = await db
    .select({
      type: plans.type,
      total: sql<number>`coalesce(sum(${plans.priceEur}), 0)::int`,
    })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.status, "active"))
    .groupBy(plans.type);

  // Ad revenue from active campaigns
  const [adRevenue] = await db
    .select({
      total: sql<number>`coalesce(sum(${adCampaigns.spentEur}), 0)::int`,
    })
    .from(adCampaigns)
    .where(eq(adCampaigns.status, "active"));

  const revenueBySource = {
    agency_subscriptions: 0,
    ads: Math.round((adRevenue?.total ?? 0) / 100),
    buyer_plus: 0,
    data: 0,
  };

  for (const row of revenueByType) {
    const amountEur = Math.round((row.total ?? 0) / 100);
    if (row.type === "agency") {
      revenueBySource.agency_subscriptions = amountEur;
    } else if (row.type === "buyer") {
      revenueBySource.buyer_plus = amountEur;
    } else if (row.type === "data") {
      revenueBySource.data = amountEur;
    }
  }

  // --- Top agencies: join subscriptions + plans + agencies ---
  const topAgencies = await db
    .select({
      name: agencies.name,
      plan: plans.name,
      mrr: sql<number>`(${plans.priceEur})::int`,
      status: subscriptions.status,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .innerJoin(agencies, eq(subscriptions.agencyId, agencies.id))
    .where(eq(subscriptions.status, "active"))
    .orderBy(desc(plans.priceEur))
    .limit(10);

  const topAgenciesFormatted = topAgencies.map((a) => ({
    name: a.name,
    plan: a.plan,
    mrr: Math.round((a.mrr ?? 0) / 100),
    status: a.status,
  }));

  // --- Recent invoices with subscription/agency/user info ---
  const recentInvoices = await db
    .select({
      id: invoices.id,
      amountEur: invoices.amountEur,
      status: invoices.status,
      createdAt: invoices.createdAt,
      paidAt: invoices.paidAt,
      agencyName: agencies.name,
      userName: profiles.name,
      userEmail: profiles.email,
    })
    .from(invoices)
    .innerJoin(subscriptions, eq(invoices.subscriptionId, subscriptions.id))
    .leftJoin(agencies, eq(subscriptions.agencyId, agencies.id))
    .leftJoin(profiles, eq(subscriptions.userId, profiles.id))
    .orderBy(desc(invoices.createdAt))
    .limit(20);

  const recentInvoicesFormatted = recentInvoices.map((inv) => ({
    id: inv.id,
    amount_eur: Math.round((inv.amountEur ?? 0) / 100),
    status: inv.status,
    created_at: inv.createdAt?.toISOString() ?? null,
    paid_at: inv.paidAt?.toISOString() ?? null,
    agency_name: inv.agencyName ?? null,
    user_name: inv.userName ?? inv.userEmail ?? null,
  }));

  return NextResponse.json({
    mrr,
    mrr_growth: mrrGrowth,
    active_subscriptions: activeSubscriptions,
    churn_rate: churnRate,
    arpa,
    ltv,
    revenue_by_source: revenueBySource,
    top_agencies: topAgenciesFormatted,
    recent_invoices: recentInvoicesFormatted,
  });
}
