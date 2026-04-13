import { NextResponse } from "next/server";
import { getValuationZones } from "@/lib/valuation/queries";

export const revalidate = 86400; // Cache 24 hours

export async function GET() {
  try {
    const zones = await getValuationZones();
    return NextResponse.json({ zones });
  } catch {
    return NextResponse.json(
      { error: "Gabim ne ngarkimin e zonave kadastrale" },
      { status: 500 }
    );
  }
}
