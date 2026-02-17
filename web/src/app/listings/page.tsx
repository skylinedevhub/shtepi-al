"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import ListingCard from "@/components/ListingCard";
import FilterSidebar from "@/components/FilterSidebar";
import SearchBar from "@/components/SearchBar";
import type { Listing, ListingsResponse } from "@/lib/types";

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
        className="mb-4 h-20 w-20 text-warm-gray-light"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
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
        className="mt-4 rounded-btn bg-terracotta px-5 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta-dark"
      >
        Pastro filtrat
      </button>
    </div>
  );
}

function GridIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
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

  const currentSort = searchParams.get("sort") ?? "newest";

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
              className={`p-2.5 transition ${
                viewMode === "grid"
                  ? "bg-terracotta text-white"
                  : "bg-white text-warm-gray hover:text-navy"
              }`}
            >
              <GridIcon />
            </button>
            <button
              onClick={() => setViewMode("map")}
              aria-label="Shfaq në hartë"
              className={`p-2.5 transition ${
                viewMode === "map"
                  ? "bg-terracotta text-white"
                  : "bg-white text-warm-gray hover:text-navy"
              }`}
            >
              <MapIcon />
            </button>
          </div>

          <select
            value={currentSort}
            onChange={(e) => handleSort(e.target.value)}
            className="min-w-0 rounded-btn border border-warm-gray-light bg-white px-2 py-2.5 text-xs text-navy focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20 sm:px-3 sm:text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="relative rounded-btn border border-warm-gray-light px-4 py-2.5 text-sm font-medium text-navy transition hover:bg-cream-dark md:hidden"
          >
            Filtra
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        /* Grid mode */
        <div className="flex gap-6">
          <FilterSidebar
            isOpen={filtersOpen}
            onClose={() => setFiltersOpen(false)}
          />

          <div className="flex-1">
            {/* Results summary */}
            <div className="mb-4 flex items-center justify-between">
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
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="rounded-btn bg-terracotta px-6 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta-dark disabled:opacity-50"
                    >
                      {loading ? "Duke ngarkuar..." : "Shfaq më shumë"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* Map mode — split layout */
        <div className="flex flex-col gap-4" style={{ height: "calc(100vh - 200px)" }}>
          <div className="flex flex-1 gap-4">
            {/* Sidebar — desktop only */}
            <div className="hidden w-96 shrink-0 overflow-y-auto rounded-2xl border border-warm-gray-light/40 bg-white p-3 md:block">
              <p className="mb-3 px-1 text-sm font-medium text-warm-gray">
                {total > 0 ? `${total.toLocaleString()} njoftime` : "Duke ngarkuar..."}
              </p>
              {loading && listings.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} variant="compact" />
                  ))}
                  {hasMore && (
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full rounded-btn bg-terracotta px-4 py-2 text-sm font-medium text-white transition hover:bg-terracotta-dark disabled:opacity-50"
                    >
                      {loading ? "Duke ngarkuar..." : "Shfaq më shumë"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Map */}
            <div className="flex-1 overflow-hidden rounded-2xl border border-warm-gray-light/40">
              <MapView listings={listings} />
            </div>
          </div>

          {/* Mobile listing strip — below map */}
          <div className="flex gap-3 overflow-x-auto pb-2 md:hidden">
            {listings.slice(0, 10).map((listing) => (
              <div key={listing.id} className="w-64 shrink-0">
                <ListingCard listing={listing} variant="compact" />
              </div>
            ))}
          </div>
        </div>
      )}
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
