import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/drizzle";
import { inquiries, profiles } from "@/lib/db/schema";
import { validateCsrf } from "@/lib/csrf";

interface RouteContext {
  params: { id: string };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

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
    return NextResponse.json(
      { error: "Databaza nuk është e disponueshme." },
      { status: 503 }
    );
  }

  const [profile] = await db
    .select({ agencyId: profiles.agencyId })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile?.agencyId) {
    return NextResponse.json({ error: "Pa agjenci." }, { status: 403 });
  }

  const { id } = context.params;
  let body: { status?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshëm." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.status) {
    const validStatuses = ["new", "contacted", "qualified", "converted", "lost"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Status i pavlefshëm." }, { status: 400 });
    }
    updates.status = body.status;
    if (body.status === "contacted") updates.contactedAt = new Date();
    if (body.status === "converted") updates.convertedAt = new Date();
  }
  if (body.notes !== undefined) {
    updates.notes = body.notes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Asnjë ndryshim." }, { status: 400 });
  }

  // Verify the lead belongs to this agency
  const [lead] = await db
    .select({ agencyId: inquiries.agencyId })
    .from(inquiries)
    .where(eq(inquiries.id, id))
    .limit(1);

  if (!lead || lead.agencyId !== profile.agencyId) {
    return NextResponse.json({ error: "Lead nuk u gjet." }, { status: 404 });
  }

  await db.update(inquiries).set(updates).where(eq(inquiries.id, id));

  return NextResponse.json({ success: true });
}
