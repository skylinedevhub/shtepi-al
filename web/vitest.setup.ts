import { vi } from "vitest";

// React cache() only exists in RSC runtime — provide identity fallback for tests
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: actual.cache ?? (<T extends (...args: unknown[]) => unknown>(fn: T) => fn),
  };
});
