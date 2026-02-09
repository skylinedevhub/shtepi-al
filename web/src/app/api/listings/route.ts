import { NextRequest, NextResponse } from "next/server";
import { getListings, getListingById } from "@/lib/db";
import type { ListingFilters } from "@/lib/types";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Single listing by ID
  const id = params.get("id");
  if (id) {
    const listing = getListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(listing);
  }

  // Filtered listing query
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
  if (params.get("sort"))
    filters.sort = params.get("sort") as ListingFilters["sort"];
  if (params.get("page")) filters.page = Number(params.get("page"));
  if (params.get("limit")) filters.limit = Number(params.get("limit"));

  const result = getListings(filters);
  return NextResponse.json(result);
}
