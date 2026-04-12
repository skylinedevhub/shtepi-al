import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { createCheckoutSession } from "@/lib/billing/subscriptions";
import { z } from "zod";

// 10 checkout attempts per IP per hour
const checkoutLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

const checkoutSchema = z.object({
  planSlug: z.string().min(1).max(50),
  agencyId: z.string().uuid().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request.headers);
  const { success } = checkoutLimiter.check(ip);
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Kërkesë e pavlefshme" },
      { status: 400 }
    );
  }

  const result = checkoutSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const { planSlug, agencyId, successUrl, cancelUrl } = result.data;

  try {
    const url = await createCheckoutSession(
      user.id,
      planSlug,
      agencyId,
      successUrl,
      cancelUrl
    );

    if (!url) {
      return NextResponse.json(
        { error: "Shërbimi i pagesave nuk është i disponueshëm" },
        { status: 503 }
      );
    }

    return NextResponse.json({ url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gabim i brendshëm";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
