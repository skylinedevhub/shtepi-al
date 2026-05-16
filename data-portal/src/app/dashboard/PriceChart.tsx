"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { TrendPoint } from "@repo/analytics";

export default function PriceChart({ points }: { points: TrendPoint[] }) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#8B817822" />
          <XAxis dataKey="period" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => `€${v.toLocaleString("sq-AL")}`}
            domain={["auto", "auto"]}
          />
          <Tooltip
            formatter={(v: number) => [`€${Math.round(v).toLocaleString("sq-AL")} / m²`, "Mesatarja"]}
            labelFormatter={(label: string) => `Data: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="avgPriceSqmEur"
            stroke="#C75B39"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
