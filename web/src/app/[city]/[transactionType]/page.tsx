import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListings } from "@/lib/db/queries";
import { slugToCity } from "@/lib/seo/slugs";
import { buildCityMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import {
  SITE_URL,
  URL_TO_TRANSACTION,
  TRANSACTION_TYPE_SQ,
} from "@/lib/seo/constants";
import JsonLd from "@/components/JsonLd";
import ListingCard from "@/components/ListingCard";

export const revalidate = 3600;

interface Props {
  params: Promise<{ city: string; transactionType: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, transactionType: txSlug } = await params;
  const cityName = slugToCity(citySlug);
  const txType = URL_TO_TRANSACTION[txSlug];
  if (!cityName || !txType) return {};
  return buildCityMetadata(cityName, txType);
}

export default async function CityTransactionPage({ params }: Props) {
  const { city: citySlug, transactionType: txSlug } = await params;
  const cityName = slugToCity(citySlug);
  const txType = URL_TO_TRANSACTION[txSlug];
  if (!cityName || !txType) notFound();

  const txLabel = TRANSACTION_TYPE_SQ[txType] ?? txType;

  const { listings } = await getListings({
    city: cityName,
    transaction_type: txType,
    sort: "newest",
    limit: 24,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Kryefaqja", url: SITE_URL },
          { name: cityName, url: `${SITE_URL}/${citySlug}` },
          { name: txLabel },
        ])}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-warm-gray" aria-label="Breadcrumb">
        <Link href="/" className="transition hover:text-terracotta">
          Kryefaqja
        </Link>
        <ChevronIcon />
        <Link href={`/${citySlug}`} className="transition hover:text-terracotta">
          {cityName}
        </Link>
        <ChevronIcon />
        <span className="font-medium text-navy">{txLabel}</span>
      </nav>

      <h1 className="font-display text-3xl font-bold text-navy">
        {txLabel} në {cityName}
      </h1>
      <p className="mt-2 text-warm-gray">
        Apartamente, shtëpi, vila dhe tokë për {txLabel.toLowerCase()} në {cityName}.
      </p>

      {/* Listing grid */}
      {listings.length > 0 ? (
        <div className="stagger-children mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <p className="mt-12 text-center text-warm-gray">
          Nuk u gjetën njoftime për {txLabel.toLowerCase()} në {cityName}.
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
