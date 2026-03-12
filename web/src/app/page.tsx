import { Suspense } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import JsonLd from "@/components/JsonLd";
import { buildWebsiteJsonLd } from "@/lib/seo/jsonld";
import { cityToSlug } from "@/lib/seo/slugs";
import { getStats, getListings } from "@/lib/db/queries";
import { QUICK_CITIES } from "@/lib/constants";

export const revalidate = 60;

export default async function HomePage() {
  const stats = await getStats();
  const sourceCount = 13; // Total spider sources (all Albanian RE portals)
  const recentListings = (await getListings({ sort: "newest", limit: 6 })).listings;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <JsonLd data={buildWebsiteJsonLd()} />
      {/* Hero */}
      <section
        className="noise-texture relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-20 sm:py-32"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 80% 15%, rgba(199,91,57,0.09) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 15% 80%, rgba(212,168,67,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 40% 40% at 50% 50%, rgba(27,42,74,0.02) 0%, transparent 60%),
            #FDF8F0
          `,
        }}
      >
        {/* Decorative geometric accents */}
        <div className="pointer-events-none absolute left-6 top-16 h-24 w-px bg-gradient-to-b from-transparent via-gold/30 to-transparent sm:left-12 sm:h-32" />
        <div className="pointer-events-none absolute bottom-16 right-6 h-24 w-px bg-gradient-to-b from-transparent via-terracotta/20 to-transparent sm:right-12 sm:h-32" />
        <div className="pointer-events-none absolute left-4 top-14 h-px w-8 bg-gradient-to-r from-transparent to-gold/30 sm:left-10 sm:w-12" />
        <div className="pointer-events-none absolute bottom-14 right-4 h-px w-8 bg-gradient-to-l from-transparent to-terracotta/20 sm:right-10 sm:w-12" />

        {/* Subtitle accent */}
        <div className="animate-fade-up mb-5 flex items-center gap-3">
          <span className="h-px w-8 bg-gold/50" />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-gold">
            Pasuritë e paluajtshme
          </span>
          <span className="h-px w-8 bg-gold/50" />
        </div>

        <h1 className="animate-fade-up-delay-1 mb-5 text-center font-display text-4xl font-bold tracking-tight text-navy sm:text-5xl md:text-7xl">
          Gjej shtëpinë tënde
        </h1>
        <p className="animate-fade-up-delay-2 mb-8 max-w-lg text-center text-base leading-relaxed text-warm-gray sm:mb-10 sm:text-lg">
          Të gjitha njoftimet e pasurive të paluajtshme në Shqipëri, në një vend.
        </p>

        <div className="animate-fade-up-delay-3 w-full max-w-2xl">
          <Suspense fallback={<div className="skeleton-shimmer h-14 w-full rounded-btn" />}>
            <SearchBar />
          </Suspense>
        </div>

        {/* Quick filters */}
        <div className="mt-8 flex flex-wrap justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <Link
            href="/listings?transaction_type=sale"
            className="btn-press inline-flex items-center gap-2 rounded-btn bg-terracotta px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-terracotta-dark hover:shadow-md"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
            </svg>
            Blerje
          </Link>
          <Link
            href="/listings?transaction_type=rent"
            className="btn-press inline-flex items-center gap-2 rounded-btn border-2 border-terracotta px-6 py-3 text-sm font-medium text-terracotta transition-all duration-200 hover:bg-terracotta hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            Qira
          </Link>
        </div>

        {/* Quick city links */}
        <div className="mt-8 flex flex-wrap justify-center gap-2 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          {QUICK_CITIES.map((city) => (
            <Link
              key={city}
              href={`/${cityToSlug(city)}`}
              className="rounded-full border border-warm-gray-light/70 bg-white/80 px-4 py-1.5 text-sm text-warm-gray shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-terracotta/30 hover:text-terracotta hover:shadow-md"
            >
              {city}
            </Link>
          ))}
        </div>

        {/* Stats bar */}
        {stats.total_listings > 0 && (
          <div className="mt-10 flex items-center gap-3 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <span className="h-px w-6 bg-warm-gray-light" />
            <p className="text-sm text-warm-gray">
              <span className="font-semibold text-navy">{stats.total_listings.toLocaleString()}</span>{" "}
              njoftime nga{" "}
              <span className="font-semibold text-navy">{sourceCount}</span> burime
            </p>
            <span className="h-px w-6 bg-warm-gray-light" />
          </div>
        )}
      </section>

      {/* Recent listings */}
      {recentListings.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 py-16">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-navy">Njoftime te Fundit</h2>
            <Link
              href="/listings"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-terracotta transition hover:text-terracotta-dark"
            >
              Shiko te gjitha
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="stagger-children grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
