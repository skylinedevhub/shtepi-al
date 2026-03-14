/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Works per Vercel serverless instance. Not distributed, but sufficient
 * for preventing brute-force attacks on auth endpoints.
 *
 * Usage:
 *   const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });
 *   const { success } = limiter.check(ip);
 */

interface RateLimitEntry {
  timestamps: number[];
}

interface RateLimiterConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
}

export function createRateLimiter(config: RateLimiterConfig) {
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup to prevent memory leaks (every 60s)
  let lastCleanup = Date.now();

  function cleanup() {
    const now = Date.now();
    if (now - lastCleanup < 60_000) return;
    lastCleanup = now;

    store.forEach((entry, key) => {
      entry.timestamps = entry.timestamps.filter(
        (t: number) => now - t < config.windowMs
      );
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    });
  }

  return {
    check(key: string): RateLimitResult {
      cleanup();

      const now = Date.now();
      const entry = store.get(key) ?? { timestamps: [] };

      // Remove expired timestamps
      entry.timestamps = entry.timestamps.filter(
        (t) => now - t < config.windowMs
      );

      if (entry.timestamps.length >= config.limit) {
        const oldestInWindow = entry.timestamps[0];
        return {
          success: false,
          remaining: 0,
          resetMs: oldestInWindow + config.windowMs - now,
        };
      }

      entry.timestamps.push(now);
      store.set(key, entry);

      return {
        success: true,
        remaining: config.limit - entry.timestamps.length,
        resetMs: config.windowMs,
      };
    },
  };
}

/** Get client IP from request headers (works on Vercel) */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
