import { describe, it, expect } from "vitest";
import { GET } from "../zones/route";

describe("GET /api/valuation/zones", () => {
  it("returns 200 with zones array", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.zones)).toBe(true);
    expect(data.zones.length).toBeGreaterThan(0);
  });

  it("each zone has zk_numer and display_label", async () => {
    const res = await GET();
    const data = await res.json();
    for (const z of data.zones) {
      expect(typeof z.zk_numer).toBe("number");
      expect(typeof z.display_label).toBe("string");
    }
  });
});
