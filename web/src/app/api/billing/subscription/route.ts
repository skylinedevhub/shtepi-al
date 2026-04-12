import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/drizzle";
import { profiles } from "@/lib/db/schema";
import { getSubscription, getUsage } from "@/lib/billing/subscriptions";

export async function GET() {
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

  const subscription = await getSubscription(user.id);

  if (!subscription) {
    return NextResponse.json({
      subscription: null,
      usage: null,
    });
  }

  // If the subscription is for an agency, also fetch usage
  let usage = null;
  if (subscription.agency_id) {
    usage = await getUsage(subscription.agency_id);
  } else {
    // For non-agency subscriptions, check if the user belongs to an agency
    const db = getDb();
    if (db) {
      const [profile] = await db
        .select({ agencyId: profiles.agencyId })
        .from(profiles)
        .where(eq(profiles.id, user.id));

      if (profile?.agencyId) {
        usage = await getUsage(profile.agencyId);
      }
    }
  }

  return NextResponse.json({ subscription, usage });
}
