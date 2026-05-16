import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { getPriceTrends } from "@repo/analytics";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await authenticateApiKey(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const cityParam = url.searchParams.get("city");
  const tx = url.searchParams.get("transaction_type") === "rent" ? "rent" : "sale";
  const daysRaw = Number(url.searchParams.get("days") ?? 180);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 730 ? Math.floor(daysRaw) : 180;

  const trend = await getPriceTrends(getDb(), {
    city: cityParam && cityParam.length > 0 ? cityParam : null,
    transactionType: tx,
    days,
  });

  return NextResponse.json(trend, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
