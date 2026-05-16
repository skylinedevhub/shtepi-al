import { ALBANIAN_CITY_COORDS } from "./cities";

const EARTH_RADIUS_KM = 6371;
const DEFAULT_MAX_KM = 25;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface NearestCity {
  city: string;
  distanceKm: number;
}

export function getCityFromCoords(
  lat: number | null | undefined,
  lng: number | null | undefined,
  maxKm: number = DEFAULT_MAX_KM,
): NearestCity | null {
  if (lat == null || lng == null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;

  let best: NearestCity | null = null;
  for (const [city, [cLat, cLng]] of Object.entries(ALBANIAN_CITY_COORDS)) {
    const d = haversineKm(lat, lng, cLat, cLng);
    if (d <= maxKm && (best === null || d < best.distanceKm)) {
      best = { city, distanceKm: d };
    }
  }
  return best;
}
