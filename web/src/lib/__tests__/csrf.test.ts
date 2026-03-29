import { describe, it, expect } from "vitest";
import { validateCsrf } from "../csrf";
import { NextRequest } from "next/server";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    method: "POST",
    headers,
  });
}

describe("validateCsrf", () => {
  it("allows same-origin requests via origin header", () => {
    const req = makeRequest({
      host: "localhost:3000",
      origin: "http://localhost:3000",
    });
    expect(validateCsrf(req)).toBeNull();
  });

  it("blocks cross-origin requests", () => {
    const req = makeRequest({
      host: "localhost:3000",
      origin: "http://evil.com",
    });
    const result = validateCsrf(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("allows same-origin via referer when no origin", () => {
    const req = makeRequest({
      host: "localhost:3000",
      referer: "http://localhost:3000/listings",
    });
    expect(validateCsrf(req)).toBeNull();
  });

  it("blocks cross-origin referer", () => {
    const req = makeRequest({
      host: "localhost:3000",
      referer: "http://evil.com/attack",
    });
    const result = validateCsrf(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("allows requests with no origin or referer (same-origin browser behavior)", () => {
    const req = makeRequest({ host: "localhost:3000" });
    expect(validateCsrf(req)).toBeNull();
  });

  it("blocks cross-origin even when only origin is present", () => {
    const req = makeRequest({
      host: "shtepi.al",
      origin: "http://evil.com",
    });
    const result = validateCsrf(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
