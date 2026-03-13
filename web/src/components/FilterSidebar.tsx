"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { CITIES, PROPERTY_TYPES } from "@/lib/constants";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import { cn } from "@/lib/cn";

const SOURCES = [
  "merrjep", "celesi", "mirlir", "njoftime", "duashpi",
  "shpi", "indomio", "century21", "realestate", "propertyhub",
  "kerko360", "homezone", "futurehome",
];

interface FilterSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  /** When true, only render the mobile drawer (skip desktop aside). Used in map mode. */
  mobileOnly?: boolean;
  /** When true, renders as a slide-in drawer on ALL screen sizes (not just mobile). Used in immersive map mode. */
  alwaysDrawer?: boolean;
}

export default function FilterSidebar({ isOpen, onClose, mobileOnly, alwaysDrawer }: FilterSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useBodyScrollLock(!!isOpen);
  useEscapeKey(onClose ?? (() => {}), !!isOpen);

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
          className="w-full cursor-pointer rounded-btn border border-warm-gray-light px-3 py-2 text-sm font-medium text-navy transition hover:bg-cream-dark"
        >
          Pastro filtrat
        </button>
      )}

      {/* Transaction type */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">Lloji</h3>
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
              className={cn(
                "cursor-pointer rounded-btn px-4 py-2 text-sm font-medium transition",
                currentValue("transaction_type") === t
                  ? "bg-terracotta text-white shadow-sm"
                  : "bg-cream-dark text-navy hover:bg-warm-gray-light/50"
              )}
            >
              {t === "sale" ? "Shitje" : "Qira"}
            </button>
          ))}
        </div>
      </div>

      {/* City */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">Qyteti</h3>
        <select
          value={currentValue("city")}
          onChange={(e) => updateFilter("city", e.target.value || null)}
          className="w-full rounded-btn border border-warm-gray-light px-3 py-2 text-sm focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
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
        <h3 className="mb-2 text-sm font-semibold text-navy">
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
              className={cn(
                "cursor-pointer rounded-btn px-3 py-1.5 text-xs font-medium transition",
                currentValue("property_type") === pt.value
                  ? "bg-terracotta text-white shadow-sm"
                  : "bg-cream-dark text-navy hover:bg-warm-gray-light/50"
              )}
            >
              {pt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">
          Çmimi (EUR)
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            aria-label="Cmimi minimum (EUR)"
            value={currentValue("price_min")}
            onChange={(e) =>
              updateFilter("price_min", e.target.value || null)
            }
            className="w-full rounded-btn border border-warm-gray-light px-3 py-2 text-sm focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          />
          <input
            type="number"
            placeholder="Max"
            aria-label="Cmimi maksimum (EUR)"
            value={currentValue("price_max")}
            onChange={(e) =>
              updateFilter("price_max", e.target.value || null)
            }
            className="w-full rounded-btn border border-warm-gray-light px-3 py-2 text-sm focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          />
        </div>
      </div>

      {/* Rooms */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">Dhoma</h3>
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
              className={cn(
                "flex size-10 cursor-pointer items-center justify-center rounded-btn text-sm font-medium transition",
                currentValue("rooms_min") === r
                  ? "bg-terracotta text-white shadow-sm"
                  : "bg-cream-dark text-navy hover:bg-warm-gray-light/50"
              )}
            >
              {r === "0" ? "S" : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Area range */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">
          Sipërfaqja (m²)
        </h3>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            aria-label="Siperfaqja minimale (m²)"
            value={currentValue("area_min")}
            onChange={(e) =>
              updateFilter("area_min", e.target.value || null)
            }
            className="w-full rounded-btn border border-warm-gray-light px-3 py-2 text-sm focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          />
          <input
            type="number"
            placeholder="Max"
            aria-label="Siperfaqja maksimale (m²)"
            value={currentValue("area_max")}
            onChange={(e) =>
              updateFilter("area_max", e.target.value || null)
            }
            className="w-full rounded-btn border border-warm-gray-light px-3 py-2 text-sm focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
          />
        </div>
      </div>

      {/* Source */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">Burimi</h3>
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
              className={cn(
                "cursor-pointer rounded-btn px-3 py-1.5 text-xs font-medium transition",
                currentValue("source") === s
                  ? "bg-terracotta text-white shadow-sm"
                  : "bg-cream-dark text-navy hover:bg-warm-gray-light/50"
              )}
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
      {/* Desktop sidebar — skip in mobileOnly or alwaysDrawer mode */}
      {!mobileOnly && !alwaysDrawer && (
        <aside className="hidden w-64 shrink-0 md:block">
          {filterContent}
        </aside>
      )}

      {/* Drawer overlay — transition opacity */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm transition-opacity duration-300",
          !alwaysDrawer && "md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        id="filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Filtrat"
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] overflow-y-auto bg-cream p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl transition-transform duration-300",
          !alwaysDrawer && "md:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-navy">Filtra</h2>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Mbyll filtrat"
              className="rounded-lg p-2 text-warm-gray transition hover:bg-cream-dark"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
