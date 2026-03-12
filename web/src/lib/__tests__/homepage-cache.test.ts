import { describe, it, expect } from "vitest";

describe("Homepage caching", () => {
  it("exports revalidate instead of force-dynamic", async () => {
    // Dynamic import to get the module's exports
    const homepageModule = await import("@/app/page") as Record<string, unknown>;
    // Must NOT have force-dynamic
    expect(homepageModule.dynamic).toBeUndefined();
    // Must have revalidate for ISR
    expect(homepageModule.revalidate).toBe(60);
  });
});
