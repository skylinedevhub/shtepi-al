// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";

// Mock leaflet and react-leaflet before importing the component
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
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn(), invalidateSize: vi.fn() }),
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
});
