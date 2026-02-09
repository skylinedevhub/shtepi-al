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
      params.delete("page"); // reset pagination on filter change
      router.push(`/listings?${params.toString()}`);
    },
    [router, searchParams]
  );

  const currentValue = (key: string) => searchParams.get(key) ?? "";

  return (
    <aside
      className={`${isOpen ? "fixed inset-0 z-50 bg-white p-4 md:relative md:inset-auto md:z-auto md:bg-transparent md:p-0" : "hidden md:block"} w-full md:w-64 shrink-0 space-y-6`}
    >
      {/* Mobile close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="mb-4 text-sm text-blue-600 md:hidden"
        >
          Mbyll filtrat
        </button>
      )}

      {/* Transaction type */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Lloji</h3>
        <div className="flex gap-2">
          {["sale", "rent"].map((t) => (
            <button
              key={t}
              onClick={() =>
                updateFilter(
                  "transaction_type",
                  currentValue("transaction_type") === t ? null : t
                )
              }
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                currentValue("transaction_type") === t
                  ? "bg-blue-600 text-white"
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
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
              onClick={() =>
                updateFilter(
                  "property_type",
                  currentValue("property_type") === pt.value ? null : pt.value
                )
              }
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                currentValue("property_type") === pt.value
                  ? "bg-blue-600 text-white"
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            value={currentValue("price_max")}
            onChange={(e) =>
              updateFilter("price_max", e.target.value || null)
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
              onClick={() =>
                updateFilter(
                  "rooms_min",
                  currentValue("rooms_min") === r ? null : r
                )
              }
              className={`flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition ${
                currentValue("rooms_min") === r
                  ? "bg-blue-600 text-white"
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
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            value={currentValue("area_max")}
            onChange={(e) =>
              updateFilter("area_max", e.target.value || null)
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
              onClick={() =>
                updateFilter(
                  "source",
                  currentValue("source") === s ? null : s
                )
              }
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                currentValue("source") === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
