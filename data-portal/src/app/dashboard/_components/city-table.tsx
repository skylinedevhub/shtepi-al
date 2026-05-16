"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { CityMetrics } from "@repo/analytics";
import { fmtEur, fmtInt, fmtPct } from "./format";

type SortKey = keyof Pick<
  CityMetrics,
  "city" | "avg_price_sqm" | "median_price" | "total_listings" | "sale_count" | "rent_count" | "avg_rent_sqm" | "rent_yield"
>;

const COLUMNS: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "city", label: "Qyteti" },
  { key: "avg_price_sqm", label: "€/m²", align: "right" },
  { key: "median_price", label: "Median €", align: "right" },
  { key: "total_listings", label: "Listings", align: "right" },
  { key: "sale_count", label: "Shitje", align: "right" },
  { key: "rent_count", label: "Qira", align: "right" },
  { key: "avg_rent_sqm", label: "€/m² qira", align: "right" },
  { key: "rent_yield", label: "Yield", align: "right" },
];

export default function CityTable({
  cities,
  selectedCity,
}: {
  cities: CityMetrics[];
  selectedCity: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [sortKey, setSortKey] = useState<SortKey>("total_listings");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const filtered = query
      ? cities.filter((c) => c.city.toLowerCase().includes(query.toLowerCase()))
      : cities;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv, "sq") : bv.localeCompare(av, "sq");
      }
      return sortDir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
  }, [cities, sortKey, sortDir, query]);

  function selectCity(city: string) {
    const next = new URLSearchParams(params);
    if (selectedCity === city) next.delete("city");
    else next.set("city", city);
    router.push(`${pathname}?${next.toString()}`);
  }

  function clickHeader(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "city" ? "asc" : "desc");
    }
  }

  // Find max for inline bar chart
  const maxListings = useMemo(
    () => sorted.reduce((m, c) => Math.max(m, c.total_listings), 0),
    [sorted],
  );

  return (
    <section className="term-panel flex flex-col">
      <header className="term-panel-header">
        <span>
          Renditje qytetesh{" "}
          <span className="text-fg normal-case tracking-normal">({sorted.length})</span>
        </span>
        <input
          type="search"
          placeholder="kërko…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="font-mono text-2xs uppercase tracking-wider bg-ink-900 border border-line
            rounded px-2 py-1 w-32 placeholder:text-fg-dim focus:outline-none focus:border-acc-mint/40"
        />
      </header>
      <div className="overflow-auto max-h-[420px]">
        <table className="w-full text-xs font-mono tabular-nums">
          <thead className="sticky top-0 bg-ink-800 z-10">
            <tr className="border-b border-line">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => clickHeader(col.key)}
                  className={`px-3 py-2 uppercase text-2xs tracking-[0.16em] text-fg-dim font-normal
                    cursor-pointer select-none hover:text-fg
                    ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-acc-mint">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const isSelected = c.city === selectedCity;
              const bar = maxListings ? (c.total_listings / maxListings) * 100 : 0;
              return (
                <tr
                  key={c.city}
                  onClick={() => selectCity(c.city)}
                  className={`border-b border-line/40 cursor-pointer transition
                    ${
                      isSelected
                        ? "bg-acc-mint/8 text-fg"
                        : "hover:bg-ink-700/60 text-fg-muted hover:text-fg"
                    }`}
                >
                  <td className="px-3 py-1.5 text-left">
                    <div className="flex items-center gap-2">
                      <span className={isSelected ? "text-acc-mint" : "text-fg"}>{c.city}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right text-fg">
                    {c.avg_price_sqm ? `€${fmtEur(c.avg_price_sqm)}` : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {c.median_price ? `€${fmtEur(c.median_price)}` : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <span
                        className="block h-1 rounded bg-acc-gold/60"
                        style={{ width: `${Math.max(2, bar * 0.6)}px` }}
                        aria-hidden
                      />
                      <span className="text-fg">{fmtInt(c.total_listings)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right">{fmtInt(c.sale_count)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtInt(c.rent_count)}</td>
                  <td className="px-3 py-1.5 text-right">
                    {c.avg_rent_sqm ? `€${fmtEur(c.avg_rent_sqm, 2)}` : "—"}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right ${
                      c.rent_yield === null
                        ? "text-fg-dim"
                        : c.rent_yield >= 5
                          ? "text-acc-mint"
                          : c.rent_yield < 3
                            ? "text-acc-rose"
                            : "text-acc-gold"
                    }`}
                  >
                    {fmtPct(c.rent_yield)}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center text-fg-dim py-6">
                  Asnjë rezultat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
