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
  useMap: () => ({ setView: vi.fn(), fitBounds: vi.fn() }),
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
  buildListingPath: (_title: string, city: string, id: string) =>
    `/listings/${city}/${id}`,
}));

import { render, screen } from "@testing-library/react";
import MapView from "../MapView";
import type { Listing } from "@/lib/types";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "test-1",
    title: "Test Apartment",
    description: null,
    price: 100000,
    price_all: null,
    currency_original: "EUR",
    price_period: "total",
    transaction_type: "sale",
    property_type: "apartment",
    room_config: "2+1",
    area_sqm: 80,
    area_net_sqm: null,
    floor: 3,
    total_floors: 8,
    rooms: 2,
    bathrooms: 1,
    city: "Tiranë",
    neighborhood: "Blloku",
    address_raw: null,
    latitude: 41.32,
    longitude: 19.82,
    images: ["https://example.com/img.jpg"],
    image_count: 1,
    source: "test",
    source_url: "https://test.al/1",
    source_id: "1",
    poster_name: null,
    poster_phone: null,
    poster_type: "private",
    is_active: true,
    first_seen: "2026-01-01",
    last_seen: "2026-01-01",
    created_at: "2026-01-01",
    has_elevator: null,
    has_parking: null,
    is_furnished: null,
    is_new_build: null,
    ...overrides,
  };
}

describe("MapView", () => {
  it("renders the map container", () => {
    render(<MapView listings={[]} />);
    expect(screen.getByTestId("map-container")).toBeDefined();
  });

  it("renders markers only for listings with coordinates", () => {
    const listings = [
      makeListing({ id: "1", latitude: 41.32, longitude: 19.82 }),
      makeListing({ id: "2", latitude: null, longitude: null }),
      makeListing({ id: "3", latitude: 41.33, longitude: 19.83 }),
    ];
    render(<MapView listings={listings} />);
    const markers = screen.getAllByTestId("marker");
    expect(markers).toHaveLength(2);
  });

  it("renders zero markers for empty listings", () => {
    render(<MapView listings={[]} />);
    expect(screen.queryAllByTestId("marker")).toHaveLength(0);
  });

  it("renders zero markers when all listings lack coordinates", () => {
    const listings = [
      makeListing({ id: "1", latitude: null, longitude: null }),
      makeListing({ id: "2", latitude: null, longitude: null }),
    ];
    render(<MapView listings={listings} />);
    expect(screen.queryAllByTestId("marker")).toHaveLength(0);
  });
});
