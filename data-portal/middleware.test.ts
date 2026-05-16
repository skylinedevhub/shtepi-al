// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}));

import { middleware } from "./middleware";

function makeReq(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "http://localhost"), { headers });
}

describe("data-portal middleware", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = "test-key";
  });

  it("allows /login through without calling Supabase", async () => {
    const res = await middleware(makeReq("/login"));
    expect(res.status).not.toBe(403);
    expect(res.headers.get("location")).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("allows /api/v1/* through without calling Supabase (API-key auth handles it)", async () => {
    const res = await middleware(makeReq("/api/v1/trends"));
    expect(res.headers.get("location")).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated user from / to /login", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await middleware(makeReq("/"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects unauthenticated user from /dashboard to /login", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await middleware(makeReq("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("passes through authenticated user (b2b_users check happens in page.tsx)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    const res = await middleware(makeReq("/dashboard"));
    expect(res.headers.get("location")).toBeNull();
  });
});
