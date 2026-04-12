import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/db/queries";
import { getDb } from "@/lib/db/drizzle";
import { partnerAds } from "@/lib/db/schema";
import { validateCsrf } from "@/lib/csrf";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const limiter = createRateLimiter({ limit: 30, windowMs: 3600_000 });

async function verifyAdmin(): Promise<{ error?: NextResponse }> {
  const supabase = await createClient();
  if (!supabase) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const profile = await getUserProfile(user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "moderator")) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {};
}

const partnerUpdateSchema = z.object({
  partnerName: z.string().min(1).max(200).optional(),
  partnerType: z.string().min(1).max(50).optional(),
  logoUrl: z.string().url().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  clickUrl: z.string().url().optional(),
  placement: z.string().min(1).max(50).optional(),
  priceMonthlyEur: z.number().int().min(0).nullable().optional(),
  cities: z.array(z.string()).nullable().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PATCH /api/partners/[id] — update a partner ad (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { error: authError } = await verifyAdmin();
  if (authError) return authError;

  const ip = getClientIp(request.headers);
  const { success } = limiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Keni bere shume kerkesa. Provoni me vone." },
      { status: 429 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "Databaza nuk eshte e disponueshme" },
      { status: 503 }
    );
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshem" }, { status: 400 });
  }

  const parsed = partnerUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Te dhena te pavlefshme", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Check partner exists
  const existing = await db
    .select({ id: partnerAds.id })
    .from(partnerAds)
    .where(eq(partnerAds.id, id))
    .limit(1);

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Partneri nuk u gjet" },
      { status: 404 }
    );
  }

  // Build update object
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.partnerName !== undefined) updateData.partnerName = parsed.data.partnerName;
  if (parsed.data.partnerType !== undefined) updateData.partnerType = parsed.data.partnerType;
  if (parsed.data.logoUrl !== undefined) updateData.logoUrl = parsed.data.logoUrl;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.clickUrl !== undefined) updateData.clickUrl = parsed.data.clickUrl;
  if (parsed.data.placement !== undefined) updateData.placement = parsed.data.placement;
  if (parsed.data.priceMonthlyEur !== undefined) updateData.priceMonthlyEur = parsed.data.priceMonthlyEur;
  if (parsed.data.cities !== undefined) updateData.cities = parsed.data.cities;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  const [updated] = await db
    .update(partnerAds)
    .set(updateData)
    .where(eq(partnerAds.id, id))
    .returning();

  return NextResponse.json({ partner: updated });
}
