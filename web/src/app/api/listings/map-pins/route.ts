import { NextRequest, NextResponse } from "next/server";
import { getMapListings } from "@/lib/db/queries";
import type { ListingFilters } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const filters: ListingFilters = {};

    if (params.get("city")) filters.city = params.get("city")!;
    if (params.get("transaction_type"))
      filters.transaction_type = params.get("transaction_type")!;
    if (params.get("property_type"))
      filters.property_type = params.get("property_type")!;
    if (params.get("price_min"))
      filters.price_min = Number(params.get("price_min"));
    if (params.get("price_max"))
      filters.price_max = Number(params.get("price_max"));
    if (params.get("rooms_min"))
      filters.rooms_min = Number(params.get("rooms_min"));
    if (params.get("rooms_max"))
      filters.rooms_max = Number(params.get("rooms_max"));
    if (params.get("area_min"))
      filters.area_min = Number(params.get("area_min"));
    if (params.get("area_max"))
      filters.area_max = Number(params.get("area_max"));
    if (params.get("neighborhood"))
      filters.neighborhood = params.get("neighborhood")!;
    if (params.get("source")) filters.source = params.get("source")!;

    const pins = await getMapListings(filters);
    return NextResponse.json(pins, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (e) {
    console.error("[GET /api/listings/map-pins]", e);
    return NextResponse.json(
      { error: "Gabim i brendshëm i serverit" },
      { status: 500 }
    );
  }
}
