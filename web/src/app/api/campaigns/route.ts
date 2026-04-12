import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { getDb } from "@/lib/db/drizzle";
import { adCampaigns, profiles } from "@/lib/db/schema";
import { requirePlan } from "@/lib/billing/gating";

// 20 campaign creates per IP per hour
const campaignLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 60 * 1000,
});

const createCampaignSchema = z.object({
  name: z.string().min(1, "Emri i fushatës kërkohet").max(200),
  type: z.enum([
    "sponsored_listing",
    "banner",
    "hero_carousel",
    "city_takeover",
    "sidebar",
  ]),
  bid_type: z.enum(["cpm", "cpc", "cpl", "flat_monthly"]),
  bid_amount_eur: z
    .number()
    .positive("Shuma e ofertës duhet të jetë pozitive"),
  budget_eur: z
    .number()
    .min(50, "Buxheti minimal është 50 EUR"),
  target_cities: z.array(z.string()).min(1, "Zgjidhni të paktën një qytet"),
  start_date: z.string().refine((d) => !isNaN(Date.parse(d)), {
    message: "Data e fillimit nuk është e vlefshme",
  }),
  end_date: z.string().refine((d) => !isNaN(Date.parse(d)), {
    message: "Data e përfundimit nuk është e vlefshme",
  }),
  listing_ids: z.array(z.string()).optional(),
});

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Auth nuk disponohet." },
      { status: 503 }
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Pa autorizim." }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ campaigns: [] });
  }

  // Get user's agency
  const [profile] = await db
    .select({ agencyId: profiles.agencyId })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile?.agencyId) {
    return NextResponse.json({ campaigns: [] });
  }

  const rows = await db
    .select()
    .from(adCampaigns)
    .where(eq(adCampaigns.agencyId, profile.agencyId))
    .orderBy(desc(adCampaigns.createdAt));

  const campaigns = rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    bid_type: r.bidType,
    bid_amount_eur: r.bidAmountEur,
    budget_eur: r.budgetEur,
    spent_eur: r.spentEur,
    target_cities: r.targetCities,
    start_date: r.startDate.toISOString(),
    end_date: r.endDate.toISOString(),
    status: r.status,
    listing_ids: r.listingIds,
    created_at: r.createdAt?.toISOString() ?? null,
  }));

  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request.headers);
  const { success } = campaignLimiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Shumë kërkesa. Provoni përsëri më vonë." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Auth nuk disponohet." },
      { status: 503 }
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Pa autorizim." }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "Databaza nuk është e disponueshme" },
      { status: 503 }
    );
  }

  // Get user's agency
  const [profile] = await db
    .select({ agencyId: profiles.agencyId })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile?.agencyId) {
    return NextResponse.json(
      { error: "Duhet të jeni pjesë e një agjencie." },
      { status: 403 }
    );
  }

  // Require Growth+ plan
  try {
    await requirePlan("growth", profile.agencyId);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json(
      { error: e.message ?? "Plan i pamjaftueshëm." },
      { status: e.status ?? 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Kërkesë e pavlefshme" },
      { status: 400 }
    );
  }

  const result = createCampaignSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = result.data;

  // Validate bid minimums
  if (data.bid_type === "cpm" && data.bid_amount_eur < 4) {
    return NextResponse.json(
      { error: "Oferta minimale CPM është 4 EUR." },
      { status: 400 }
    );
  }
  if (data.bid_type === "cpc" && data.bid_amount_eur < 0.2) {
    return NextResponse.json(
      { error: "Oferta minimale CPC është 0.20 EUR." },
      { status: 400 }
    );
  }

  // Validate date range
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  if (endDate <= startDate) {
    return NextResponse.json(
      { error: "Data e përfundimit duhet të jetë pas datës së fillimit." },
      { status: 400 }
    );
  }

  const [campaign] = await db
    .insert(adCampaigns)
    .values({
      agencyId: profile.agencyId,
      name: data.name,
      type: data.type,
      bidType: data.bid_type,
      bidAmountEur: Math.round(data.bid_amount_eur * 100), // store cents
      budgetEur: Math.round(data.budget_eur * 100), // store cents
      targetCities: data.target_cities,
      startDate,
      endDate,
      status: "draft",
      listingIds: data.listing_ids ?? [],
    })
    .returning();

  return NextResponse.json(
    {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
    },
    { status: 201 }
  );
}
