import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { getDb } from "@/lib/db/drizzle";
import { savedSearches } from "@/lib/db/schema";
import { getUserPlanLimits } from "@/lib/billing/gating";
import { eq, desc, sql } from "drizzle-orm";

// 20 saved search operations per IP per hour
const searchLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 60 * 1000,
});

// Free users can save up to 3 searches
const FREE_SAVED_SEARCH_LIMIT = 3;

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request.headers);
  const { success } = searchLimiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Shumë kërkesa. Provoni përsëri më vonë." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { name, filters, notify } = body as {
    name?: string;
    filters?: Record<string, unknown>;
    notify?: boolean;
  };

  if (!name || !filters) {
    return NextResponse.json(
      { error: "name dhe filters janë të detyrueshme" },
      { status: 400 }
    );
  }

  if (name.length > 200) {
    return NextResponse.json(
      { error: "Emri nuk duhet të jetë më i gjatë se 200 karaktere" },
      { status: 400 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "Shërbimi nuk është i disponueshëm" },
      { status: 503 }
    );
  }

  // Check plan — free users limited to 3 saved searches
  const { planSlug } = await getUserPlanLimits(user.id);
  const isBuyerPlus = planSlug === "buyer-plus";

  if (!isBuyerPlus) {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(savedSearches)
      .where(eq(savedSearches.userId, user.id));

    if (Number(countResult.count) >= FREE_SAVED_SEARCH_LIMIT) {
      return NextResponse.json(
        {
          error: `Keni arritur limitin e ${FREE_SAVED_SEARCH_LIMIT} kërkimeve të ruajtura. Aktivizoni Buyer Plus për kërkim pa limit.`,
        },
        { status: 403 }
      );
    }
  }

  // Notifications only for Buyer Plus
  const shouldNotify = isBuyerPlus ? (notify ?? false) : false;

  const [search] = await db
    .insert(savedSearches)
    .values({
      userId: user.id,
      name,
      filters,
      notify: shouldNotify,
    })
    .returning();

  return NextResponse.json(search, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ searches: [] });
  }

  const searches = await db
    .select()
    .from(savedSearches)
    .where(eq(savedSearches.userId, user.id))
    .orderBy(desc(savedSearches.createdAt));

  return NextResponse.json({ searches });
}
