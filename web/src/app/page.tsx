import { Suspense } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import { getStats, getListings } from "@/lib/db/queries";

const QUICK_CITIES = [
  "Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë",
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await getStats();
  const sourceCount = Object.keys(stats.by_source).length;
  const recentListings = (await getListings({ sort: "newest", limit: 6 })).listings;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      {/* Hero — mesh gradient */}
      <section
        className="flex flex-1 flex-col items-center justify-center px-4 py-28"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 80% 20%, rgba(199,91,57,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 20% 80%, rgba(212,168,67,0.06) 0%, transparent 70%),
            #FDF8F0
          `,
        }}
      >
        <h1 className="mb-4 text-center font-display text-5xl font-bold tracking-tight text-navy md:text-7xl">
          Gjej shtëpinë tënde
        </h1>
        <p className="mb-10 max-w-xl text-center text-lg leading-relaxed text-warm-gray">
          Të gjitha njoftimet e pasurive të paluajtshme në Shqipëri, në një vend.
        </p>

        <Suspense fallback={<div className="skeleton-shimmer h-14 w-full max-w-2xl rounded-btn" />}>
          <SearchBar />
        </Suspense>

        {/* Quick filters */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/listings?transaction_type=sale"
            className="inline-flex items-center gap-2 rounded-btn bg-terracotta px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-terracotta-dark hover:shadow-md"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
            </svg>
            Blerje
          </Link>
          <Link
            href="/listings?transaction_type=rent"
            className="inline-flex items-center gap-2 rounded-btn border-2 border-terracotta px-6 py-3 text-sm font-medium text-terracotta transition hover:bg-terracotta-light"
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
              className="rounded-full border border-warm-gray-light bg-white px-4 py-1.5 text-sm text-warm-gray shadow-sm transition hover:border-terracotta/30 hover:text-terracotta hover:shadow-md"
            >
              {city}
            </Link>
          ))}
        </div>

        {/* Stats bar */}
        {stats.total_listings > 0 && (
          <p className="mt-8 text-sm text-warm-gray">
            <span className="font-semibold text-navy">{stats.total_listings.toLocaleString()}</span>{" "}
            njoftime nga{" "}
            <span className="font-semibold text-navy">{sourceCount}</span> burime
          </p>
        )}
      </section>

      {/* Recent listings */}
      {recentListings.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-16">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-navy">Njoftime të Fundit</h2>
            <Link
              href="/listings"
              className="text-sm font-medium text-terracotta transition hover:text-terracotta-dark"
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
