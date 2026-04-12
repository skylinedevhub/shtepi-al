import { NextRequest, NextResponse } from "next/server";
import { recordImpression } from "@/lib/ads/track";
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

  let body: {
    impressions: Array<{
      campaign_id: string;
      listing_id?: string;
      placement: string;
    }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON i pavlefshëm." }, { status: 400 });
  }

  if (!Array.isArray(body.impressions) || body.impressions.length === 0) {
    return NextResponse.json(
      { error: "Impressions array mungon." },
      { status: 400 }
    );
  }

  // Cap batch size
  const batch = body.impressions.slice(0, 50);

  const ua = request.headers.get("user-agent") ?? "";
  const fingerprint = await hashFingerprint(ip, ua);
  const device = /mobile|android|iphone/i.test(ua) ? "mobile" : "desktop";

  for (const imp of batch) {
    recordImpression({
      campaignId: imp.campaign_id,
      listingId: imp.listing_id ?? null,
      placement: imp.placement,
      userFingerprint: fingerprint,
      device,
      cityContext: null,
    });
  }

  return NextResponse.json({ recorded: batch.length });
}

async function hashFingerprint(ip: string, ua: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${ua}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
