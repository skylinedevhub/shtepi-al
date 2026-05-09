"use client";

import { memo, useEffect, useMemo, useRef } from "react";
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
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

export interface BBox {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
}

interface MapViewProps {
  listings: MapPin[];
  /** Extra left padding for fitBounds (e.g. width of an overlay panel). */
  fitPaddingLeft?: number;
  /** External center override (e.g. from geolocation). */
  externalCenter?: [number, number];
  /** Zoom level when externalCenter is set. */
  externalZoom?: number;
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

/**
 * Auto-fits the map view to the given pin set exactly once per identity.
 * "Identity" = the sorted, comma-joined string of (lat,lng) tuples. So:
 *   - filter change → new pin set → fits once
 *   - parent re-render with same pins → does nothing
 *   - paddingLeft change (panel toggle) → does nothing
 * This is the fix for the bug where zoom/pan kept resetting.
 */
function FitBoundsOnce({
  positions,
  paddingLeft,
}: {
  positions: [number, number][];
  paddingLeft: number;
}) {
  const map = useMap();
  const lastFittedKey = useRef<string | null>(null);
  const paddingLeftRef = useRef(paddingLeft);
  paddingLeftRef.current = paddingLeft;

  useEffect(() => {
    if (positions.length === 0) {
      lastFittedKey.current = null;
      return;
    }

    const key = positions
      .map((p) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`)
      .sort()
      .join("|");
    if (lastFittedKey.current === key) return;
    lastFittedKey.current = key;

    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }
    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, {
      paddingTopLeft: [paddingLeftRef.current + 40, 100],
      paddingBottomRight: [40, 40],
    });
  }, [map, positions]);

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

function SetExternalView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

function MapViewInner({
  listings,
  fitPaddingLeft = 0,
  externalCenter,
  externalZoom,
}: MapViewProps) {
  const positions = useMemo<[number, number][]>(
    () => listings.map((l) => [l.latitude, l.longitude]),
    [listings]
  );

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
      <FitBoundsOnce positions={positions} paddingLeft={fitPaddingLeft} />
      <InvalidateSize />
      {externalCenter && <SetExternalView center={externalCenter} zoom={externalZoom ?? 14} />}
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

const MapView = memo(MapViewInner);
export default MapView;
