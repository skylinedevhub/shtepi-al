import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAgencyBySlug, getAgencyListings } from "@/lib/db/queries";
import { SITE_NAME, SITE_URL } from "@/lib/seo/constants";
import ListingCard from "@/components/ListingCard";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const agency = await getAgencyBySlug(slug);
  if (!agency) return {};

  return {
    title: `${agency.name} — Agjenci Imobiliare | ${SITE_NAME}`,
    description: `Shikoni ${agency.listing_count} njoftimet e ${agency.name} në ${SITE_NAME}. Apartamente, shtëpi dhe vila në Shqipëri.`,
    alternates: { canonical: `/agencies/${slug}` },
    openGraph: {
      title: `${agency.name} — Real Estate Agency | ${SITE_NAME}`,
      description: `Browse ${agency.listing_count} listings from ${agency.name} on ${SITE_NAME}.`,
      url: `${SITE_URL}/agencies/${slug}`,
      locale: "sq_AL",
    },
  };
}

export default async function AgencyProfilePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const agency = await getAgencyBySlug(slug);
  if (!agency) notFound();

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const { listings, total, has_more } = await getAgencyListings(agency.name, {
    page,
    limit: 24,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-warm-gray" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-terracotta">Ballina</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/agencies" className="hover:text-terracotta">Agjensitë</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-navy font-medium truncate">{agency.name}</li>
        </ol>
      </nav>

      {/* Agency header */}
      <div className="mb-8 rounded-2xl border border-warm-gray-light/50 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-cream-dark text-navy">
            <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">
              {agency.name}
            </h1>
            <p className="mt-1 text-warm-gray">
              {agency.listing_count} {agency.listing_count === 1 ? "njoftim aktiv" : "njoftime aktive"}
            </p>
          </div>
        </div>

        {/* Contact details */}
        {(agency.phone || agency.email || agency.website || agency.description) && (
          <div className="mt-6 border-t border-cream-dark pt-6">
            {agency.description && (
              <p className="mb-4 text-sm leading-relaxed text-warm-gray">
                {agency.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-sm">
              {agency.phone && (
                <a
                  href={`tel:${agency.phone}`}
                  className="flex items-center gap-2 rounded-btn border border-warm-gray-light px-3 py-2 text-navy transition hover:bg-cream-dark"
                >
                  <svg className="size-4 text-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  {agency.phone}
                </a>
              )}
              {agency.email && (
                <a
                  href={`mailto:${agency.email}`}
                  className="flex items-center gap-2 rounded-btn border border-warm-gray-light px-3 py-2 text-navy transition hover:bg-cream-dark"
                >
                  <svg className="size-4 text-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  {agency.email}
                </a>
              )}
              {agency.website && (
                <a
                  href={agency.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-btn border border-warm-gray-light px-3 py-2 text-navy transition hover:bg-cream-dark"
                >
                  <svg className="size-4 text-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.264.26-2.466.732-3.558" />
                  </svg>
                  Faqja web
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Listings */}
      <h2 className="mb-4 font-display text-xl font-bold text-navy">
        Njoftimet ({total})
      </h2>

      {listings.length === 0 ? (
        <p className="py-12 text-center text-warm-gray">
          Kjo agjenci nuk ka njoftime aktive.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(page > 1 || has_more) && (
        <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Faqosja">
          {page > 1 && (
            <Link
              href={`/agencies/${slug}?page=${page - 1}`}
              className="rounded-btn border border-warm-gray-light px-4 py-2 text-sm font-medium text-navy transition hover:bg-cream-dark"
            >
              Mbrapa
            </Link>
          )}
          <span className="text-sm text-warm-gray">
            Faqja {page}
          </span>
          {has_more && (
            <Link
              href={`/agencies/${slug}?page=${page + 1}`}
              className="rounded-btn border border-warm-gray-light px-4 py-2 text-sm font-medium text-navy transition hover:bg-cream-dark"
            >
              Para
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
