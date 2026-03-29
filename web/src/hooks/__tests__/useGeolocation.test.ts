// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGeolocation } from "../useGeolocation";

describe("useGeolocation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("initial state: loading=false, position=null, error=null", () => {
    const { result } = renderHook(() => useGeolocation());
    expect(result.current.loading).toBe(false);
    expect(result.current.position).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets loading=true when locate() is called", () => {
    // Mock geolocation that never resolves
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn(),
      },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => {
      result.current.locate();
    });
    expect(result.current.loading).toBe(true);
  });

  it("sets position on geolocation success", () => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success({
            coords: { latitude: 41.33, longitude: 19.82 },
          } as GeolocationPosition);
        }),
      },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => {
      result.current.locate();
    });
    expect(result.current.position).toEqual([41.33, 19.82]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("sets error on geolocation failure (Albanian message)", () => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn(
          (_success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 1,
              message: "denied",
            } as GeolocationPositionError);
          }
        ),
      },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => {
      result.current.locate();
    });
    expect(result.current.error).toBe(
      "Nuk mundëm të gjejmë vendndodhjen tuaj"
    );
    expect(result.current.loading).toBe(false);
  });

  it("sets error when geolocation not supported (Albanian message)", () => {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => {
      result.current.locate();
    });
    expect(result.current.error).toBe(
      "Shfletuesi nuk mbështet vendndodhjen"
    );
    expect(result.current.loading).toBe(false);
  });

  it("resets error on subsequent successful call", () => {
    let callCount = 0;
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: vi.fn(
          (success: PositionCallback, error: PositionErrorCallback) => {
            callCount++;
            if (callCount === 1) {
              error({ code: 1, message: "denied" } as GeolocationPositionError);
            } else {
              success({
                coords: { latitude: 41.33, longitude: 19.82 },
              } as GeolocationPosition);
            }
          }
        ),
      },
      configurable: true,
    });

    const { result } = renderHook(() => useGeolocation());
    act(() => {
      result.current.locate();
    });
    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.locate();
    });
    expect(result.current.error).toBeNull();
    expect(result.current.position).toEqual([41.33, 19.82]);
  });
});
