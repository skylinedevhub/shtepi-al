import { NextRequest, NextResponse } from "next/server";
import { getAdsForPlacement } from "@/lib/ads/serve";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";

const limiter = createRateLimiter({ limit: 100, windowMs: 60_000 });

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const { success } = limiter.check(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Shumë kërkesa. Provoni përsëri më vonë." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const placement = searchParams.get("placement");
  if (!placement) {
    return NextResponse.json(
      { error: "Parametri 'placement' mungon." },
      { status: 400 }
    );
  }

  const city = searchParams.get("city") ?? undefined;
  const device =
    (searchParams.get("device") as "desktop" | "mobile") ?? undefined;
  const exclude = searchParams.get("exclude")?.split(",").filter(Boolean) ?? [];
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  // Generate fingerprint from IP + User-Agent (hashed, no PII stored)
  const ua = request.headers.get("user-agent") ?? "";
  const fingerprint = await hashFingerprint(ip, ua);

  const ads = await getAdsForPlacement({
    placement,
    city,
    device,
    userFingerprint: fingerprint,
    excludeListingIds: exclude,
    limit,
  });

  return NextResponse.json({ ads });
}

async function hashFingerprint(ip: string, ua: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${ua}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
