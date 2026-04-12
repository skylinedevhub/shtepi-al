import { NextRequest, NextResponse } from "next/server";
import { getMarketOverview, getCityMetrics, getInventoryDepth } from "@/lib/analytics/market";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const { success } = limiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Shumë kërkesa. Provoni përsëri më vonë." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const view = searchParams.get("view"); // overview | city | inventory

  if (city) {
    const data = await getCityMetrics(city);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  }

  if (view === "inventory") {
    const data = await getInventoryDepth();
    return NextResponse.json(
      { inventory: data },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  }

  // Default: overview
  const data = await getMarketOverview();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
