"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import type { MapPin } from "@/lib/types";
import { buildListingPath } from "@/lib/seo/slugs";
import {
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
  listings: MapPin[];
  /** Extra left padding for fitBounds (e.g. width of an overlay panel). */
  fitPaddingLeft?: number;
}

function createClusterIcon(cluster: { getChildCount(): number }): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count > 50 ? 56 : count > 10 ? 48 : 40;
  const fontSize = count > 50 ? 16 : count > 10 ? 14 : 12;

  return L.divIcon({
    html: `<div style="
      width: ${size}px; height: ${size}px; border-radius: 50%;
      background: #1B2A4A; border: 3px solid #D4A843;
      display: flex; align-items: center; justify-content: center;
      color: #FDF8F0; font-weight: 700; font-size: ${fontSize}px;
      box-shadow: 0 4px 12px rgba(27,42,74,0.4);
    ">${count}</div>`,
    className: "cluster-marker",
    iconSize: L.point(size, size),
    iconAnchor: L.point(size / 2, size / 2),
  });
}

function FitBounds({ positions, paddingLeft = 0 }: { positions: [number, number][]; paddingLeft?: number }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    const bounds = L.latLngBounds(positions);
    // paddingTopLeft: [left, top], paddingBottomRight: [right, bottom]
    map.fitBounds(bounds, {
      paddingTopLeft: [paddingLeft + 40, 100],
      paddingBottomRight: [40, 40],
    });
  }, [map, positions, paddingLeft]);
  return null;
}

/** Forces Leaflet to recalculate container size after mount/resize. */
function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function ListingPopup({ listing }: { listing: MapPin }) {
  const img = listing.first_image;
  const price = listing.price
    ? `€${listing.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`
    : "Pa çmim";
  const suffix = listing.price_period === "monthly" ? "/muaj" : "";
  const details = [listing.room_config, listing.area_sqm ? `${listing.area_sqm} m²` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <a
      href={buildListingPath(listing.title, listing.city, listing.id)}
      style={{ display: "block", textDecoration: "none", color: "inherit", width: "100%", maxWidth: 220 }}
    >
      {img && (
        <img
          src={img}
          alt=""
          style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: "8px 8px 0 0" }}
        />
      )}
      <div style={{ padding: 10 }}>
        <div style={{ fontWeight: 700, color: "#1B2A4A", fontSize: 16 }}>
          {price}
          <span style={{ fontWeight: 400, color: "#8B8178", fontSize: 12 }}>{suffix}</span>
        </div>
        {details && (
          <div style={{ fontSize: 12, color: "#8B8178", marginTop: 4 }}>{details}</div>
        )}
        {listing.neighborhood && (
          <div style={{ fontSize: 12, color: "#8B8178", marginTop: 2 }}>{listing.neighborhood}</div>
        )}
      </div>
    </a>
  );
}

export default function MapView({ listings, fitPaddingLeft = 0 }: MapViewProps) {
  const positions: [number, number][] = listings.map((l) => [l.latitude, l.longitude]);

  return (
    <MapContainer
      center={ALBANIA_CENTER}
      zoom={ALBANIA_DEFAULT_ZOOM}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds positions={positions} paddingLeft={fitPaddingLeft} />
      <InvalidateSize />
      <MarkerClusterGroup iconCreateFunction={createClusterIcon} maxClusterRadius={60}>
        {listings.map((listing) => (
          <Marker key={listing.id} position={[listing.latitude, listing.longitude]}>
            <Popup maxWidth={240} minWidth={180}>
              <ListingPopup listing={listing} />
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
