import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/drizzle";
import { inquiries, profiles } from "@/lib/db/schema";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth nuk disponohet." }, { status: 503 });
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Pa autorizim." }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ leads: [], total: 0 });
  }

  // Get user's agency
  const [profile] = await db
    .select({ agencyId: profiles.agencyId })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile?.agencyId) {
    return NextResponse.json({ leads: [], total: 0 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));
  const offset = (page - 1) * limit;

  const conditions = [eq(inquiries.agencyId, profile.agencyId)];
  if (status) {
    conditions.push(
      sql`${inquiries.status} = ${status}` as ReturnType<typeof eq>
    );
  }

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inquiries)
    .where(and(...conditions));

  const rows = await db
    .select({
      id: inquiries.id,
      listingId: inquiries.listingId,
      senderName: inquiries.senderName,
      senderEmail: inquiries.senderEmail,
      senderPhone: inquiries.senderPhone,
      message: inquiries.message,
      status: inquiries.status,
      leadScore: inquiries.leadScore,
      notes: inquiries.notes,
      contactedAt: inquiries.contactedAt,
      convertedAt: inquiries.convertedAt,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .where(and(...conditions))
    .orderBy(desc(inquiries.createdAt))
    .limit(limit)
    .offset(offset);

  const total = Number(countResult.count);
  const leads = rows.map((r) => ({
    id: r.id,
    listing_id: r.listingId,
    sender_name: r.senderName,
    sender_email: r.senderEmail,
    sender_phone: r.senderPhone,
    message: r.message,
    status: r.status ?? "new",
    lead_score: r.leadScore,
    notes: r.notes,
    contacted_at: r.contactedAt?.toISOString() ?? null,
    converted_at: r.convertedAt?.toISOString() ?? null,
    created_at: r.createdAt?.toISOString() ?? null,
  }));

  return NextResponse.json({
    leads,
    total,
    page,
    limit,
    has_more: offset + rows.length < total,
  });
}
