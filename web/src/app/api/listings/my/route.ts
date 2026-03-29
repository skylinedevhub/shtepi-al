import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/drizzle";
import { listings } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
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

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") ?? "50", 10) || 50));
  const offset = (page - 1) * limit;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(listings)
    .where(eq(listings.userId, user.id));
  const total = Number(countResult.count);

  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.userId, user.id))
    .orderBy(desc(listings.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    listings: rows,
    total,
    page,
    limit,
    has_more: offset + rows.length < total,
  });
}
