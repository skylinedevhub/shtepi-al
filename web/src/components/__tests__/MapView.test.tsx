// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";

// Shared mock spies so we can assert call counts across rerenders.
const fitBoundsSpy = vi.fn();
const setViewSpy = vi.fn();
const invalidateSizeSpy = vi.fn();
const sharedMap = { setView: setViewSpy, fitBounds: fitBoundsSpy, invalidateSize: invalidateSizeSpy };

vi.mock("leaflet", () => {
  const divIcon = vi.fn(() => ({}));
  const point = vi.fn((x: number, y: number) => ({ x, y }));
  const latLngBounds = vi.fn(() => ({
    extend: vi.fn(),
    isValid: () => true,
  }));
  return {
    default: {
      Icon: { Default: { prototype: {}, mergeOptions: vi.fn() } },
      divIcon,
      point,
      latLngBounds,
    },
    divIcon,
    point,
    latLngBounds,
  };
});

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="marker">{children}</div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  useMap: () => sharedMap,
}));

vi.mock("react-leaflet-cluster", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="cluster-group">{children}</div>
  ),
}));

vi.mock("@/lib/city-coords", () => ({
  ALBANIA_CENTER: [41.15, 20.17] as [number, number],
  ALBANIA_DEFAULT_ZOOM: 7,
}));

vi.mock("@/lib/seo/slugs", () => ({
  buildListingPath: (_title: string, city: string | null, id: string) =>
    `/listings/${city}/${id}`,
}));

import { render, screen } from "@testing-library/react";
import MapView from "../MapView";
import type { MapPin } from "@/lib/types";

function makeMapPin(overrides: Partial<MapPin> = {}): MapPin {
  return {
    id: "test-1",
    title: "Test Apartment",
    price: 100000,
    price_period: "total",
    room_config: "2+1",
    area_sqm: 80,
    city: "Tiranë",
    neighborhood: "Blloku",
    latitude: 41.32,
    longitude: 19.82,
    first_image: "https://example.com/img.jpg",
    ...overrides,
  };
}

describe("MapView", () => {
  it("renders the map container", () => {
    render(<MapView listings={[]} />);
    expect(screen.getByTestId("map-container")).toBeDefined();
  });

  it("renders markers for all pins", () => {
    const pins = [
      makeMapPin({ id: "1", latitude: 41.32, longitude: 19.82 }),
      makeMapPin({ id: "3", latitude: 41.33, longitude: 19.83 }),
    ];
    render(<MapView listings={pins} />);
    const markers = screen.getAllByTestId("marker");
    expect(markers).toHaveLength(2);
  });

  it("renders zero markers for empty listings", () => {
    render(<MapView listings={[]} />);
    expect(screen.queryAllByTestId("marker")).toHaveLength(0);
  });

  /**
   * Regression for the zoom-reset bug: re-rendering with the same listings
   * (different array reference, same content) must NOT call fitBounds again.
   * Otherwise the user's pan/zoom is destroyed on every parent state change.
   */
  it("calls fitBounds at most once for an unchanged pin set across rerenders", () => {
    fitBoundsSpy.mockClear();
    setViewSpy.mockClear();

    const pins = [
      makeMapPin({ id: "1", latitude: 41.32, longitude: 19.82 }),
      makeMapPin({ id: "2", latitude: 41.33, longitude: 19.83 }),
    ];
    const { rerender } = render(<MapView listings={pins} />);
    const initialFitCalls = fitBoundsSpy.mock.calls.length;

    // Force a re-render with a NEW array reference but identical contents.
    rerender(<MapView listings={[...pins]} />);
    rerender(<MapView listings={[...pins]} fitPaddingLeft={420} />);

    expect(fitBoundsSpy.mock.calls.length).toBe(initialFitCalls);
  });

  /**
   * When the actual pin set changes (filter change), the map should
   * re-fit exactly once.
   */
  it("calls fitBounds again when listing coordinates change", () => {
    fitBoundsSpy.mockClear();

    const initial = [
      makeMapPin({ id: "1", latitude: 41.32, longitude: 19.82 }),
      makeMapPin({ id: "2", latitude: 41.33, longitude: 19.83 }),
    ];
    const { rerender } = render(<MapView listings={initial} />);
    const callsAfterInitial = fitBoundsSpy.mock.calls.length;

    const next = [
      makeMapPin({ id: "3", latitude: 42.0, longitude: 20.0 }),
      makeMapPin({ id: "4", latitude: 42.1, longitude: 20.1 }),
    ];
    rerender(<MapView listings={next} />);

    expect(fitBoundsSpy.mock.calls.length).toBeGreaterThan(callsAfterInitial);
  });
});
