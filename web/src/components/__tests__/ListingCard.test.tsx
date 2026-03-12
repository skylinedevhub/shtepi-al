// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/image to capture props
const mockImageProps: Record<string, unknown>[] = [];
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    mockImageProps.push(props);
    return <img data-testid="next-image" />;
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/seo/slugs", () => ({
  buildListingPath: (_t: string, _c: string | null, id: string) => `/listings/test/${id}`,
}));

import { render } from "@testing-library/react";
import ListingCard from "../ListingCard";
import type { Listing } from "@/lib/types";

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: "test-1",
    title: "Test",
    description: null,
    price: 50000,
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
    source: "merrjep",
    source_url: "https://merrjep.al/1",
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

describe("ListingCard", () => {
  beforeEach(() => {
    mockImageProps.length = 0;
  });

  it("renders Image without unoptimized prop (enables Next.js optimization)", () => {
    render(<ListingCard listing={makeListing()} />);
    expect(mockImageProps.length).toBeGreaterThan(0);
    expect(mockImageProps[0].unoptimized).toBeFalsy();
  });

  it("uses lazy loading", () => {
    render(<ListingCard listing={makeListing()} />);
    expect(mockImageProps[0].loading).toBe("lazy");
  });

  it("sets appropriate sizes prop", () => {
    render(<ListingCard listing={makeListing()} />);
    expect(mockImageProps[0].sizes).toBeDefined();
  });
});
