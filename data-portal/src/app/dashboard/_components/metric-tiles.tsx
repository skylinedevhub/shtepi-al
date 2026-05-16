import { fmtEur, fmtInt, fmtPct } from "./format";
import type { CityMetrics, MarketOverview } from "@repo/analytics";

interface Props {
  selected: CityMetrics | null;
  overview: MarketOverview;
  transactionType: "sale" | "rent";
}

interface Tile {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "up" | "down" | "warn";
}

export default function MetricTiles({ selected, overview, transactionType }: Props) {
  const scope = selected ? selected.city : "Mesatare kombëtare";

  // National rollup metrics (computed from overview)
  const totalSale = overview.cities.reduce((a, c) => a + c.sale_count, 0);
  const totalRent = overview.cities.reduce((a, c) => a + c.rent_count, 0);

  // Weighted avg rent yield
  const yields = overview.cities.filter((c) => c.rent_yield !== null && c.sale_count > 0);
  const avgYield =
    yields.length > 0
      ? yields.reduce((a, c) => a + (c.rent_yield ?? 0) * c.sale_count, 0) /
        Math.max(1, yields.reduce((a, c) => a + c.sale_count, 0))
      : null;

  const tiles: Tile[] = selected
    ? [
        {
          label: "Çmim mes. / m²",
          value: selected.avg_price_sqm ? `€${fmtEur(selected.avg_price_sqm)}` : "—",
          hint: transactionType === "sale" ? "shitje" : "qira",
          tone: "up",
        },
        {
          label: "Mediana e çmimit",
          value: selected.median_price ? `€${fmtEur(selected.median_price)}` : "—",
        },
        {
          label: "Listings (aktive)",
          value: fmtInt(selected.total_listings),
          hint: `${fmtInt(selected.sale_count)} S · ${fmtInt(selected.rent_count)} Q`,
        },
        {
          label: "Renta vjetore",
          value: fmtPct(selected.rent_yield),
          tone:
            selected.rent_yield === null
              ? "neutral"
              : selected.rent_yield >= 5
                ? "up"
                : selected.rent_yield < 3
                  ? "down"
                  : "warn",
        },
        {
          label: "Çmim qiraje / m²",
          value: selected.avg_rent_sqm ? `€${fmtEur(selected.avg_rent_sqm, 2)}` : "—",
          hint: "muaj",
        },
        {
          label: "Pesha kombëtare",
          value: overview.total_listings
            ? fmtPct((selected.total_listings / overview.total_listings) * 100)
            : "—",
          hint: "% e listings",
        },
      ]
    : [
        {
          label: "Çmim mes. / m²",
          value: overview.national_avg_price_sqm
            ? `€${fmtEur(overview.national_avg_price_sqm)}`
            : "—",
          hint: "shitje · ponderuar",
          tone: "up",
        },
        {
          label: "Total listings",
          value: fmtInt(overview.total_listings),
          hint: `${fmtInt(totalSale)} S · ${fmtInt(totalRent)} Q`,
        },
        {
          label: "Qytete me të dhëna",
          value: fmtInt(overview.cities.length),
          hint: "/ 22",
        },
        {
          label: "Renta vjetore mes.",
          value: fmtPct(avgYield),
          tone:
            avgYield === null
              ? "neutral"
              : avgYield >= 5
                ? "up"
                : avgYield < 3
                  ? "down"
                  : "warn",
          hint: "ponderuar",
        },
      ];

  return (
    <section className="term-panel">
      <header className="term-panel-header">
        <span>
          Metrika <span className="text-fg">{scope}</span>
        </span>
        <span className="text-fg-dim">
          {transactionType === "sale" ? "shitje" : "qira"}
        </span>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-line/40">
        {tiles.map((t) => (
          <div key={t.label} className="bg-ink-800 p-3 flex flex-col gap-1">
            <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
              {t.label}
            </span>
            <span
              className={`font-mono text-lg tabular-nums leading-tight ${
                t.tone === "up"
                  ? "text-acc-mint"
                  : t.tone === "down"
                    ? "text-acc-rose"
                    : t.tone === "warn"
                      ? "text-acc-gold"
                      : "text-fg"
              }`}
            >
              {t.value}
            </span>
            {t.hint && (
              <span className="font-mono text-2xs text-fg-dim uppercase tracking-wider">
                {t.hint}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
