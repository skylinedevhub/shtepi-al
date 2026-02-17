// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBodyScrollLock } from "../useBodyScrollLock";

describe("useBodyScrollLock", () => {
  beforeEach(() => {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.overflow = "";
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
    window.scrollTo = vi.fn();
  });

  it("locks body scroll when enabled", () => {
    renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("does nothing when disabled", () => {
    renderHook(() => useBodyScrollLock(false));
    expect(document.body.style.position).toBe("");
    expect(document.body.style.overflow).toBe("");
  });

  it("restores scroll position on cleanup", () => {
    Object.defineProperty(window, "scrollY", { value: 150, writable: true });
    const { unmount } = renderHook(() => useBodyScrollLock(true));

    expect(document.body.style.top).toBe("-150px");

    unmount();
    expect(document.body.style.position).toBe("");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 150);
  });
});
