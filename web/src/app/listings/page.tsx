"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import ListingCard from "@/components/ListingCard";
import FilterSidebar from "@/components/FilterSidebar";
import SearchBar from "@/components/SearchBar";
import type { Listing, ListingsResponse } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "newest", label: "Më të rejat" },
  { value: "price_asc", label: "Çmimi: Ulët → Lartë" },
  { value: "price_desc", label: "Çmimi: Lartë → Ulët" },
  { value: "area_desc", label: "Sipërfaqja: Më e madhe" },
];

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
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
        className="mb-4 h-20 w-20 text-gray-300"
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
      <p className="text-lg font-medium text-gray-700">
        Nuk u gjetën njoftime
      </p>
      <p className="mt-1 text-sm text-gray-500">
        Provo të ndryshosh filtrat ose të kërkosh diçka tjetër.
      </p>
      <button
        onClick={() => router.push("/listings")}
        className="mt-4 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
      >
        Pastro filtrat
      </button>
    </div>
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
  const showingStart = listings.length > 0 ? (page - 1) * limit + 1 : 0;
  const showingEnd = (page - 1) * limit + listings.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Top bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <SearchBar />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={currentSort}
            onChange={(e) => handleSort(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="relative rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 md:hidden"
          >
            Filtra
            {activeFilterCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
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
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {total > 0 ? (
                <>
                  Duke shfaqur {showingStart}–{showingEnd} nga{" "}
                  <span className="font-medium text-gray-700">{total.toLocaleString()}</span>{" "}
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
                    className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
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
          <div className="skeleton-shimmer mb-6 h-12 w-full max-w-2xl rounded-lg" />
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
