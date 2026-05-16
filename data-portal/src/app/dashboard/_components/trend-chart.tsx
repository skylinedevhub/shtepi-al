"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import type { TrendPoint } from "@repo/analytics";
import { fmtEur, fmtInt } from "./format";

type Series = "price" | "median" | "count";

const SERIES_DEFS: Record<Series, { label: string; color: string }> = {
  price: { label: "Avg €/m²", color: "#5EE6A0" },
  median: { label: "Median €", color: "#5BC0DE" },
  count: { label: "Listings", color: "#F4B860" },
};

export default function TrendChart({
  points,
  scope,
  transactionType,
}: {
  points: TrendPoint[];
  scope: string;
  transactionType: "sale" | "rent";
}) {
  const [active, setActive] = useState<Record<Series, boolean>>({
    price: true,
    median: false,
    count: true,
  });

  const data = useMemo(
    () =>
      points.map((p) => ({
        period: p.period,
        priceLabel: new Date(p.period).toLocaleDateString("sq-AL", {
          month: "short",
          day: "2-digit",
        }),
        price: p.avgPriceSqmEur,
        median: p.medianPriceEur,
        count: p.listingCount,
      })),
    [points],
  );

  // Trend stats
  const stats = useMemo(() => {
    const valid = data.filter((d) => d.price !== null);
    if (valid.length < 2) return null;
    const first = valid[0].price!;
    const last = valid[valid.length - 1].price!;
    const change = last - first;
    const pct = first > 0 ? (change / first) * 100 : 0;
    const peakPoint = valid.reduce((max, d) => ((d.price ?? 0) > (max.price ?? 0) ? d : max), valid[0]);
    return { first, last, change, pct, peak: peakPoint };
  }, [data]);

  function toggle(s: Series) {
    setActive((a) => ({ ...a, [s]: !a[s] }));
  }

  return (
    <section className="term-panel flex flex-col h-full min-h-[280px]">
      <header className="term-panel-header">
        <div className="flex items-center gap-3">
          <span>Trendi i çmimit</span>
          <span className="text-fg normal-case tracking-normal">
            {scope}
          </span>
          <span className="text-fg-dim">
            · {transactionType === "sale" ? "shitje" : "qira"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(["price", "median", "count"] as const).map((s) => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={
                active[s]
                  ? "term-chip term-chip-on"
                  : "term-chip hover:border-line-strong hover:text-fg"
              }
              style={
                active[s]
                  ? {
                      borderColor: SERIES_DEFS[s].color + "60",
                      color: SERIES_DEFS[s].color,
                      backgroundColor: SERIES_DEFS[s].color + "1A",
                    }
                  : undefined
              }
            >
              {SERIES_DEFS[s].label}
            </button>
          ))}
        </div>
      </header>

      {/* Stat strip */}
      {stats && (
        <div className="px-3 py-2 border-b border-line/60 flex items-center gap-6 font-mono text-2xs">
          <span className="text-fg-dim uppercase tracking-wider">
            Δ periudhë:{" "}
            <span
              className={
                stats.change > 0
                  ? "text-acc-mint"
                  : stats.change < 0
                    ? "text-acc-rose"
                    : "text-fg"
              }
            >
              {stats.change > 0 ? "+" : ""}
              €{fmtEur(stats.change)} ({stats.pct >= 0 ? "+" : ""}
              {stats.pct.toFixed(2)}%)
            </span>
          </span>
          <span className="text-fg-dim uppercase tracking-wider">
            Maks:{" "}
            <span className="text-acc-gold tabular-nums">
              €{fmtEur(stats.peak.price ?? 0)}
            </span>{" "}
            <span className="text-fg-dim normal-case tracking-normal">
              ({stats.peak.priceLabel})
            </span>
          </span>
          <span className="text-fg-dim uppercase tracking-wider">
            Pikat:{" "}
            <span className="text-fg tabular-nums">{fmtInt(data.length)}</span>
          </span>
        </div>
      )}

      <div className="flex-1 p-2">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-fg-dim font-mono text-xs uppercase tracking-wider">
            Të dhëna të pamjaftueshme për këtë periudhë.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5EE6A0" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#5EE6A0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1F2A44" strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="priceLabel"
                stroke="#5A6A8A"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={{ stroke: "#1F2A44" }}
                minTickGap={24}
              />
              <YAxis
                yAxisId="left"
                stroke="#5A6A8A"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `€${fmtEur(v)}`}
                width={64}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#5A6A8A"
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => fmtInt(v)}
                width={40}
              />
              <Tooltip
                cursor={{ stroke: "#2C3A5C", strokeDasharray: "2 4" }}
                contentStyle={{
                  background: "rgba(15, 22, 40, 0.96)",
                  border: "1px solid #1F2A44",
                  borderRadius: 6,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "#E2E8F0",
                }}
                labelStyle={{ color: "#8FA0BD", textTransform: "uppercase", fontSize: 10, letterSpacing: 1 }}
                formatter={(value, name) => {
                  const num = typeof value === "number" ? value : null;
                  if (num === null) return ["—", String(name)];
                  if (name === "count") return [fmtInt(num), "Listings"];
                  return [`€${fmtEur(num)}`, name === "price" ? "Avg €/m²" : "Median €"];
                }}
              />
              {stats && (
                <ReferenceLine
                  yAxisId="left"
                  y={stats.first}
                  stroke="#2C3A5C"
                  strokeDasharray="2 4"
                />
              )}
              {active.count && (
                <Bar
                  yAxisId="right"
                  dataKey="count"
                  fill="#F4B86033"
                  stroke="#F4B86077"
                  strokeWidth={1}
                />
              )}
              {active.price && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="price"
                  stroke="#5EE6A0"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#5EE6A0", stroke: "#070A14", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              )}
              {active.median && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="median"
                  stroke="#5BC0DE"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
