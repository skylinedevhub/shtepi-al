// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/cn", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

const mockData = [
  { price: 75000, currency: "EUR", recorded_at: "2025-12-01T00:00:00Z" },
  { price: 72000, currency: "EUR", recorded_at: "2026-01-15T00:00:00Z" },
  { price: 70000, currency: "EUR", recorded_at: "2026-02-20T00:00:00Z" },
];

describe("PriceHistoryChart", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders SVG chart with data", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    // Dynamic import to ensure fetch mock is set first
    const { default: PriceHistoryChart } = await import("../PriceHistoryChart");
    const { container } = render(
      <PriceHistoryChart listingId="test-uuid-1234-5678-abcdefghijkl" />
    );

    await waitFor(() => {
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });

    // Should have a polyline (the chart line)
    const polyline = container.querySelector("polyline");
    expect(polyline).toBeTruthy();

    // Should have data point circles (3 data points = 3 visible + 3 hover targets)
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(6);

    // Should show section title
    expect(screen.getByText("Historiku i çmimit")).toBeTruthy();
  });

  it("renders nothing with empty data", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { default: PriceHistoryChart } = await import("../PriceHistoryChart");
    const { container } = render(
      <PriceHistoryChart listingId="test-uuid-1234-5678-abcdefghijkl" />
    );

    // Wait for fetch to resolve
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // No SVG should be rendered
    const svg = container.querySelector("svg");
    expect(svg).toBeNull();
  });

  it("renders nothing with single data point", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockData[0]]),
    });

    const { default: PriceHistoryChart } = await import("../PriceHistoryChart");
    const { container } = render(
      <PriceHistoryChart listingId="test-uuid-1234-5678-abcdefghijkl" />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const svg = container.querySelector("svg");
    expect(svg).toBeNull();
  });
});
