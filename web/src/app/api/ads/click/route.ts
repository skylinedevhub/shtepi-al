import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/ads/track";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const limiter = createRateLimiter({ limit: 100, windowMs: 60_000 });

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const { success } = limiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Shumë kërkesa. Provoni përsëri më vonë." },
      { status: 429 }
    );
  }

  let body: { impression_id?: number; campaign_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshëm." }, { status: 400 });
  }

  if (!body.campaign_id) {
    return NextResponse.json(
      { error: "campaign_id mungon." },
      { status: 400 }
    );
  }

  await recordClick(body.impression_id ?? null, body.campaign_id);

  return NextResponse.json({ recorded: true });
}
