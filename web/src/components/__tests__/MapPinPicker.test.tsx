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
    <div data-testid="pin-picker-map">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
  useMapEvents: () => null,
}));

vi.mock("@/lib/city-coords", () => ({
  ALBANIAN_CITY_COORDS: {
    Tiranë: [41.3275, 19.8187] as [number, number],
  },
  ALBANIA_CENTER: [41.15, 20.17] as [number, number],
  CITY_ZOOM: 13,
}));

import { render, screen } from "@testing-library/react";
import MapPinPicker from "../MapPinPicker";

describe("MapPinPicker", () => {
  it("renders map without marker when no initial position", () => {
    const onChange = vi.fn();
    render(<MapPinPicker onChange={onChange} />);
    expect(screen.getByTestId("pin-picker-map")).toBeDefined();
    expect(screen.queryByTestId("marker")).toBeNull();
  });

  it("renders marker when initial coordinates are provided", () => {
    const onChange = vi.fn();
    render(
      <MapPinPicker latitude={41.32} longitude={19.82} onChange={onChange} />
    );
    expect(screen.getByTestId("marker")).toBeDefined();
  });

  it("shows Albanian instruction text", () => {
    const onChange = vi.fn();
    render(<MapPinPicker onChange={onChange} />);
    expect(screen.getByText(/Klikoni në hartë/)).toBeDefined();
  });
});
