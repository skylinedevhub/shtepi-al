import { describe, it, expect } from "vitest";
import { POST } from "../calculate/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/valuation/calculate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost:3000",
      host: "localhost:3000",
    },
    body: JSON.stringify(body),
  });
}

const validBody = {
  zk_numer: 8270,
  area_sqm: 100,
  build_year: 2015,
  property_type: "ndertese_banimi",
};

describe("POST /api/valuation/calculate", () => {
  it("returns 200 with valuation result for valid input", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.market_value).toBeGreaterThan(0);
    expect(data.reference_value).toBeGreaterThan(0);
    expect(data.breakdown).toBeDefined();
    expect(data.breakdown.base_price).toBe(159100); // seed price for zone 8270
    expect(data.breakdown.type_coef).toBe(1.0);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(makeRequest({ zk_numer: 8270 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it("returns 400 for invalid property type", async () => {
    const res = await POST(
      makeRequest({ ...validBody, property_type: "spaceship" })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative area", async () => {
    const res = await POST(makeRequest({ ...validBody, area_sqm: -10 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when zone has no price data", async () => {
    const res = await POST(makeRequest({ ...validBody, zk_numer: 99999 }));
    expect(res.status).toBe(404);
  });

  it("returns land valuation for land types", async () => {
    const res = await POST(
      makeRequest({ ...validBody, property_type: "truall" })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.breakdown.depreciation_coef).toBe(1.0);
    expect(data.breakdown.type_coef).toBe(0.6);
  });

  it("rejects cross-origin requests (CSRF)", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/valuation/calculate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          origin: "http://evil.com",
          host: "localhost:3000",
        },
        body: JSON.stringify(validBody),
      }
    );
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
