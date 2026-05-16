"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip as LeafletTooltip,
  Marker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CityMetrics } from "@repo/analytics";
import { ALBANIAN_CITY_COORDS } from "@repo/analytics";
import { fmtEur, fmtInt, priceColor, radiusFor } from "./format";

const ALBANIA_CENTER: [number, number] = [41.0, 20.0];
const DEFAULT_ZOOM = 7;

// Selected-city icon (small terra crosshair) — uses a div icon for crispness.
const selectedIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:14px;height:14px;border-radius:9999px;
    background:transparent;border:2px solid #E07A4F;
    box-shadow:0 0 0 4px rgba(224,122,79,0.18), 0 0 14px rgba(224,122,79,0.55);
    transform:translate(-7px,-7px);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function ResetZoom({ city }: { city: string | null }) {
  const map = useMap();
  if (city) {
    const coords = ALBANIAN_CITY_COORDS[city];
    if (coords) {
      map.flyTo(coords, 10, { animate: true, duration: 0.6 });
    }
  } else {
    map.flyTo(ALBANIA_CENTER, DEFAULT_ZOOM, { animate: true, duration: 0.6 });
  }
  return null;
}

export default function MapPanel({
  cities,
  selectedCity,
}: {
  cities: CityMetrics[];
  selectedCity: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Compute color/size ranges from observed metrics
  const { minPrice, maxPrice, maxCount } = useMemo(() => {
    const prices = cities.map((c) => c.avg_price_sqm).filter((v): v is number => v !== null);
    const counts = cities.map((c) => c.total_listings);
    return {
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 1,
      maxCount: counts.length ? Math.max(...counts) : 1,
    };
  }, [cities]);

  function onSelect(city: string) {
    const next = new URLSearchParams(params);
    if (selectedCity === city) next.delete("city");
    else next.set("city", city);
    router.push(`${pathname}?${next.toString()}`);
  }

  const selectedCoords = selectedCity ? ALBANIAN_CITY_COORDS[selectedCity] : null;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapContainer
        center={ALBANIA_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <ResetZoom city={selectedCity} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains={["a", "b", "c", "d"]}
          maxZoom={19}
        />

        {cities.map((c) => {
          const coords = ALBANIAN_CITY_COORDS[c.city];
          if (!coords) return null;
          const fill = priceColor(c.avg_price_sqm, minPrice, maxPrice);
          const radius = radiusFor(c.total_listings, maxCount);
          const isSelected = c.city === selectedCity;
          return (
            <CircleMarker
              key={c.city}
              center={coords}
              radius={radius}
              pathOptions={{
                color: isSelected ? "#E07A4F" : fill,
                fillColor: fill,
                fillOpacity: isSelected ? 0.85 : 0.55,
                weight: isSelected ? 2 : 1,
                opacity: 0.9,
              }}
              eventHandlers={{ click: () => onSelect(c.city) }}
            >
              <LeafletTooltip
                direction="top"
                offset={[0, -radius - 2]}
                opacity={1}
                permanent={false}
              >
                <div className="font-mono text-xs">
                  <div className="text-fg font-semibold uppercase tracking-wider mb-1">
                    {c.city}
                  </div>
                  <div className="text-fg-muted">
                    €/m²:{" "}
                    <span className="text-acc-mint">
                      {c.avg_price_sqm ? `€${fmtEur(c.avg_price_sqm)}` : "—"}
                    </span>
                  </div>
                  <div className="text-fg-muted">
                    listings: <span className="text-fg">{fmtInt(c.total_listings)}</span>
                  </div>
                  <div className="text-fg-muted">
                    yield:{" "}
                    <span className="text-acc-gold">
                      {c.rent_yield !== null ? `${c.rent_yield.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                </div>
              </LeafletTooltip>
            </CircleMarker>
          );
        })}

        {selectedCoords && <Marker position={selectedCoords} icon={selectedIcon} interactive={false} />}
      </MapContainer>

      {/* Legend overlay */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400]
        bg-ink-800/85 border border-line backdrop-blur-md rounded px-3 py-2
        font-mono text-2xs uppercase tracking-wider">
        <div className="text-fg-dim mb-1">€/m² heat</div>
        <div
          className="h-1.5 w-40 rounded"
          style={{
            background:
              "linear-gradient(90deg,#26314F 0%,#5BC0DE 20%,#5EE6A0 45%,#F4B860 75%,#E07A4F 100%)",
          }}
        />
        <div className="flex justify-between text-fg-muted mt-1 tabular-nums">
          <span>€{fmtEur(minPrice)}</span>
          <span>€{fmtEur(maxPrice)}</span>
        </div>
      </div>

      {/* Crosshair branding */}
      <div className="pointer-events-none absolute top-3 right-3 z-[400]
        bg-ink-800/85 border border-line rounded px-2 py-1
        font-mono text-2xs uppercase tracking-wider text-fg-dim">
        Albania · 22 qendra
      </div>
    </div>
  );
}
