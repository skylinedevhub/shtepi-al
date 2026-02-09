"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const CITIES = [
  "Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë",
  "Elbasan", "Fier", "Berat", "Lushnjë", "Kamëz", "Pogradec",
];

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartament" },
  { value: "house", label: "Shtëpi" },
  { value: "villa", label: "Vilë" },
  { value: "land", label: "Truall" },
  { value: "commercial", label: "Komercial" },
  { value: "garage", label: "Garazh" },
];

const SOURCES = ["merrjep", "celesi", "mirlir", "njoftime"];

interface FilterSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function FilterSidebar({ isOpen, onClose }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/listings?${params.toString()}`);
    },
    [router, searchParams]
  );

  const currentValue = (key: string) => searchParams.get(key) ?? "";

  const hasActiveFilters = Array.from(searchParams.entries()).some(
    ([key]) => !["sort", "page", "q"].includes(key)
  );

  function clearAll() {
    const q = searchParams.get("q");
    const sort = searchParams.get("sort");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sort) params.set("sort", sort);
    router.push(`/listings?${params.toString()}`);
  }

  const filterContent = (
    <div className="space-y-6">
      {/* Clear all */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Pastro filtrat
        </button>
      )}

      {/* Transaction type */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Lloji</h3>
        <div className="flex gap-2">
          {["sale", "rent"].map((t) => (
            <button
              key={t}
              aria-label={t === "sale" ? "Filtro shitje" : "Filtro qira"}
              onClick={() =>
                updateFilter(
                  "transaction_type",
                  currentValue("transaction_type") === t ? null : t
                )
              }
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                currentValue("transaction_type") === t
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {t === "sale" ? "Shitje" : "Qira"}
            </button>
          ))}
        </div>
      </div>

      {/* City */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Qyteti</h3>
        <select
          value={currentValue("city")}
          onChange={(e) => updateFilter("city", e.target.value || null)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Të gjitha</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Property type */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Lloji i pronës
        </h3>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((pt) => (
            <button
              key={pt.value}
              aria-label={`Filtro ${pt.label}`}
              onClick={() =>
                updateFilter(
                  "property_type",
                  currentValue("property_type") === pt.value ? null : pt.value
                )
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                currentValue("property_type") === pt.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Çmimi (EUR)
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={currentValue("price_min")}
            onChange={(e) =>
              updateFilter("price_min", e.target.value || null)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="number"
            placeholder="Max"
            value={currentValue("price_max")}
            onChange={(e) =>
              updateFilter("price_max", e.target.value || null)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Rooms */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Dhoma</h3>
        <div className="flex gap-2">
          {["0", "1", "2", "3", "4"].map((r) => (
            <button
              key={r}
              aria-label={r === "0" ? "Studio" : `${r} ose më shumë dhoma`}
              onClick={() =>
                updateFilter(
                  "rooms_min",
                  currentValue("rooms_min") === r ? null : r
                )
              }
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition ${
                currentValue("rooms_min") === r
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {r === "0" ? "S" : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Area range */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">
          Sipërfaqja (m²)
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={currentValue("area_min")}
            onChange={(e) =>
              updateFilter("area_min", e.target.value || null)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="number"
            placeholder="Max"
            value={currentValue("area_max")}
            onChange={(e) =>
              updateFilter("area_max", e.target.value || null)
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Source */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Burimi</h3>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <button
              key={s}
              aria-label={`Filtro nga ${s}`}
              onClick={() =>
                updateFilter(
                  "source",
                  currentValue("source") === s ? null : s
                )
              }
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                currentValue("source") === s
                  ? "bg-primary text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 md:block">
        {filterContent}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-80 overflow-y-auto bg-white p-5 shadow-xl transition-transform duration-300 md:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Filtra</h2>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Mbyll filtrat"
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {filterContent}
      </aside>
    </>
  );
}
