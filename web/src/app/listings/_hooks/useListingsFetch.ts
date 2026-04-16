"use client";

import { useEffect, useState, useCallback } from "react";
import type { Listing, ListingsResponse } from "@/lib/types";

interface UseListingsFetchResult {
  listings: Listing[];
  total: number;
  loading: boolean;
  fetchError: boolean;
  page: number;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

export function useListingsFetch(
  searchParams: URLSearchParams
): UseListingsFetchResult {
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

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
        if (!res.ok) throw new Error("fetch failed");
        const data: ListingsResponse = await res.json();
        setListings((prev) =>
          append ? [...prev, ...data.listings] : data.listings
        );
        setTotal(data.total);
        setHasMore(data.has_more);
        setFetchError(false);
      } catch {
        if (!append) setFetchError(true);
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

  function loadMore(): void {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchListings(nextPage, true);
  }

  function retry(): void {
    setFetchError(false);
    fetchListings(1);
  }

  return { listings, total, loading, fetchError, page, hasMore, loadMore, retry };
}
