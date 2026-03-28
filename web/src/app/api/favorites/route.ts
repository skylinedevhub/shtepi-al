import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toggleFavorite, getUserFavorites, getUserFavoriteIds } from "@/lib/db/queries";

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { listingId } = body as { listingId: string };

  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  const result = await toggleFavorite(user.id, listingId);
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // If ?ids=true, return just the list of favorited listing IDs
  if (searchParams.get("ids") === "true") {
    const ids = await getUserFavoriteIds(user.id);
    return NextResponse.json({ ids });
  }

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));

  const data = await getUserFavorites(user.id, page, limit);
  return NextResponse.json(data);
}
