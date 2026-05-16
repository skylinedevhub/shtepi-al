"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

const PERIODS = [
  { id: "30", label: "1M" },
  { id: "90", label: "3M" },
  { id: "180", label: "6M" },
  { id: "365", label: "1Y" },
  { id: "730", label: "2Y" },
] as const;

const PROPERTY_TYPES = [
  { id: "", label: "Të gjitha" },
  { id: "apartment", label: "Apartament" },
  { id: "house", label: "Shtëpi" },
  { id: "land", label: "Truall" },
  { id: "commercial", label: "Komerciale" },
] as const;

export default function FilterRail({
  cities,
  city,
  transactionType,
  days,
  propertyType,
}: {
  cities: string[];
  city: string | null;
  transactionType: "sale" | "rent";
  days: number;
  propertyType: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params);
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const sortedCities = useMemo(() => [...cities].sort((a, b) => a.localeCompare(b, "sq")), [cities]);

  return (
    <aside className="w-60 shrink-0 border-r border-line bg-ink-900/60 flex flex-col">
      <div className="px-3 py-3 border-b border-line font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim">
        Filtra
      </div>

      <div className="overflow-y-auto px-3 py-4 space-y-5 flex-1">
        <Section title="Veprim">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              className={transactionType === "sale" ? "term-btn term-btn-on" : "term-btn"}
              onClick={() => setParam("tx", "sale")}
            >
              Shitje
            </button>
            <button
              className={transactionType === "rent" ? "term-btn term-btn-on" : "term-btn"}
              onClick={() => setParam("tx", "rent")}
            >
              Qira
            </button>
          </div>
        </Section>

        <Section title="Periudha">
          <div className="grid grid-cols-5 gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setParam("days", p.id)}
                className={
                  String(days) === p.id
                    ? "term-btn term-btn-on px-0 text-2xs"
                    : "term-btn px-0 text-2xs"
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Tipi i pronës">
          <div className="space-y-1">
            {PROPERTY_TYPES.map((pt) => (
              <button
                key={pt.id}
                onClick={() => setParam("pt", pt.id || null)}
                className={`w-full text-left px-2 py-1.5 rounded font-mono text-xs
                  border ${
                    propertyType === pt.id
                      ? "border-acc-mint/40 bg-acc-mint/10 text-acc-mint"
                      : "border-line bg-ink-700 text-fg-muted hover:text-fg hover:border-line-strong"
                  }`}
              >
                {pt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-2xs text-fg-dim leading-relaxed">
            Pamja e detajuar sipas tipit do të aktivizohet me snapshot-et e ardhshme.
          </p>
        </Section>

        <Section title="Qyteti">
          <button
            onClick={() => setParam("city", null)}
            className={`w-full text-left px-2 py-1.5 rounded font-mono text-xs mb-1
              border ${
                city === null
                  ? "border-acc-gold/40 bg-acc-gold/10 text-acc-gold"
                  : "border-line bg-ink-700 text-fg-muted hover:text-fg hover:border-line-strong"
              }`}
          >
            Mesatare kombëtare
          </button>
          <div className="max-h-60 overflow-y-auto pr-1 space-y-0.5">
            {sortedCities.map((c) => (
              <button
                key={c}
                onClick={() => setParam("city", c)}
                className={`w-full text-left px-2 py-1 rounded font-mono text-xs
                  ${
                    city === c
                      ? "bg-acc-mint/10 text-acc-mint"
                      : "text-fg-muted hover:text-fg hover:bg-ink-700"
                  }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="px-3 py-2.5 border-t border-line font-mono text-2xs text-fg-dim
        flex items-center justify-between">
        <span>22 qytete</span>
        <span className="text-acc-mint">●</span>
      </div>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim mb-2">{title}</h3>
      {children}
    </div>
  );
}
