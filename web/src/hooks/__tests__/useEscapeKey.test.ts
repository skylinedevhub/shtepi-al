// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEscapeKey } from "../useEscapeKey";

describe("useEscapeKey", () => {
  it("calls handler on Escape when enabled", () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler, true));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not call handler when disabled", () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler, false));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("ignores non-Escape keys", () => {
    const handler = vi.fn();
    renderHook(() => useEscapeKey(handler, true));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(handler).not.toHaveBeenCalled();
  });

  it("cleans up listener on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(handler, true));

    unmount();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(handler).not.toHaveBeenCalled();
  });
});
