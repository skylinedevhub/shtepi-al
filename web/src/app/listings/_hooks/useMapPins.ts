"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { MapPin } from "@/lib/types";

interface UseMapPinsResult {
  mapListings: MapPin[];
  mapLoading: boolean;
  prefetchMapPins: () => void;
}

export function useMapPins(
  viewMode: "grid" | "map",
  searchParams: URLSearchParams
): UseMapPinsResult {
  const [mapListings, setMapListings] = useState<MapPin[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const mapPinsCacheRef = useRef<{ key: string; data: MapPin[] } | null>(null);

  const mapPinsCacheKey = useCallback((): string => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("sort");
    return params.toString();
  }, [searchParams]);

  const prefetchMapPins = useCallback((): void => {
    const key = mapPinsCacheKey();
    if (mapPinsCacheRef.current?.key === key) return;
    fetch(`/api/listings/map-pins?${key}`)
      .then((res) => res.json())
      .then((data: MapPin[]) => {
        mapPinsCacheRef.current = { key, data };
      })
      .catch(() => {});
  }, [mapPinsCacheKey]);

  useEffect(() => {
    if (viewMode !== "map") return;
    const filterKey = mapPinsCacheKey();

    if (mapPinsCacheRef.current?.key === filterKey) {
      setMapListings(mapPinsCacheRef.current.data);
      return;
    }

    setMapLoading(true);
    fetch(`/api/listings/map-pins?${filterKey}`)
      .then((res) => res.json())
      .then((data: MapPin[]) => {
        setMapListings(data);
        mapPinsCacheRef.current = { key: filterKey, data };
      })
      .catch(() => {})
      .finally(() => setMapLoading(false));
  }, [viewMode, mapPinsCacheKey]);

  return { mapListings, mapLoading, prefetchMapPins };
}
