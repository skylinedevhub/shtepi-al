import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/drizzle";
import { adCampaigns, adImpressions, adClicks, profiles } from "@/lib/db/schema";
import { validateCsrf } from "@/lib/csrf";

interface RouteContext {
  params: { id: string };
}

/** Verify user owns the campaign's agency. Returns agencyId or error response. */
async function verifyOwnership(userId: string, campaignId: string) {
  const db = getDb();
  if (!db) {
    return {
      error: NextResponse.json(
        { error: "Databaza nuk është e disponueshme" },
        { status: 503 }
      ),
    };
  }

  const [profile] = await db
    .select({ agencyId: profiles.agencyId })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);

  if (!profile?.agencyId) {
    return {
      error: NextResponse.json(
        { error: "Nuk jeni pjesë e një agjencie." },
        { status: 403 }
      ),
    };
  }

  const [campaign] = await db
    .select()
    .from(adCampaigns)
    .where(
      and(
        eq(adCampaigns.id, campaignId),
        eq(adCampaigns.agencyId, profile.agencyId)
      )
    )
    .limit(1);

  if (!campaign) {
    return {
      error: NextResponse.json(
        { error: "Fushata nuk u gjet." },
        { status: 404 }
      ),
    };
  }

  return { campaign, db };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
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

  const result = await verifyOwnership(user.id, params.id);
  if ("error" in result) return result.error;

  const { campaign, db } = result;

  // Get basic stats
  const [impressionCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(adImpressions)
    .where(eq(adImpressions.campaignId, campaign.id));

  const [clickCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(adClicks)
    .where(eq(adClicks.campaignId, campaign.id));

  return NextResponse.json({
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    bid_type: campaign.bidType,
    bid_amount_eur: campaign.bidAmountEur,
    budget_eur: campaign.budgetEur,
    spent_eur: campaign.spentEur,
    target_cities: campaign.targetCities,
    start_date: campaign.startDate.toISOString(),
    end_date: campaign.endDate.toISOString(),
    status: campaign.status,
    listing_ids: campaign.listingIds,
    created_at: campaign.createdAt?.toISOString() ?? null,
    stats: {
      impressions: Number(impressionCount.count),
      clicks: Number(clickCount.count),
    },
  });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

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

  const result = await verifyOwnership(user.id, params.id);
  if ("error" in result) return result.error;

  const { campaign, db } = result;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Kërkesë e pavlefshme" },
      { status: 400 }
    );
  }

  const { status, budget_eur, start_date, end_date } = body as {
    status?: string;
    budget_eur?: number;
    start_date?: string;
    end_date?: string;
  };

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  // Status transitions: pause/resume
  if (status) {
    if (status === "paused" && campaign.status === "active") {
      updateValues.status = "paused";
    } else if (status === "active" && campaign.status === "paused") {
      updateValues.status = "active";
    } else if (status === "active" && campaign.status === "draft") {
      updateValues.status = "active";
    } else {
      return NextResponse.json(
        { error: `Nuk mund të kaloni nga "${campaign.status}" në "${status}".` },
        { status: 400 }
      );
    }
  }

  if (budget_eur !== undefined) {
    if (budget_eur < 50) {
      return NextResponse.json(
        { error: "Buxheti minimal është 50 EUR." },
        { status: 400 }
      );
    }
    updateValues.budgetEur = Math.round(budget_eur * 100);
  }

  if (start_date) {
    const d = new Date(start_date);
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "Data e fillimit nuk është e vlefshme." },
        { status: 400 }
      );
    }
    updateValues.startDate = d;
  }

  if (end_date) {
    const d = new Date(end_date);
    if (isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "Data e përfundimit nuk është e vlefshme." },
        { status: 400 }
      );
    }
    updateValues.endDate = d;
  }

  await db
    .update(adCampaigns)
    .set(updateValues)
    .where(eq(adCampaigns.id, params.id));

  return NextResponse.json({
    message: "Fushata u përditësua me sukses.",
    status: updateValues.status ?? campaign.status,
  });
}
