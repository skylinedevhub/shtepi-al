"use client";

import dynamic from "next/dynamic";
import type { CityMetrics } from "@repo/analytics";

const MapPanel = dynamic(() => import("./map-panel"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-ink-900
      font-mono text-2xs uppercase tracking-[0.2em] text-fg-dim">
      Loading map…
    </div>
  ),
});

export default function MapLoader(props: {
  cities: CityMetrics[];
  selectedCity: string | null;
}) {
  return <MapPanel {...props} />;
}
