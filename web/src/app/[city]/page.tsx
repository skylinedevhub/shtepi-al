import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListings } from "@/lib/db/queries";
import { slugToCity } from "@/lib/seo/slugs";
import { buildCityMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { SITE_URL, TRANSACTION_TYPE_URL } from "@/lib/seo/constants";
import JsonLd from "@/components/JsonLd";
import ListingCard from "@/components/ListingCard";

export const revalidate = 3600;

interface Props {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug } = await params;
  const cityName = slugToCity(citySlug);
  if (!cityName) return {};
  return buildCityMetadata(cityName);
}

export default async function CityPage({ params }: Props) {
  const { city: citySlug } = await params;
  const cityName = slugToCity(citySlug);
  if (!cityName) notFound();

  const { listings } = await getListings({
    city: cityName,
    sort: "newest",
    limit: 24,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Kryefaqja", url: SITE_URL },
          { name: cityName },
        ])}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-warm-gray" aria-label="Breadcrumb">
        <Link href="/" className="transition hover:text-terracotta">
          Kryefaqja
        </Link>
        <ChevronIcon />
        <span className="font-medium text-navy">{cityName}</span>
      </nav>

      <h1 className="font-display text-3xl font-bold text-navy">
        Pasuri të paluajtshme në {cityName}
      </h1>

      {/* Transaction type links */}
      <div className="mt-4 flex gap-3">
        {Object.entries(TRANSACTION_TYPE_URL).map(([type, urlSlug]) => (
          <Link
            key={type}
            href={`/${citySlug}/${urlSlug}`}
            className="rounded-btn border border-terracotta/30 px-4 py-2 text-sm font-medium text-terracotta transition hover:bg-terracotta hover:text-white"
          >
            {type === "sale" ? "Shitje" : "Qira"}
          </Link>
        ))}
        <Link
          href={`/listings?city=${encodeURIComponent(cityName)}`}
          className="rounded-btn border border-warm-gray-light px-4 py-2 text-sm font-medium text-navy transition hover:bg-cream-dark"
        >
          Kërko me filtra
        </Link>
      </div>

      {/* Listing grid */}
      {listings.length > 0 ? (
        <div className="stagger-children mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-center text-warm-gray">
          Nuk u gjetën njoftime në {cityName}.
        </p>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4 shrink-0 text-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
