import { Suspense } from "react";
import Link from "next/link";
import SearchBar from "@/components/SearchBar";

const QUICK_CITIES = [
  "Tiranë", "Durrës", "Vlorë", "Sarandë", "Shkodër", "Korçë",
];

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4 py-16">
        <h1 className="mb-2 text-center text-4xl font-bold text-gray-900 md:text-5xl">
          Gjej shtëpinë tënde
        </h1>
        <p className="mb-8 text-center text-lg text-gray-600">
          Të gjitha njoftimet e pasurive të paluajtshme në Shqipëri, në një vend.
        </p>

        <Suspense fallback={<div className="h-12 w-full max-w-2xl animate-pulse rounded-lg bg-gray-100" />}>
          <SearchBar />
        </Suspense>

        {/* Quick filters */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/listings?transaction_type=sale"
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Blerje
          </Link>
          <Link
            href="/listings?transaction_type=rent"
            className="rounded-full border border-blue-600 px-5 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
          >
            Qira
          </Link>
        </div>

        {/* Quick city links */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {QUICK_CITIES.map((city) => (
            <Link
              key={city}
              href={`/listings?city=${encodeURIComponent(city)}`}
              className="rounded-md bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm transition hover:shadow-md"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
        <p>
          ShtëpiAL agregon njoftime nga merrjep.al, gazetacelesi.al, mirlir.com,
          njoftime.com dhe burime të tjera.
        </p>
      </footer>
    </div>
  );
}
