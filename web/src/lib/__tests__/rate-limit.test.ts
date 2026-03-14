import { describe, it, expect } from "vitest";
import { createRateLimiter, getClientIp } from "../rate-limit";

describe("createRateLimiter", () => {
  it("allows requests within limit", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(limiter.check("ip1").success).toBe(true);
    expect(limiter.check("ip1").success).toBe(true);
    expect(limiter.check("ip1").success).toBe(true);
  });

  it("blocks requests exceeding limit", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    limiter.check("ip1");
    limiter.check("ip1");
    const result = limiter.check("ip1");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks IPs independently", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(limiter.check("ip1").success).toBe(true);
    expect(limiter.check("ip2").success).toBe(true);
    expect(limiter.check("ip1").success).toBe(false);
    expect(limiter.check("ip2").success).toBe(false);
  });

  it("returns remaining count", () => {
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000 });
    expect(limiter.check("ip1").remaining).toBe(2);
    expect(limiter.check("ip1").remaining).toBe(1);
    expect(limiter.check("ip1").remaining).toBe(0);
  });
});

describe("getClientIp", () => {
  it("extracts from x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp(headers)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "9.8.7.6" });
    expect(getClientIp(headers)).toBe("9.8.7.6");
  });

  it("returns unknown when no IP headers", () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe("unknown");
  });
});
