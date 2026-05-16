// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/drizzle", () => ({
  getDb: vi.fn(() => null),
}));

vi.mock("@repo/analytics", () => ({
  writeDailySnapshot: vi.fn(async () => ({ rowsWritten: 0 })),
}));

import { GET } from "./route";

describe("GET /api/cron/market-snapshot", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
  });

  it("rejects requests without authorization", async () => {
    const req = new Request("http://x/api/cron/market-snapshot");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("rejects wrong bearer token", async () => {
    const req = new Request("http://x/api/cron/market-snapshot", {
      headers: { authorization: "Bearer wrong" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("accepts correct bearer token and returns 200", async () => {
    const req = new Request("http://x/api/cron/market-snapshot", {
      headers: { authorization: "Bearer test-secret" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("rowsWritten");
  });
});
