"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Listing } from "@/lib/types";
import {
  ALBANIAN_CITY_COORDS,
  ALBANIA_CENTER,
  ALBANIA_DEFAULT_ZOOM,
} from "@/lib/city-coords";

// Fix Leaflet default icon paths (broken with bundlers)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapViewProps {
  listings: Listing[];
}

/**
 * Creates a custom Leaflet divIcon for a city marker.
 *
 * The icon is a navy circle with a gold border, showing the
 * listing count in cream text. Size scales with count.
 *
 * @param count — number of listings in this city
 * @returns L.DivIcon instance
 */
function createCityIcon(count: number): L.DivIcon {
  const size = count > 50 ? 56 : count > 10 ? 48 : 40;
  const fontSize = count > 50 ? 16 : count > 10 ? 14 : 12;

  return L.divIcon({
    className: "city-marker",
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: #1B2A4A;
        border: 3px solid #D4A843;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FDF8F0;
        font-weight: 700;
        font-size: ${fontSize}px;
        box-shadow: 0 4px 12px rgba(27, 42, 74, 0.4);
        cursor: pointer;
        transition: transform 0.2s;
      ">
        ${count}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

function FitBounds({ cities }: { cities: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (cities.length === 0) return;
    if (cities.length === 1) {
      map.setView(cities[0], 12);
      return;
    }
    const bounds = L.latLngBounds(cities.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, cities]);

  return null;
}

function CityPopup({ city, listings }: { city: string; listings: Listing[] }) {
  const preview = listings.slice(0, 3);

  return (
    <div style={{ fontFamily: "var(--font-dm-sans),system-ui,sans-serif" }}>
      <div style={{ padding: "12px 14px", background: "#1B2A4A", color: "#FDF8F0" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{city}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
          {listings.length} njoftime
        </div>
      </div>
      <div>
        {preview.map((l) => {
          const img = l.images[0];
          const price = l.price
            ? `€${l.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`
            : "Pa çmim";
          const suffix = l.price_period === "monthly" ? "/muaj" : "";
          const details = [l.room_config, l.area_sqm ? `${l.area_sqm} m²` : null]
            .filter(Boolean)
            .join(" · ");

          return (
            <a
              key={l.id}
              href={`/listings/${l.id}`}
              style={{
                display: "flex",
                gap: 10,
                padding: 10,
                borderBottom: "1px solid #F5EDE0",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              {img ? (
                <img
                  src={img}
                  alt=""
                  style={{
                    width: 64,
                    height: 48,
                    objectFit: "cover",
                    borderRadius: 8,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 48,
                    background: "#F5EDE0",
                    borderRadius: 8,
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "#1B2A4A", fontSize: 14 }}>
                  {price}
                  <span style={{ fontWeight: 400, color: "#8B8178", fontSize: 12 }}>
                    {suffix}
                  </span>
                </div>
                {details && (
                  <div style={{ fontSize: 12, color: "#8B8178", marginTop: 2 }}>
                    {details}
                  </div>
                )}
              </div>
            </a>
          );
        })}
      </div>
      <a
        href={`/listings?city=${encodeURIComponent(city)}`}
        style={{
          display: "block",
          textAlign: "center",
          padding: 10,
          fontSize: 13,
          fontWeight: 600,
          color: "#C75B39",
          textDecoration: "none",
        }}
      >
        {listings.length > 3 ? `Shiko të gjitha në ${city} →` : `Shiko në ${city} →`}
      </a>
    </div>
  );
}

export default function MapView({ listings }: MapViewProps) {
  // Group listings by city
  const cityGroups = new Map<string, Listing[]>();
  for (const listing of listings) {
    if (!listing.city) continue;
    const key = listing.city;
    if (!cityGroups.has(key)) cityGroups.set(key, []);
    cityGroups.get(key)!.push(listing);
  }

  // Build markers
  const markers: {
    city: string;
    coords: [number, number];
    listings: Listing[];
  }[] = [];

  Array.from(cityGroups.entries()).forEach(([city, cityListings]) => {
    const coords = ALBANIAN_CITY_COORDS[city];
    if (!coords) return;
    markers.push({ city, coords, listings: cityListings });
  });

  const markerCoords = markers.map((m) => m.coords);

  return (
    <MapContainer
      center={ALBANIA_CENTER}
      zoom={ALBANIA_DEFAULT_ZOOM}
      className="h-full w-full rounded-2xl"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds cities={markerCoords} />
      {markers.map((m) => (
        <Marker
          key={m.city}
          position={m.coords}
          icon={createCityIcon(m.listings.length)}
        >
          <Popup maxWidth={320} minWidth={280}>
            <CityPopup city={m.city} listings={m.listings} />
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
