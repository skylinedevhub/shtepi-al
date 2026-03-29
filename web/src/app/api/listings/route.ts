import { NextRequest, NextResponse } from "next/server";
import { getListings, getListingById } from "@/lib/db/queries";
import { getDb } from "@/lib/db/drizzle";
import { listings } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
import { listingCreateSchema } from "@/lib/validators";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";
import { parseNumericParam } from "@/lib/parse-numeric";
import type { ListingFilters } from "@/lib/types";

// 10 listing creates per IP per hour
const createLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    // Single listing by ID
    const id = params.get("id");
    if (id) {
      const listing = await getListingById(id);
      if (!listing) {
        return NextResponse.json({ error: "Njoftimi nuk u gjet" }, { status: 404 });
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
    if (params.get("sort"))
      filters.sort = params.get("sort") as ListingFilters["sort"];
    const pageNum = parseNumericParam(params.get("page"));
    if (pageNum !== undefined) filters.page = pageNum;
    const limitNum = parseNumericParam(params.get("limit"));
    if (limitNum !== undefined) filters.limit = limitNum;

    const result = await getListings(filters);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (e) {
    console.error("[GET /api/listings]", e);
    return NextResponse.json(
      { error: "Gabim i brendshëm i serverit" },
      { status: 500 }
    );
  }
}

const EUR_ALL_RATE = Number(process.env.EUR_ALL_RATE) || 100;

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request.headers);
  const { success } = createLimiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Shumë kërkesa. Provoni përsëri më vonë." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Auth service unavailable" },
      { status: 503 }
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Duhet të jeni i kyçur" },
      { status: 401 }
    );
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json(
      { error: "Databaza nuk është e disponueshme" },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Kërkesë e pavlefshme" },
      { status: 400 }
    );
  }

  const result = listingCreateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = result.data;

  // Price conversion
  let priceEur = data.price ?? null;
  let priceAll = null;
  if (data.price) {
    if (data.currency_original === "ALL") {
      priceAll = data.price;
      priceEur = Math.round(data.price / EUR_ALL_RATE);
    } else {
      priceEur = data.price;
      priceAll = data.price * EUR_ALL_RATE;
    }
  }

  const displayName =
    user.user_metadata?.full_name ?? user.user_metadata?.name ?? null;

  const [newListing] = await db
    .insert(listings)
    .values({
      title: data.title,
      description: data.description,
      price: priceEur,
      priceAll: priceAll,
      currencyOriginal: data.currency_original,
      pricePeriod: data.price_period,
      transactionType: data.transaction_type,
      propertyType: data.property_type,
      roomConfig: data.room_config,
      areaSqm: data.area_sqm,
      floor: data.floor,
      totalFloors: data.total_floors,
      rooms: data.rooms,
      bathrooms: data.bathrooms,
      city: data.city,
      neighborhood: data.neighborhood,
      addressRaw: data.address_raw,
      latitude: data.latitude,
      longitude: data.longitude,
      images: data.images,
      imageCount: data.images.length,
      posterName: data.poster_name ?? displayName,
      posterPhone: data.poster_phone,
      posterType: "private",
      hasElevator: data.has_elevator,
      hasParking: data.has_parking,
      isFurnished: data.is_furnished,
      isNewBuild: data.is_new_build,
      origin: "user",
      userId: user.id,
      status: "pending",
      isActive: false,
    })
    .returning({ id: listings.id });

  return NextResponse.json(
    { id: newListing.id, message: "Njoftimi u krijua me sukses" },
    { status: 201 }
  );
}
