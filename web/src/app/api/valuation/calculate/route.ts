import { NextRequest, NextResponse } from "next/server";
import { validateCsrf } from "@/lib/csrf";
import { createRateLimiter, getClientIp } from "@/lib/rate-limit";
import { calculateValuation } from "@/lib/valuation/engine";
import { getBasePrice, saveValuation } from "@/lib/valuation/queries";
import { VALUATION_PROPERTY_TYPES } from "@/lib/valuation/types";
import type { ValuationPropertyType } from "@/lib/valuation/types";

export const dynamic = "force-dynamic";

const calcLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 60 * 1000,
});

export async function POST(request: NextRequest) {
  const csrfError = validateCsrf(request);
  if (csrfError) return csrfError;

  const ip = getClientIp(request.headers);
  const rl = calcLimiter.check(ip);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Keni arritur limitin e kerkesave. Provoni me vone." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Kerkese e pavlefshme" },
      { status: 400 }
    );
  }

  const zkNumer = Number(body.zk_numer);
  const areaSqm = Number(body.area_sqm);
  const buildYear = Number(body.build_year);
  const propertyType = String(body.property_type ?? "");
  const propertyNo = body.property_no ? String(body.property_no) : null;

  if (!Number.isFinite(zkNumer) || zkNumer <= 0) {
    return NextResponse.json(
      { error: "Zona kadastrale eshte e pavlefshme" },
      { status: 400 }
    );
  }
  if (!Number.isFinite(areaSqm) || areaSqm <= 0) {
    return NextResponse.json(
      { error: "Siperfaqja duhet te jete pozitive" },
      { status: 400 }
    );
  }
  if (
    !Number.isFinite(buildYear) ||
    buildYear < 1900 ||
    buildYear > new Date().getFullYear() + 5
  ) {
    return NextResponse.json(
      { error: "Viti i ndertimit eshte i pavlefshem" },
      { status: 400 }
    );
  }
  if (!(propertyType in VALUATION_PROPERTY_TYPES)) {
    return NextResponse.json(
      { error: "Tipi i prones eshte i pavlefshem" },
      { status: 400 }
    );
  }

  const basePrice = await getBasePrice(
    zkNumer,
    propertyType as ValuationPropertyType
  );
  if (basePrice === null) {
    return NextResponse.json(
      { error: "Nuk u gjet cmim per kete zone dhe tip prone" },
      { status: 404 }
    );
  }

  const result = calculateValuation({
    basePriceLekPerSqm: basePrice,
    areaSqm,
    buildYear,
    propertyType: propertyType as ValuationPropertyType,
    zkNumer,
  });

  // Fire-and-forget save
  saveValuation({
    zkNumer,
    propertyNo,
    areaSqm,
    buildYear,
    propertyType,
    marketValueAll: result.market_value,
    referenceValueAll: result.reference_value,
    breakdown: result.breakdown,
  }).catch(() => {});

  return NextResponse.json(result);
}
