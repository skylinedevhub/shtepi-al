import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/drizzle";
import { writeDailySnapshot } from "@repo/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ rowsWritten: 0, skipped: "no-db" });
  }

  const { rowsWritten } = await writeDailySnapshot(db);
  return NextResponse.json({ rowsWritten });
}
