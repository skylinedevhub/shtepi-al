import { NextResponse } from "next/server";
import { getPriceHistory } from "@/lib/db/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Basic UUID format validation
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const history = await getPriceHistory(id);
  return NextResponse.json(history);
}
