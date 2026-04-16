"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import ListingCard from "@/components/ListingCard";
import FilterSidebar from "@/components/FilterSidebar";
import SearchBar from "@/components/SearchBar";
import type { BBox } from "@/components/MapView";
import { useGeolocation } from "@/hooks/useGeolocation";
import { cn } from "@/lib/cn";
import { CITIES } from "@/lib/constants";
import { SkeletonCard } from "./_components/SkeletonCard";
import { EmptyState } from "./_components/EmptyState";
import { FetchErrorState } from "./_components/FetchErrorState";
import { ViewToggle } from "./_components/ViewToggle";
import { SortSelect } from "./_components/SortSelect";
import { useListingsFetch } from "./_hooks/useListingsFetch";
import { useMapPins } from "./_hooks/useMapPins";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const MD_BREAKPOINT = "(min-width: 768px)";
const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(MD_BREAKPOINT);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
};
const getSnapshot = () => window.matchMedia(MD_BREAKPOINT).matches;
const getServerSnapshot = () => true;
function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function ListingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [panelOpen, setPanelOpen] = useState(true);
  const [mapBbox, setMapBbox] = useState<BBox | null>(null);
  const isDesktop = useIsDesktop();
  const geo = useGeolocation();

  const { listings, total, loading, fetchError, page, hasMore, loadMore, retry } =
    useListingsFetch(searchParams);
  const { mapListings, mapLoading, prefetchMapPins } =
    useMapPins(viewMode, searchParams, mapBbox);

  const currentSort = searchParams.get("sort") ?? "newest";

  // Preload Leaflet chunk on mount so it's ready when user switches to map
  useEffect(() => {
    import("@/components/MapView");
  }, []);

  function handleSort(value: string): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`/listings?${params.toString()}`);
  }

  // Count active filters (excluding sort and page)
  const activeFilterCount = Array.from(searchParams.entries()).filter(
    ([key]) => !["sort", "page", "q"].includes(key)
  ).length;

  const limit = 24;
  const showingEnd = (page - 1) * limit + listings.length;

  // Quick filter helpers (used by map overlay chips)
  const currentValue = (key: string) => searchParams.get(key) ?? "";
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

  /* ───────────────────────────────────────────────
   *  MAP MODE — immersive full-viewport layout
   * ─────────────────────────────────────────────── */
  if (viewMode === "map") {
    return (
      <>
        <div
          className="relative overflow-hidden"
          style={{ height: "calc(100dvh - 4.0625rem)" }}
        >
          {/* Map fills entire viewport */}
          <div className="absolute inset-0 z-0">
            <MapView
              listings={mapListings}
              fitPaddingLeft={isDesktop && panelOpen ? 420 : 0}
              onBoundsChange={setMapBbox}
              externalCenter={geo.position ?? undefined}
              externalZoom={14}
            />
          </div>

          {/* Map loading indicator */}
          {mapLoading && (
            <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
              <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
                <svg className="size-4 animate-spin text-terracotta" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium text-navy">Duke ngarkuar hartën...</span>
              </div>
            </div>
          )}

          {/* Geolocation error toast */}
          {geo.error && (
            <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2">
              <div className="rounded-full bg-red-600/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md">
                {geo.error}
              </div>
            </div>
          )}

          {/* ── Overlay layer ── flex column so panel flows below controls */}
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
            {/* ── Top controls ── */}
            <div className="shrink-0 p-3 md:p-4">
              {/* Row 1: Search + action buttons */}
              <div className="flex items-center gap-2">
                <div className="pointer-events-auto min-w-0 max-w-xl flex-1">
                  <SearchBar />
                </div>
                <div className="pointer-events-auto flex shrink-0 items-center gap-2">
                  <div className="relative hidden sm:block">
                    <SortSelect
                      value={currentSort}
                      onChange={handleSort}
                      className="cursor-pointer appearance-none rounded-full border border-warm-gray-light/30 bg-white/90 py-2.5 pl-3 pr-7 text-sm text-navy shadow-sm backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                    />
                    <svg className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-warm-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <button
                    onClick={() => setViewMode("grid")}
                    aria-label="Shfaq si rrjetë"
                    className="rounded-full border border-warm-gray-light/30 bg-white/90 p-2.5 text-navy shadow-sm backdrop-blur-md transition hover:bg-white"
                  >
                    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Row 2: Quick filter chips */}
              <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                {/* Transaction type */}
                {(["sale", "rent"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      updateFilter(
                        "transaction_type",
                        currentValue("transaction_type") === t ? null : t
                      )
                    }
                    className={cn(
                      "pointer-events-auto shrink-0 cursor-pointer rounded-full px-3.5 py-2 text-sm font-medium shadow-sm transition",
                      currentValue("transaction_type") === t
                        ? "bg-terracotta text-white"
                        : "border border-warm-gray-light/30 bg-white/90 text-navy backdrop-blur-md hover:bg-white"
                    )}
                  >
                    {t === "sale" ? "Shitje" : "Qira"}
                  </button>
                ))}

                {/* City dropdown — wrapper for custom arrow */}
                <div className="pointer-events-auto relative shrink-0">
                  <select
                    value={currentValue("city")}
                    onChange={(e) => updateFilter("city", e.target.value || null)}
                    aria-label="Zgjidh qytetin"
                    className={cn(
                      "cursor-pointer appearance-none rounded-full py-2 pl-3.5 pr-7 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-terracotta/20",
                      currentValue("city")
                        ? "bg-terracotta text-white"
                        : "border border-warm-gray-light/30 bg-white/90 text-navy backdrop-blur-md hover:bg-white"
                    )}
                  >
                    <option value="">Qyteti</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <svg
                    className={cn(
                      "pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2",
                      currentValue("city") ? "text-white/80" : "text-warm-gray"
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Near me button */}
                <button
                  onClick={geo.locate}
                  disabled={geo.loading}
                  className={cn(
                    "pointer-events-auto shrink-0 cursor-pointer rounded-full px-3.5 py-2 text-sm font-medium shadow-sm transition",
                    geo.position
                      ? "bg-terracotta text-white"
                      : "border border-warm-gray-light/30 bg-white/90 text-navy backdrop-blur-md hover:bg-white"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {geo.loading ? (
                      <svg className="size-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                    Pranë meje
                  </span>
                </button>

                {/* Rooms — desktop only */}
                <div className="hidden items-center gap-1.5 md:flex">
                  {["0", "1", "2", "3", "4"].map((r) => (
                    <button
                      key={r}
                      onClick={() =>
                        updateFilter(
                          "rooms_min",
                          currentValue("rooms_min") === r ? null : r
                        )
                      }
                      aria-label={r === "0" ? "Studio" : `${r} ose më shumë dhoma`}
                      className={cn(
                        "pointer-events-auto flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-medium shadow-sm transition",
                        currentValue("rooms_min") === r
                          ? "bg-terracotta text-white"
                          : "border border-warm-gray-light/30 bg-white/90 text-navy backdrop-blur-md hover:bg-white"
                      )}
                    >
                      {r === "0" ? "S" : `${r}+`}
                    </button>
                  ))}
                </div>

                {/* More filters button */}
                <button
                  onClick={() => setFiltersOpen(true)}
                  aria-expanded={filtersOpen}
                  aria-controls="filter-drawer"
                  className="pointer-events-auto relative shrink-0 cursor-pointer rounded-full border border-warm-gray-light/30 bg-white/90 px-3.5 py-2 text-sm font-medium text-navy shadow-sm backdrop-blur-md transition hover:bg-white"
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Filtra
                  </span>
                  {activeFilterCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* ── Desktop listings panel ── */}
            <div className="relative min-h-0 flex-1">
            <div
              className={cn(
                "absolute bottom-4 left-4 top-2 hidden w-96 transition-transform duration-300 ease-in-out md:block",
                panelOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]"
              )}
            >
              <div className="pointer-events-auto flex h-full flex-col rounded-2xl border border-warm-gray-light/30 bg-white/95 shadow-xl backdrop-blur-xl">
                {/* Panel header */}
                <div className="flex shrink-0 items-center justify-between border-b border-warm-gray-light/20 px-4 py-3">
                  <p className="text-sm font-medium text-navy">
                    {total > 0
                      ? `${total.toLocaleString()} njoftime`
                      : "Duke ngarkuar..."}
                  </p>
                  <button
                    onClick={() => setPanelOpen(false)}
                    aria-label="Mbyll panelin"
                    className="cursor-pointer rounded-lg p-1.5 text-warm-gray transition hover:bg-cream-dark hover:text-navy"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Scrollable cards */}
                <div className="flex-1 overflow-y-auto p-3">
                  <div className="space-y-3">
                    {loading && listings.length === 0 ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCard key={i} />
                      ))
                    ) : listings.length === 0 ? (
                      <p className="py-8 text-center text-sm text-warm-gray">
                        Nuk u gjetën njoftime
                      </p>
                    ) : (
                      <>
                        {listings.map((listing) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            variant="compact"
                          />
                        ))}
                        {hasMore && (
                          <button
                            onClick={loadMore}
                            disabled={loading}
                            className="btn-press w-full cursor-pointer rounded-btn bg-terracotta px-4 py-2 text-sm font-medium text-white transition hover:bg-terracotta-dark disabled:opacity-50"
                          >
                            {loading ? "Duke ngarkuar..." : "Shfaq më shumë"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel re-open button (when collapsed) */}
            {!panelOpen && (
              <button
                onClick={() => setPanelOpen(true)}
                className="pointer-events-auto absolute left-4 top-2 hidden cursor-pointer items-center gap-2 rounded-xl border border-warm-gray-light/30 bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-xl transition hover:bg-white md:flex"
              >
                <svg
                  className="size-5 text-navy"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                <span className="text-sm font-medium text-navy">
                  {total > 0 ? total.toLocaleString() : "..."}
                </span>
              </button>
            )}

            {/* ── Mobile bottom strip ── */}
            <div className="absolute bottom-0 left-0 right-0 md:hidden">
              <div className="pointer-events-auto border-t border-warm-gray-light/20 bg-white/95 shadow-[0_-4px_20px_rgba(27,42,74,0.1)] backdrop-blur-xl">
                {/* Count + sort */}
                <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
                  <p className="text-xs font-medium text-navy">
                    {total > 0
                      ? `${total.toLocaleString()} njoftime`
                      : "Duke ngarkuar..."}
                  </p>
                  <SortSelect
                    value={currentSort}
                    onChange={handleSort}
                    className="cursor-pointer appearance-none rounded-full border-none bg-transparent px-1 py-0.5 text-xs text-warm-gray focus:outline-none sm:hidden"
                  />
                </div>
                {/* Horizontal scroll cards */}
                <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  {listings.map((listing) => (
                    <div key={listing.id} className="w-56 shrink-0">
                      <ListingCard listing={listing} variant="compact" />
                    </div>
                  ))}
                  {hasMore && (
                    <div className="flex w-32 shrink-0 items-center justify-center">
                      <button
                        onClick={loadMore}
                        disabled={loading}
                        className="cursor-pointer rounded-btn bg-terracotta px-3 py-2 text-xs font-medium text-white transition hover:bg-terracotta-dark disabled:opacity-50"
                      >
                        {loading ? "..." : "Më shumë"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>{/* close flex-1 wrapper */}
          </div>
        </div>

        {/* Filter drawer (works on all screen sizes in map mode) */}
        <FilterSidebar
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          alwaysDrawer
        />
      </>
    );
  }

  /* ───────────────────────────────────────────────
   *  GRID MODE — standard listings layout
   * ─────────────────────────────────────────────── */
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Top bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <SearchBar />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle
            viewMode={viewMode}
            onGrid={() => setViewMode("grid")}
            onMap={() => setViewMode("map")}
            onMapHover={prefetchMapPins}
          />

          <SortSelect
            value={currentSort}
            onChange={handleSort}
            className="min-w-0 cursor-pointer rounded-btn border border-warm-gray-light bg-white px-2 py-2.5 text-xs text-navy focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20 sm:px-3 sm:text-sm"
          />
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
            aria-controls="filter-drawer"
            className="relative cursor-pointer rounded-btn border border-warm-gray-light px-4 py-2.5 text-sm font-medium text-navy transition hover:bg-cream-dark md:hidden"
          >
            Filtra
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        <FilterSidebar
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        />

        <div className="flex-1">
          {/* Results summary */}
          <div className="mb-4 flex items-center justify-between" role="status" aria-live="polite">
            <p className="text-sm text-warm-gray">
              {total > 0 ? (
                <>
                  Duke shfaqur 1–{showingEnd} nga{" "}
                  <span className="font-medium text-navy">{total.toLocaleString()}</span>{" "}
                  njoftime
                </>
              ) : loading ? (
                "Duke ngarkuar..."
              ) : (
                "0 njoftime"
              )}
            </p>
          </div>

          {fetchError && listings.length === 0 ? (
            <FetchErrorState onRetry={retry} />
          ) : loading && listings.length === 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <EmptyState onClear={() => router.push("/listings")} />
          ) : (
            <>
              <div className="stagger-children grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="btn-press cursor-pointer rounded-btn bg-terracotta px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-terracotta-dark hover:shadow-md disabled:opacity-50"
                  >
                    {loading ? "Duke ngarkuar..." : "Shfaq më shumë"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="skeleton-shimmer mb-6 h-14 w-full max-w-2xl rounded-btn" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      }
    >
      <ListingsContent />
    </Suspense>
  );
}
