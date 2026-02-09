import { Suspense } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import { getStats, getListings } from "@/lib/db";

const QUICK_CITIES = [
  "Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë",
];

export const dynamic = "force-dynamic";

export default function HomePage() {
  const stats = getStats();
  const sourceCount = Object.keys(stats.by_source).length;
  const recentListings = getListings({ sort: "newest", limit: 6 }).listings;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-primary-lighter via-primary-light/30 to-white px-4 py-20">
        <h1 className="mb-3 text-center text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          Gjej shtëpinë tënde
        </h1>
        <p className="mb-8 max-w-xl text-center text-lg leading-relaxed text-gray-500">
          Të gjitha njoftimet e pasurive të paluajtshme në Shqipëri, në një vend.
        </p>

        <Suspense fallback={<div className="skeleton-shimmer h-12 w-full max-w-2xl rounded-lg" />}>
          <SearchBar />
        </Suspense>

        {/* Quick filters */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/listings?transaction_type=sale"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primary-dark hover:shadow-md"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
            </svg>
            Blerje
          </Link>
          <Link
            href="/listings?transaction_type=rent"
            className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary-lighter"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            Qira
          </Link>
        </div>

        {/* Quick city links */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {QUICK_CITIES.map((city) => (
            <Link
              key={city}
              href={`/listings?city=${encodeURIComponent(city)}`}
              className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600 shadow-sm transition hover:border-primary/30 hover:shadow-md hover:text-primary"
            >
              {city}
            </Link>
          ))}
        </div>

        {/* Stats bar */}
        {stats.total_listings > 0 && (
          <p className="mt-6 text-sm text-gray-400">
            {stats.total_listings.toLocaleString()} njoftime nga{" "}
            {sourceCount} burime
          </p>
        )}
      </section>

      {/* Recent listings */}
      {recentListings.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Njoftime të Fundit</h2>
            <Link
              href="/listings"
              className="text-sm font-medium text-primary transition hover:text-primary-dark"
            >
              Shiko të gjitha →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
