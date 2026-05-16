// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockGetB2bUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mockGetUser } }),
}));

vi.mock("@/lib/b2b-user", () => ({
  getB2bUser: (id: string) => mockGetB2bUser(id),
}));

import { middleware } from "./middleware";

function makeReq(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "http://localhost"), { headers });
}

describe("data-portal middleware", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetB2bUser.mockReset();
  });

  it("allows /login through anonymous", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await middleware(makeReq("/login"));
    expect(res.status).not.toBe(403);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated user from / to /login", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await middleware(makeReq("/"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("returns 403 for authenticated user not in b2b_users", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    mockGetB2bUser.mockResolvedValueOnce(null);
    const res = await middleware(makeReq("/dashboard"));
    expect(res.status).toBe(403);
  });

  it("passes through authenticated b2b user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
    mockGetB2bUser.mockResolvedValueOnce({
      userId: "u1",
      organization: "Bank of Albania",
      role: "viewer",
      planSlug: "intel-dashboard",
    });
    const res = await middleware(makeReq("/dashboard"));
    expect(res.status).not.toBe(403);
    expect(res.headers.get("location")).toBeNull();
  });
});
