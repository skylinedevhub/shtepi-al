"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef, Suspense, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import ListingCard from "@/components/ListingCard";
import FilterSidebar from "@/components/FilterSidebar";
import SearchBar from "@/components/SearchBar";
import type { Listing, ListingsResponse, MapPin } from "@/lib/types";
import { cn } from "@/lib/cn";
import { CITIES } from "@/lib/constants";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const SORT_OPTIONS = [
  { value: "newest", label: "Më të rejat" },
  { value: "price_asc", label: "Çmimi: Ulët → Lartë" },
  { value: "price_desc", label: "Çmimi: Lartë → Ulët" },
  { value: "area_desc", label: "Sipërfaqja: Më e madhe" },
];

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-warm-gray-light/40 bg-white">
      <div className="skeleton-shimmer aspect-[4/3]" />
      <div className="space-y-3 p-4">
        <div className="skeleton-shimmer h-5 w-24 rounded" />
        <div className="skeleton-shimmer h-4 w-36 rounded" />
        <div className="skeleton-shimmer h-4 w-28 rounded" />
      </div>
    </div>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <svg
        className="mb-4 size-20 text-warm-gray-light"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"
        />
      </svg>
      <p className="text-lg font-medium text-navy">
        Nuk u gjetën njoftime
      </p>
      <p className="mt-1 text-sm text-warm-gray">
        Provo të ndryshosh filtrat ose të kërkosh diçka tjetër.
      </p>
      <button
        onClick={() => router.push("/listings")}
        className="btn-press mt-4 rounded-btn bg-terracotta px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-terracotta-dark hover:shadow-md"
      >
        Pastro filtrat
      </button>
    </div>
  );
}

function GridIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

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
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [mapListings, setMapListings] = useState<MapPin[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const isDesktop = useIsDesktop();

  const currentSort = searchParams.get("sort") ?? "newest";

  // Cache for prefetched map pins (keyed by filter params)
  const mapPinsCacheRef = useRef<{ key: string; data: MapPin[] } | null>(null);

  // Preload Leaflet chunk on mount so it's ready when user switches to map
  useEffect(() => {
    import("@/components/MapView");
  }, []);

  // Build map pins cache key from current filters (excluding sort/page)
  const mapPinsCacheKey = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("sort");
    return params.toString();
  }, [searchParams]);

  // Prefetch map pins (called on hover of map button + on filter change when in map mode)
  const prefetchMapPins = useCallback(() => {
    const key = mapPinsCacheKey();
    if (mapPinsCacheRef.current?.key === key) return; // already cached
    fetch(`/api/listings/map-pins?${key}`)
      .then((res) => res.json())
      .then((data: MapPin[]) => {
        mapPinsCacheRef.current = { key, data };
      })
      .catch(() => {});
  }, [mapPinsCacheKey]);

  const fetchListings = useCallback(
    async (pageNum: number, append: boolean = false) => {
      setLoading(true);
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(pageNum));

      const q = params.get("q");
      const url = q
        ? `/api/search?${params.toString()}`
        : `/api/listings?${params.toString()}`;

      try {
        const res = await fetch(url);
        const data: ListingsResponse = await res.json();
        setListings((prev) =>
          append ? [...prev, ...data.listings] : data.listings
        );
        setTotal(data.total);
        setHasMore(data.has_more);
      } catch {
        // API not available (no DB yet)
      } finally {
        setLoading(false);
      }
    },
    [searchParams]
  );

  useEffect(() => {
    setPage(1);
    fetchListings(1);
  }, [fetchListings]);

  // Fetch ALL geocoded listings for map pins (separate from paginated list)
  useEffect(() => {
    if (viewMode !== "map") return;
    const key = mapPinsCacheKey();

    // Use prefetched data if available
    if (mapPinsCacheRef.current?.key === key) {
      setMapListings(mapPinsCacheRef.current.data);
      return;
    }

    setMapLoading(true);
    fetch(`/api/listings/map-pins?${key}`)
      .then((res) => res.json())
      .then((data: MapPin[]) => {
        setMapListings(data);
        mapPinsCacheRef.current = { key, data };
      })
      .catch(() => {})
      .finally(() => setMapLoading(false));
  }, [viewMode, searchParams, mapPinsCacheKey]);

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchListings(nextPage, true);
  }

  function handleSort(value: string) {
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
            <MapView listings={mapListings} fitPaddingLeft={isDesktop && panelOpen ? 420 : 0} />
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
                    <select
                      value={currentSort}
                      onChange={(e) => handleSort(e.target.value)}
                      aria-label="Rendit sipas"
                      className="cursor-pointer appearance-none rounded-full border border-warm-gray-light/30 bg-white/90 py-2.5 pl-3 pr-7 text-sm text-navy shadow-sm backdrop-blur-md transition focus:outline-none focus:ring-2 focus:ring-terracotta/20"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <svg className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-warm-gray" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <button
                    onClick={() => setViewMode("grid")}
                    aria-label="Shfaq si rrjetë"
                    className="rounded-full border border-warm-gray-light/30 bg-white/90 p-2.5 text-navy shadow-sm backdrop-blur-md transition hover:bg-white"
                  >
                    <GridIcon />
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
                  <select
                    value={currentSort}
                    onChange={(e) => handleSort(e.target.value)}
                    aria-label="Rendit sipas"
                    className="cursor-pointer appearance-none rounded-full border-none bg-transparent px-1 py-0.5 text-xs text-warm-gray focus:outline-none sm:hidden"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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
          {/* View toggle */}
          <div className="flex overflow-hidden rounded-btn border border-warm-gray-light">
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Shfaq si rrjetë"
              aria-pressed={true}
              className="cursor-pointer bg-terracotta p-2.5 text-white transition"
            >
              <GridIcon />
            </button>
            <button
              onClick={() => setViewMode("map")}
              onMouseEnter={prefetchMapPins}
              aria-label="Shfaq në hartë"
              aria-pressed={false}
              className="cursor-pointer bg-white p-2.5 text-warm-gray transition hover:text-navy"
            >
              <MapIcon />
            </button>
          </div>

          <select
            value={currentSort}
            onChange={(e) => handleSort(e.target.value)}
            aria-label="Rendit sipas"
            className="min-w-0 cursor-pointer rounded-btn border border-warm-gray-light bg-white px-2 py-2.5 text-xs text-navy focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20 sm:px-3 sm:text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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

          {loading && listings.length === 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <EmptyState />
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
