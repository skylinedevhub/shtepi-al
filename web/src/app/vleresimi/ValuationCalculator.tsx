"use client";

import { useState, useEffect } from "react";
import type { CadastralZone, ValuationResult } from "@/lib/valuation/types";
import { VALUATION_PROPERTY_TYPES } from "@/lib/valuation/types";

export default function ValuationCalculator() {
  const [zones, setZones] = useState<CadastralZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zkNumer, setZkNumer] = useState("");
  const [zoneSearch, setZoneSearch] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [buildYear, setBuildYear] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [propertyNo, setPropertyNo] = useState("");
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/valuation/zones")
      .then((r) => r.json())
      .then((d) => setZones(d.zones ?? []))
      .catch(() => setError("Nuk mundem te ngarkojme zonat kadastrale"))
      .finally(() => setZonesLoading(false));
  }, []);

  const filteredZones = zoneSearch
    ? zones.filter((z) =>
        z.display_label.toLowerCase().includes(zoneSearch.toLowerCase())
      )
    : zones;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/valuation/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zk_numer: Number(zkNumer),
          area_sqm: Number(areaSqm),
          build_year: Number(buildYear),
          property_type: propertyType,
          property_no: propertyNo || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gabim i panjohur");
        return;
      }
      setResult(data);
    } catch {
      setError("Gabim ne lidhje me serverin");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-cream-dark bg-white px-3 py-2.5 text-sm text-navy outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20";
  const labelClass = "block text-sm font-medium text-navy mb-1";

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-cream-dark bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="zone-search" className={labelClass}>
            Zona Kadastrale
          </label>
          <input
            id="zone-search"
            type="text"
            placeholder={
              zonesLoading ? "Duke ngarkuar..." : "Kerko zone..."
            }
            value={zoneSearch}
            onChange={(e) => setZoneSearch(e.target.value)}
            className={inputClass}
            disabled={zonesLoading}
          />
          <select
            value={zkNumer}
            onChange={(e) => setZkNumer(e.target.value)}
            className={`${inputClass} mt-2`}
            required
            size={5}
            aria-label="Zgjidhni zonen kadastrale"
          >
            <option value="">Zgjidhni zonen</option>
            {filteredZones.map((z) => (
              <option key={z.zk_numer} value={z.zk_numer}>
                {z.display_label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="property-no" className={labelClass}>
            Nr. Prone (opsional)
          </label>
          <input
            id="property-no"
            type="text"
            value={propertyNo}
            onChange={(e) => setPropertyNo(e.target.value)}
            className={inputClass}
            placeholder="p.sh. 123/45"
          />
        </div>

        <div>
          <label htmlFor="area" className={labelClass}>
            Siperfaqja (m²)
          </label>
          <input
            id="area"
            type="number"
            step="0.01"
            min="0.01"
            value={areaSqm}
            onChange={(e) => setAreaSqm(e.target.value)}
            className={inputClass}
            required
            placeholder="p.sh. 100"
          />
        </div>

        <div>
          <label htmlFor="build-year" className={labelClass}>
            Viti i Ndertimit
          </label>
          <input
            id="build-year"
            type="number"
            min="1900"
            max={new Date().getFullYear() + 5}
            value={buildYear}
            onChange={(e) => setBuildYear(e.target.value)}
            className={inputClass}
            required
            placeholder="p.sh. 2010"
          />
        </div>

        <div>
          <label htmlFor="prop-type" className={labelClass}>
            Tipi i Prones
          </label>
          <select
            id="prop-type"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">Zgjidhni tipin</option>
            {Object.entries(VALUATION_PROPERTY_TYPES).map(([key, info]) => (
              <option key={key} value={key}>
                {info.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div
            className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-press w-full rounded-btn bg-terracotta px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-terracotta-dark disabled:opacity-50"
        >
          {submitting ? "Duke llogaritur..." : "Llogarit Vleren"}
        </button>
      </form>

      {/* Results */}
      <div className="space-y-6">
        {result && (
          <div className="rounded-xl border border-cream-dark bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-display text-xl font-bold text-navy">
              Rezultati
            </h2>

            <div className="mb-4 rounded-lg bg-green-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-green-600">
                Vlera e Tregut
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-green-700">
                {Math.round(result.market_value).toLocaleString("sq-AL")} Lek
              </p>
            </div>

            <div className="mb-4 rounded-lg bg-blue-50 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
                Vlera e References
              </p>
              <p className="mt-1 font-display text-xl font-bold text-blue-700">
                {Math.round(result.reference_value).toLocaleString("sq-AL")}{" "}
                Lek
              </p>
            </div>

            {result.suggestion && (
              <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {result.suggestion}
              </div>
            )}

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-warm-gray hover:text-navy">
                Detaje te llogaritjes
              </summary>
              <div className="mt-3 space-y-2 text-sm text-warm-gray">
                <div className="flex justify-between">
                  <span>Cmimi baze</span>
                  <span>
                    {result.breakdown.base_price.toLocaleString("sq-AL")}{" "}
                    Lek/m²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Koeficienti i tipit</span>
                  <span>{result.breakdown.type_coef}</span>
                </div>
                <div className="flex justify-between">
                  <span>Koeficienti i pozicionit</span>
                  <span>{result.breakdown.position_coef}</span>
                </div>
                <div className="flex justify-between">
                  <span>Koeficienti i amortizimit</span>
                  <span>{result.breakdown.depreciation_coef}</span>
                </div>
                <hr className="border-cream-dark" />
                <div className="flex justify-between font-medium text-navy">
                  <span>Cmimi i rregulluar/m²</span>
                  <span>
                    {Math.round(
                      result.breakdown.price_m2_adjusted
                    ).toLocaleString("sq-AL")}{" "}
                    Lek/m²
                  </span>
                </div>
              </div>
            </details>
          </div>
        )}

        {!result && !error && (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-cream-dark bg-cream/30 p-12 text-center">
            <p className="text-sm text-warm-gray">
              Plotesoni formularin per te marre vleresimin e prones
            </p>
          </div>
        )}

        <div className="rounded-lg bg-cream/50 px-4 py-3 text-xs text-warm-gray">
          <strong>Kujdes:</strong> Ky llogarites eshte orientues dhe bazohet ne
          te dhenat kadastrale zyrtare. Vlerat e llogaritura nuk perbejne
          vlersim zyrtar te certifikuar.
        </div>
      </div>
    </div>
  );
}
