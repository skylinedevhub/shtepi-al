"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

export default function FavoritesPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  const loadFavorites = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/favorites?page=${p}&limit=24`);
      if (res.ok) {
        const data = await res.json();
        setListings(data.listings);
        setHasMore(data.has_more);
        setTotal(data.total);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites(1);
  }, [loadFavorites]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-navy">
          Të ruajturat
        </h1>
        <p className="mt-1 text-sm text-warm-gray">
          {total > 0
            ? `${total} njoftime të ruajtura`
            : "Njoftimet që ruani do të shfaqen këtu"}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-72 rounded-card" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-card border border-warm-gray-light bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-warm-gray/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
          <h2 className="mt-4 font-display text-lg font-semibold text-navy">
            Nuk keni ruajtur asnjë njoftim
          </h2>
          <p className="mt-2 text-sm text-warm-gray">
            Shtypni ikonën e zemrës te njoftimet për t&apos;i ruajtur këtu.
          </p>
          <Link
            href="/listings"
            className="mt-4 inline-block rounded-btn bg-terracotta px-6 py-2.5 text-sm font-medium text-white transition hover:bg-terracotta-dark"
          >
            Shfleto njoftime
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>

          {/* Pagination */}
          {(page > 1 || hasMore) && (
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() => loadFavorites(page - 1)}
                disabled={page <= 1}
                className="rounded-btn border border-warm-gray-light px-4 py-2 text-sm font-medium text-navy transition hover:bg-cream-dark disabled:opacity-50"
              >
                Para
              </button>
              <span className="text-sm text-warm-gray">Faqja {page}</span>
              <button
                onClick={() => loadFavorites(page + 1)}
                disabled={!hasMore}
                className="rounded-btn border border-warm-gray-light px-4 py-2 text-sm font-medium text-navy transition hover:bg-cream-dark disabled:opacity-50"
              >
                Tjetra
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
