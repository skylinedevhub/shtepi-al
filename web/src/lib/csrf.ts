/**
 * CSRF protection via Origin/Referer header validation.
 * Rejects mutation requests from cross-origin sources.
 */

import { NextRequest, NextResponse } from "next/server";

const CSRF_ERROR = NextResponse.json(
  { error: "Kërkesë e pavlefshme (CSRF)" },
  { status: 403 }
);

export function validateCsrf(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!host) return CSRF_ERROR;

  // Check origin header first (most reliable)
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) return CSRF_ERROR;
      return null; // valid
    } catch {
      return CSRF_ERROR;
    }
  }

  // Fall back to referer
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) return CSRF_ERROR;
      return null; // valid
    } catch {
      return CSRF_ERROR;
    }
  }

  // No origin or referer — allow (some browsers don't send these for same-origin)
  return null;
}
