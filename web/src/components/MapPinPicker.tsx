"use client";

import { useState, useCallback } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  ALBANIAN_CITY_COORDS,
  ALBANIA_CENTER,
  CITY_ZOOM,
} from "@/lib/city-coords";

// Fix icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

interface MapPinPickerProps {
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  onChange: (lat: number, lng: number) => void;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPinPicker({ city, latitude, longitude, onChange }: MapPinPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    latitude != null && longitude != null ? [latitude, longitude] : null
  );

  const cityCoords = city ? ALBANIAN_CITY_COORDS[city] : null;
  const center: [number, number] = position ?? cityCoords ?? ALBANIA_CENTER;
  const zoom = position || cityCoords ? CITY_ZOOM : 7;

  const handleClick = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng]);
      onChange(lat, lng);
    },
    [onChange]
  );

  return (
    <div>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-[250px] w-full rounded-xl border border-warm-gray-light"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={handleClick} />
        {position && (
          <Marker
            position={position}
            draggable={true}
            eventHandlers={{
              dragend(e) {
                const marker = e.target as L.Marker;
                const latlng = marker.getLatLng();
                setPosition([latlng.lat, latlng.lng]);
                onChange(latlng.lat, latlng.lng);
              },
            }}
          />
        )}
      </MapContainer>
      <p className="mt-1 text-xs text-warm-gray">
        {position
          ? "Vendndodhja u caktua. Mund ta tërhiqni pikën për ta ndryshuar."
          : "Klikoni në hartë për të vendosur vendndodhjen."}
      </p>
    </div>
  );
}
