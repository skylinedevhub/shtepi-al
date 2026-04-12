import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/drizzle";
import { profiles } from "@/lib/db/schema";
import { validateCsrf } from "@/lib/csrf";
import { createCustomerPortalSession } from "@/lib/billing/subscriptions";

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

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

  const [profile] = await db
    .select({ stripeCustomerId: profiles.stripeCustomerId })
    .from(profiles)
    .where(eq(profiles.id, user.id));

  if (!profile?.stripeCustomerId) {
    return NextResponse.json(
      { error: "Nuk keni një abonim aktiv" },
      { status: 404 }
    );
  }

  try {
    const url = await createCustomerPortalSession(profile.stripeCustomerId);

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
