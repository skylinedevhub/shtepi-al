import { NextRequest, NextResponse } from "next/server";
import { searchListings } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const query = params.get("q");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Parametri 'q' i kërkimit është i nevojshëm" },
        { status: 400 }
      );
    }

    const limit = Math.min(Number(params.get("limit") ?? 24), 100);
    const page = Number(params.get("page") ?? 1);

    const result = await searchListings(query, limit, page);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[GET /api/search]", e);
    return NextResponse.json(
      { error: "Gabim i brendshëm i serverit" },
      { status: 500 }
    );
  }
}
