import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/drizzle";
import { listings } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { listingUpdateSchema } from "@/lib/validators";

interface RouteContext {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient();
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

  // Verify ownership
  const [existing] = await db
    .select({ userId: listings.userId, origin: listings.origin })
    .from(listings)
    .where(eq(listings.id, params.id));

  if (!existing) {
    return NextResponse.json(
      { error: "Njoftimi nuk u gjet" },
      { status: 404 }
    );
  }

  if (existing.origin !== "user" || existing.userId !== user.id) {
    return NextResponse.json(
      { error: "Nuk keni leje për të ndryshuar këtë njoftim" },
      { status: 403 }
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

  const result = listingUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0].message },
      { status: 400 }
    );
  }

  const data = result.data;

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updateValues.title = data.title;
  if (data.description !== undefined)
    updateValues.description = data.description;
  if (data.price !== undefined) updateValues.price = data.price;
  if (data.currency_original !== undefined)
    updateValues.currencyOriginal = data.currency_original;
  if (data.price_period !== undefined)
    updateValues.pricePeriod = data.price_period;
  if (data.transaction_type !== undefined)
    updateValues.transactionType = data.transaction_type;
  if (data.property_type !== undefined)
    updateValues.propertyType = data.property_type;
  if (data.room_config !== undefined) updateValues.roomConfig = data.room_config;
  if (data.area_sqm !== undefined) updateValues.areaSqm = data.area_sqm;
  if (data.floor !== undefined) updateValues.floor = data.floor;
  if (data.total_floors !== undefined)
    updateValues.totalFloors = data.total_floors;
  if (data.rooms !== undefined) updateValues.rooms = data.rooms;
  if (data.bathrooms !== undefined) updateValues.bathrooms = data.bathrooms;
  if (data.city !== undefined) updateValues.city = data.city;
  if (data.neighborhood !== undefined)
    updateValues.neighborhood = data.neighborhood;
  if (data.address_raw !== undefined) updateValues.addressRaw = data.address_raw;
  if (data.has_elevator !== undefined)
    updateValues.hasElevator = data.has_elevator;
  if (data.has_parking !== undefined) updateValues.hasParking = data.has_parking;
  if (data.is_furnished !== undefined)
    updateValues.isFurnished = data.is_furnished;
  if (data.is_new_build !== undefined)
    updateValues.isNewBuild = data.is_new_build;
  if (data.poster_name !== undefined) updateValues.posterName = data.poster_name;
  if (data.poster_phone !== undefined)
    updateValues.posterPhone = data.poster_phone;
  if (data.images !== undefined) {
    updateValues.images = data.images;
    updateValues.imageCount = data.images.length;
  }

  await db
    .update(listings)
    .set(updateValues)
    .where(eq(listings.id, params.id));

  return NextResponse.json({ message: "Njoftimi u përditësua me sukses" });
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext
) {
  const supabase = await createClient();
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

  const [existing] = await db
    .select({ userId: listings.userId, origin: listings.origin })
    .from(listings)
    .where(eq(listings.id, params.id));

  if (!existing) {
    return NextResponse.json(
      { error: "Njoftimi nuk u gjet" },
      { status: 404 }
    );
  }

  if (existing.origin !== "user" || existing.userId !== user.id) {
    return NextResponse.json(
      { error: "Nuk keni leje për të fshirë këtë njoftim" },
      { status: 403 }
    );
  }

  // Soft delete: archive the listing
  await db
    .update(listings)
    .set({ status: "archived", isActive: false, updatedAt: new Date() })
    .where(eq(listings.id, params.id));

  return NextResponse.json({ message: "Njoftimi u fshi me sukses" });
}
