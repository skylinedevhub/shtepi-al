"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import ListingCard from "@/components/ListingCard";
import FilterSidebar from "@/components/FilterSidebar";
import SearchBar from "@/components/SearchBar";
import type { Listing, ListingsResponse } from "@/lib/types";

function ListingsContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <SearchBar />
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm md:hidden"
        >
          Filtra
        </button>
      </div>

      <div className="flex gap-6">
        <FilterSidebar
          isOpen={filtersOpen}
          onClose={() => setFiltersOpen(false)}
        />

        <div className="flex-1">
          <p className="mb-4 text-sm text-gray-500">
            {total.toLocaleString()} njoftime
          </p>

          {loading && listings.length === 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-lg bg-gray-100"
                />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              Nuk u gjetën njoftime me këta filtra.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-8 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
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
      fallback={<div className="p-8 text-center">Duke ngarkuar...</div>}
    >
      <ListingsContent />
    </Suspense>
  );
}
