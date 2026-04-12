import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { getDb } from "@/lib/db/drizzle";
import { inquiries, profiles } from "@/lib/db/schema";
import { requirePlan } from "@/lib/billing/gating";

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

  // Plan gate: CRM export requires Growth+
  try {
    await requirePlan("growth", profile.agencyId);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return NextResponse.json(
      { error: e.message ?? "Kjo veçori kërkon planin Growth ose më lart." },
      { status: e.status ?? 403 }
    );
  }

  const rows = await db
    .select({
      senderName: inquiries.senderName,
      senderEmail: inquiries.senderEmail,
      senderPhone: inquiries.senderPhone,
      message: inquiries.message,
      status: inquiries.status,
      leadScore: inquiries.leadScore,
      notes: inquiries.notes,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .where(eq(inquiries.agencyId, profile.agencyId))
    .orderBy(desc(inquiries.createdAt))
    .limit(5000);

  // Build CSV
  const header = "Emri,Email,Telefon,Mesazhi,Statusi,Pikët,Shënime,Data";
  const csvRows = rows.map((r) => {
    const fields = [
      escapeCsv(r.senderName),
      escapeCsv(r.senderEmail),
      escapeCsv(r.senderPhone ?? ""),
      escapeCsv(r.message),
      r.status ?? "new",
      String(r.leadScore ?? ""),
      escapeCsv(r.notes ?? ""),
      r.createdAt?.toISOString().split("T")[0] ?? "",
    ];
    return fields.join(",");
  });

  const csv = [header, ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
