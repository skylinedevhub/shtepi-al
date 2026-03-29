import { NextRequest, NextResponse } from "next/server";
import { getMapListings } from "@/lib/db/queries";
import { parseNumericParam } from "@/lib/parse-numeric";
import type { ListingFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const filters: ListingFilters = {};

    if (params.get("city")) filters.city = params.get("city")!;
    if (params.get("transaction_type"))
      filters.transaction_type = params.get("transaction_type")!;
    if (params.get("property_type"))
      filters.property_type = params.get("property_type")!;
    const priceMin = parseNumericParam(params.get("price_min"));
    if (priceMin !== undefined) filters.price_min = priceMin;
    const priceMax = parseNumericParam(params.get("price_max"));
    if (priceMax !== undefined) filters.price_max = priceMax;
    const roomsMin = parseNumericParam(params.get("rooms_min"));
    if (roomsMin !== undefined) filters.rooms_min = roomsMin;
    const roomsMax = parseNumericParam(params.get("rooms_max"));
    if (roomsMax !== undefined) filters.rooms_max = roomsMax;
    const areaMin = parseNumericParam(params.get("area_min"));
    if (areaMin !== undefined) filters.area_min = areaMin;
    const areaMax = parseNumericParam(params.get("area_max"));
    if (areaMax !== undefined) filters.area_max = areaMax;
    if (params.get("neighborhood"))
      filters.neighborhood = params.get("neighborhood")!;
    if (params.get("source")) filters.source = params.get("source")!;
    const swLat = parseNumericParam(params.get("sw_lat"));
    if (swLat !== undefined) filters.sw_lat = swLat;
    const swLng = parseNumericParam(params.get("sw_lng"));
    if (swLng !== undefined) filters.sw_lng = swLng;
    const neLat = parseNumericParam(params.get("ne_lat"));
    if (neLat !== undefined) filters.ne_lat = neLat;
    const neLng = parseNumericParam(params.get("ne_lng"));
    if (neLng !== undefined) filters.ne_lng = neLng;

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
