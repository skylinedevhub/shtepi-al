import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db/drizzle";
import { listings } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
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

  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.userId, session.user.id))
    .orderBy(desc(listings.createdAt));

  return NextResponse.json({ listings: rows });
}
