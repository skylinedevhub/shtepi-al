import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { getDb } from "@/lib/db/drizzle";
import { priceAlerts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

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
    return NextResponse.json(
      { error: "Shërbimi nuk është i disponueshëm" },
      { status: 503 }
    );
  }

  const deleted = await db
    .delete(priceAlerts)
    .where(
      and(eq(priceAlerts.id, params.id), eq(priceAlerts.userId, user.id))
    )
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json(
      { error: "Alerti nuk u gjet" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
