import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { getDb } from "@/lib/db/drizzle";
import { listings, profiles, listingRefreshes } from "@/lib/db/schema";
import { requirePlan } from "@/lib/billing/gating";

// 10 refresh operations per IP per hour
const refreshLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 60 * 1000,
});

interface RouteContext {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request.headers);
  const { success } = refreshLimiter.check(ip);
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

  // Get user's agency to check plan
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

  // Require Premium+ plan
  try {
    await requirePlan("premium", profile.agencyId);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json(
      { error: e.message ?? "Kjo veçori kërkon planin Premium." },
      { status: e.status ?? 403 }
    );
  }

  // Verify listing exists and user owns it
  const [listing] = await db
    .select({
      id: listings.id,
      userId: listings.userId,
      isActive: listings.isActive,
    })
    .from(listings)
    .where(eq(listings.id, params.id))
    .limit(1);

  if (!listing) {
    return NextResponse.json(
      { error: "Njoftimi nuk u gjet." },
      { status: 404 }
    );
  }

  if (listing.userId !== user.id) {
    return NextResponse.json(
      { error: "Nuk keni leje për këtë njoftim." },
      { status: 403 }
    );
  }

  if (!listing.isActive) {
    return NextResponse.json(
      { error: "Njoftimi nuk është aktiv." },
      { status: 400 }
    );
  }

  // Check 24h cooldown — look for most recent refresh
  const [lastRefresh] = await db
    .select({ refreshedAt: listingRefreshes.refreshedAt })
    .from(listingRefreshes)
    .where(eq(listingRefreshes.listingId, params.id))
    .orderBy(sql`refreshed_at DESC`)
    .limit(1);

  if (lastRefresh?.refreshedAt) {
    const hoursSince =
      (Date.now() - new Date(lastRefresh.refreshedAt).getTime()) /
      (1000 * 60 * 60);
    if (hoursSince < 24) {
      const hoursRemaining = Math.ceil(24 - hoursSince);
      return NextResponse.json(
        {
          error: `Mund të rifreskoni vetëm një herë në 24 orë. Provoni përsëri pas ${hoursRemaining} orësh.`,
        },
        { status: 429 }
      );
    }
  }

  const now = new Date();

  // Create refresh record
  await db.insert(listingRefreshes).values({
    listingId: params.id,
    refreshedAt: now,
    type: "manual",
  });

  // Update listing's last_refreshed_at via raw SQL (column not in Drizzle schema for compat)
  await db.execute(
    sql`UPDATE listings SET last_refreshed_at = ${now.toISOString()}, first_seen = ${now.toISOString()}, updated_at = ${now.toISOString()} WHERE id = ${params.id}`
  );

  return NextResponse.json({
    success: true,
    refreshed_at: now.toISOString(),
  });
}
