import { NextRequest, NextResponse } from "next/server";
import { getNeighborhoods } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city");
  if (!city) {
    return NextResponse.json([], {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  }

  const neighborhoods = await getNeighborhoods(city);

  return NextResponse.json(neighborhoods, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
