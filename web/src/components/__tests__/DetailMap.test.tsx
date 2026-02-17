// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";

vi.mock("leaflet", () => ({
  default: {
    Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
  },
}));

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="detail-map">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
}));

import { render, screen } from "@testing-library/react";
import DetailMap from "../DetailMap";

describe("DetailMap", () => {
  it("renders map with marker at given coordinates", () => {
    render(<DetailMap latitude={41.3275} longitude={19.8187} />);
    expect(screen.getByTestId("detail-map")).toBeDefined();
    expect(screen.getByTestId("marker")).toBeDefined();
  });

  it("renders exactly one marker", () => {
    render(<DetailMap latitude={41.3275} longitude={19.8187} />);
    expect(screen.getAllByTestId("marker")).toHaveLength(1);
  });
});
