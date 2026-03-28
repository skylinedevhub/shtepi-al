"use client";

import { useEffect, useState } from "react";

interface PriceHistoryEntry {
  price: number;
  currency: string;
  recorded_at: string;
}

interface PriceHistoryChartProps {
  listingId: string;
}

// Chart layout constants
const W = 600;
const H = 220;
const PAD = { top: 20, right: 20, bottom: 40, left: 60 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function formatPrice(p: number): string {
  if (p >= 1_000_000) return `€${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000) return `€${(p / 1_000).toFixed(0)}k`;
  return `€${p.toFixed(0)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("sq-AL", { day: "numeric", month: "short" });
}

export default function PriceHistoryChart({ listingId }: PriceHistoryChartProps) {
  const [data, setData] = useState<PriceHistoryEntry[] | null>(null);

  useEffect(() => {
    fetch(`/api/listings/${listingId}/price-history`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setData(d))
      .catch(() => setData([]));
  }, [listingId]);

  // Don't render until loaded, or if fewer than 2 data points
  if (!data || data.length < 2) return null;

  const prices = data.map((d) => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  // Add 10% padding to Y range
  const yMin = minP - range * 0.1;
  const yMax = maxP + range * 0.1;
  const yRange = yMax - yMin;

  const times = data.map((d) => new Date(d.recorded_at).getTime());
  const tMin = times[0];
  const tMax = times[times.length - 1];
  const tRange = tMax - tMin || 1;

  // Map data to SVG coordinates
  const points = data.map((d, i) => ({
    x: PAD.left + ((times[i] - tMin) / tRange) * PLOT_W,
    y: PAD.top + (1 - (d.price - yMin) / yRange) * PLOT_H,
    price: d.price,
    date: d.recorded_at,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Y-axis ticks (4-5 ticks)
  const yTicks: number[] = [];
  const step = yRange / 4;
  for (let i = 0; i <= 4; i++) {
    yTicks.push(yMin + step * i);
  }

  // X-axis labels: first, middle, last
  const xLabels = [
    { i: 0, label: formatDate(data[0].recorded_at) },
    ...(data.length > 2
      ? [{ i: Math.floor(data.length / 2), label: formatDate(data[Math.floor(data.length / 2)].recorded_at) }]
      : []),
    { i: data.length - 1, label: formatDate(data[data.length - 1].recorded_at) },
  ];

  return (
    <div className="mt-6">
      <h2 className="font-display text-lg font-semibold text-navy">
        Historiku i çmimit
      </h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-warm-gray-light/40 bg-white p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Grafiku i historikut të çmimit"
        >
          {/* Grid lines */}
          {yTicks.map((tick, i) => {
            const y = PAD.top + (1 - (tick - yMin) / yRange) * PLOT_H;
            return (
              <g key={`yt-${i}`}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="#E8E3DD"
                  strokeDasharray="4,4"
                />
                <text
                  x={PAD.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#8B8178"
                  fontSize="11"
                >
                  {formatPrice(tick)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {xLabels.map(({ i, label }) => (
            <text
              key={`xl-${i}`}
              x={points[i].x}
              y={H - 8}
              textAnchor="middle"
              fill="#8B8178"
              fontSize="11"
            >
              {label}
            </text>
          ))}

          {/* Area fill under the line */}
          <polygon
            points={`${points[0].x},${PAD.top + PLOT_H} ${polyline} ${points[points.length - 1].x},${PAD.top + PLOT_H}`}
            fill="#1B2A4A"
            fillOpacity={0.05}
          />

          {/* Line */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#1B2A4A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((p, i) => (
            <g key={`pt-${i}`}>
              <circle cx={p.x} cy={p.y} r="5" fill="white" stroke="#C75B39" strokeWidth="2.5" />
              {/* Hover target — larger invisible circle */}
              <circle cx={p.x} cy={p.y} r="12" fill="transparent">
                <title>
                  {formatDate(p.date)}: {formatPrice(p.price)}
                </title>
              </circle>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
