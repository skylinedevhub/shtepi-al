import { fmtEur, fmtInt } from "./format";
import type { CityMetrics } from "@repo/analytics";

interface TickerItem {
  label: string;
  value: string;
  tone?: "neutral" | "up" | "down" | "warn";
}

export default function TickerTape({
  totalListings,
  nationalAvg,
  cities,
}: {
  totalListings: number;
  nationalAvg: number | null;
  cities: CityMetrics[];
}) {
  const items: TickerItem[] = [
    { label: "Listings", value: fmtInt(totalListings) },
    { label: "Avg €/m² (kombëtare)", value: nationalAvg ? `€${fmtEur(nationalAvg)}` : "—", tone: "up" },
    {
      label: "Qytete me të dhëna",
      value: fmtInt(cities.length),
    },
    ...cities
      .filter((c) => c.avg_price_sqm !== null)
      .slice(0, 12)
      .map((c) => ({
        label: c.city,
        value: c.avg_price_sqm ? `€${fmtEur(c.avg_price_sqm)}/m²` : "—",
        tone: "neutral" as const,
      })),
    ...cities
      .filter((c) => c.rent_yield !== null)
      .slice(0, 6)
      .map((c) => ({
        label: `${c.city} yield`,
        value: c.rent_yield ? `${c.rent_yield.toFixed(1)}%` : "—",
        tone: (c.rent_yield ?? 0) >= 5 ? ("up" as const) : ("down" as const),
      })),
  ];

  // Duplicate for seamless marquee
  const doubled = [...items, ...items];

  return (
    <div className="h-8 border-b border-line bg-ink-800/70 overflow-hidden relative">
      <div className="absolute inset-y-0 left-0 z-10 px-3 flex items-center bg-ink-800
        border-r border-line font-mono text-2xs uppercase tracking-[0.18em] text-acc-gold">
        Markete
      </div>
      <div className="absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-ink-800 to-transparent pointer-events-none" />
      <div className="h-full flex items-center gap-8 pl-24 pr-12 animate-marquee whitespace-nowrap will-change-transform">
        {doubled.map((it, idx) => (
          <span key={idx} className="font-mono text-xs flex items-center gap-2">
            <span className="text-fg-dim uppercase tracking-wider text-2xs">{it.label}</span>
            <span
              className={
                it.tone === "up"
                  ? "text-acc-mint"
                  : it.tone === "down"
                    ? "text-acc-rose"
                    : it.tone === "warn"
                      ? "text-acc-gold"
                      : "text-fg"
              }
            >
              {it.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
