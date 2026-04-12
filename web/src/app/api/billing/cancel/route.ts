import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/drizzle";
import { subscriptions } from "@/lib/db/schema";
import { validateCsrf } from "@/lib/csrf";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { cancelSubscription } from "@/lib/billing/subscriptions";

// 5 cancel attempts per IP per hour
const cancelLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request.headers);
  const { success } = cancelLimiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Shumë kërkesa. Provoni përsëri më vonë." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Auth service unavailable" },
      { status: 503 }
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Duhet të jeni i kyçur" },
      { status: 401 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "Databaza nuk është e disponueshme" },
      { status: 503 }
    );
  }

  // Find the user's active subscription
  const [sub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        sql`${subscriptions.status} IN ('active', 'trialing', 'past_due')`
      )
    )
    .limit(1);

  if (!sub) {
    return NextResponse.json(
      { error: "Nuk keni një abonim aktiv" },
      { status: 404 }
    );
  }

  try {
    const canceled = await cancelSubscription(sub.id);

    if (!canceled) {
      return NextResponse.json(
        { error: "Anulimi i abonimit dështoi" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gabim i brendshëm";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
