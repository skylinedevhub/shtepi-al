"use client";

import { useState, useEffect } from "react";
import type { CityMetrics, MarketOverview } from "@/lib/analytics/market";

export default function DataDashboardPage() {
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cityData, setCityData] = useState<{
    metrics: CityMetrics | null;
    price_distribution: { bucket: string; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/market")
      .then((r) => {
        if (!r.ok) throw new Error("Gabim gjatë ngarkimit.");
        return r.json();
      })
      .then(setOverview)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCity) {
      setCityData(null);
      return;
    }
    fetch(`/api/analytics/market?city=${encodeURIComponent(selectedCity)}`)
      .then((r) => r.json())
      .then(setCityData)
      .catch(() => setCityData(null));
  }, [selectedCity]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream px-4 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 h-8 w-64 animate-pulse rounded bg-navy/10" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cream px-4 py-8">
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-8 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const maxListings = Math.max(...overview.cities.map((c) => c.total_listings), 1);

  return (
    <div className="min-h-screen bg-cream px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-navy">
            Dashboard i tregut
          </h1>
          <p className="text-sm text-warm-gray">
            Përditësuar: {new Date(overview.generated_at).toLocaleDateString("sq-AL")}
          </p>
        </div>

        {/* National summary cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Njoftime aktive"
            value={overview.total_listings.toLocaleString("de-DE")}
          />
          <MetricCard
            label="Çmimi mesatar €/m²"
            value={
              overview.national_avg_price_sqm
                ? `€${overview.national_avg_price_sqm.toLocaleString("de-DE")}`
                : "–"
            }
            highlight
          />
          <MetricCard
            label="Qytete të monitoruara"
            value={String(overview.cities.length)}
          />
        </div>

        {/* City comparison */}
        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display text-xl font-bold text-navy">
            Krahasimi i qyteteve
          </h2>
          <div className="space-y-3">
            {overview.cities.slice(0, 15).map((city) => (
              <button
                key={city.city}
                onClick={() =>
                  setSelectedCity(
                    selectedCity === city.city ? null : city.city
                  )
                }
                className={`flex w-full items-center gap-4 rounded-lg p-3 text-left transition ${
                  selectedCity === city.city
                    ? "bg-navy/5 ring-1 ring-navy/20"
                    : "hover:bg-cream"
                }`}
              >
                <span className="w-28 flex-shrink-0 text-sm font-medium text-navy">
                  {city.city}
                </span>
                <div className="flex-1">
                  <div
                    className="h-5 rounded-full bg-navy/80"
                    style={{
                      width: `${(city.total_listings / maxListings) * 100}%`,
                      minWidth: "8px",
                    }}
                  />
                </div>
                <div className="flex w-48 flex-shrink-0 gap-4 text-right text-xs text-warm-gray">
                  <span>{city.total_listings} nj.</span>
                  <span>
                    {city.avg_price_sqm
                      ? `€${city.avg_price_sqm}/m²`
                      : "–"}
                  </span>
                  <span>
                    {city.rent_yield != null
                      ? `${city.rent_yield}% yield`
                      : "–"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* City detail panel */}
        {selectedCity && cityData?.metrics && (
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display text-xl font-bold text-navy">
              {selectedCity}
            </h2>
            <div className="mb-6 grid gap-4 sm:grid-cols-4">
              <MiniStat
                label="Çmimi €/m²"
                value={
                  cityData.metrics.avg_price_sqm
                    ? `€${cityData.metrics.avg_price_sqm}`
                    : "–"
                }
              />
              <MiniStat
                label="Çmimi mesatar"
                value={
                  cityData.metrics.median_price
                    ? `€${cityData.metrics.median_price.toLocaleString("de-DE")}`
                    : "–"
                }
              />
              <MiniStat
                label="Shitje"
                value={String(cityData.metrics.sale_count)}
              />
              <MiniStat
                label="Qira"
                value={String(cityData.metrics.rent_count)}
              />
            </div>

            {/* Price distribution */}
            {cityData.price_distribution.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium text-navy">
                  Shpërndarja e çmimeve (shitje)
                </h3>
                <div className="flex items-end gap-2" style={{ height: 120 }}>
                  {cityData.price_distribution.map((b) => {
                    const maxCount = Math.max(
                      ...cityData.price_distribution.map((x) => x.count),
                      1
                    );
                    const height = (b.count / maxCount) * 100;
                    return (
                      <div
                        key={b.bucket}
                        className="flex flex-1 flex-col items-center"
                      >
                        <span className="mb-1 text-[10px] text-warm-gray">
                          {b.count}
                        </span>
                        <div
                          className="w-full rounded-t bg-gold/70"
                          style={{ height: `${height}%`, minHeight: 4 }}
                        />
                        <span className="mt-1 text-[10px] text-warm-gray">
                          {b.bucket}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl bg-white p-5 shadow-sm ${
        highlight ? "ring-1 ring-gold/30" : ""
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-warm-gray">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold ${
          highlight ? "text-gold" : "text-navy"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-cream p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-warm-gray">
        {label}
      </p>
      <p className="text-lg font-bold text-navy">{value}</p>
    </div>
  );
}
