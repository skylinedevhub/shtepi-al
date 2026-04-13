import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/db/queries";
import { getDb } from "@/lib/db/drizzle";
import { partnerAds } from "@/lib/db/schema";
import { validateCsrf } from "@/lib/csrf";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const publicLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });
const adminLimiter = createRateLimiter({ limit: 30, windowMs: 3600_000 });

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

/**
 * GET /api/partners?placement=detail_sidebar&city=Tiranë
 * Public endpoint — returns active partners for a placement + optional city
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const { success } = publicLimiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Shumë kërkesa. Provoni përsëri më vonë." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const placement = searchParams.get("placement");

  if (!placement) {
    return NextResponse.json(
      { error: "Parametri 'placement' mungon." },
      { status: 400 }
    );
  }

  const city = searchParams.get("city");

  const db = getDb();
  if (!db) {
    return NextResponse.json({ partners: [] });
  }

  const conditions = [
    eq(partnerAds.placement, placement),
    eq(partnerAds.isActive, true),
  ];

  const rows = await db
    .select({
      id: partnerAds.id,
      partnerName: partnerAds.partnerName,
      partnerType: partnerAds.partnerType,
      logoUrl: partnerAds.logoUrl,
      description: partnerAds.description,
      clickUrl: partnerAds.clickUrl,
      placement: partnerAds.placement,
      cities: partnerAds.cities,
    })
    .from(partnerAds)
    .where(and(...conditions));

  // Filter by city client-side (jsonb contains check)
  const filtered = city
    ? rows.filter(
        (r) => !r.cities || r.cities.length === 0 || r.cities.includes(city)
      )
    : rows;

  return NextResponse.json({ partners: filtered });
}

/**
 * POST /api/partners — create a new partner ad (admin only)
 */
const partnerCreateSchema = z.object({
  partnerName: z.string().min(1, "Emri i partnerit eshte i detyrueshem").max(200),
  partnerType: z.string().min(1).max(50),
  logoUrl: z.string().url().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  clickUrl: z.string().url("URL e pavlefshme"),
  placement: z.string().min(1).max(50),
  priceMonthlyEur: z.number().int().min(0).nullable().optional(),
  cities: z.array(z.string()).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const { error: authError } = await verifyAdmin();
  if (authError) return authError;

  const ip = getClientIp(request.headers);
  const { success } = adminLimiter.check(ip);
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshem" }, { status: 400 });
  }

  const parsed = partnerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Te dhena te pavlefshme", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const [newPartner] = await db
    .insert(partnerAds)
    .values({
      partnerName: parsed.data.partnerName,
      partnerType: parsed.data.partnerType,
      logoUrl: parsed.data.logoUrl ?? null,
      description: parsed.data.description ?? null,
      clickUrl: parsed.data.clickUrl,
      placement: parsed.data.placement,
      priceMonthlyEur: parsed.data.priceMonthlyEur ?? null,
      cities: parsed.data.cities ?? null,
      isActive: parsed.data.isActive,
    })
    .returning();

  return NextResponse.json({ partner: newPartner }, { status: 201 });
}
