import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { getMarketOverview } from "@repo/analytics";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const overview = await getMarketOverview(getDb());
  return NextResponse.json(overview, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
