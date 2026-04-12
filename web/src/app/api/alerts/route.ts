import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { getDb } from "@/lib/db/drizzle";
import { priceAlerts } from "@/lib/db/schema";
import { getUserPlanLimits } from "@/lib/billing/gating";
import { eq, desc } from "drizzle-orm";

// 30 alert operations per IP per hour
const alertLimiter = createRateLimiter({ limit: 30, windowMs: 60 * 60 * 1000 });

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request.headers);
  const { success } = alertLimiter.check(ip);
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

  // Check Buyer Plus subscription
  const { planSlug } = await getUserPlanLimits(user.id);
  if (planSlug !== "buyer-plus") {
    return NextResponse.json(
      { error: "Kjo veçori kërkon abonimin Buyer Plus." },
      { status: 403 }
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

  const { listingId, thresholdEur } = body as {
    listingId?: string;
    thresholdEur?: number;
  };

  if (!listingId) {
    return NextResponse.json(
      { error: "listingId required" },
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

  const [alert] = await db
    .insert(priceAlerts)
    .values({
      userId: user.id,
      listingId,
      thresholdEur: thresholdEur ?? null,
    })
    .returning();

  return NextResponse.json(alert, { status: 201 });
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
    return NextResponse.json({ alerts: [] });
  }

  const alerts = await db
    .select()
    .from(priceAlerts)
    .where(eq(priceAlerts.userId, user.id))
    .orderBy(desc(priceAlerts.createdAt));

  return NextResponse.json({ alerts });
}
