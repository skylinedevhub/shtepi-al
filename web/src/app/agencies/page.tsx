import type { Metadata } from "next";
import Link from "next/link";
import { getAgencies } from "@/lib/db/queries";
import { SITE_NAME, SITE_URL } from "@/lib/seo/constants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Agjensitë e Pasurive të Paluajtshme — ${SITE_NAME}`,
  description: `Gjeni agjensitë më të mira të pasurive të paluajtshme në Shqipëri. Shikoni njoftimet e tyre në ${SITE_NAME}.`,
  alternates: { canonical: "/agencies" },
  openGraph: {
    title: `Real Estate Agencies in Albania — ${SITE_NAME}`,
    description: `Browse real estate agencies across Albania on ${SITE_NAME}.`,
    url: `${SITE_URL}/agencies`,
    locale: "sq_AL",
  },
};

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AgenciesPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const { agencies, total, has_more } = await getAgencies(page, 24);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-navy">
          Agjensitë
        </h1>
        <p className="mt-2 text-warm-gray">
          {total} agjenci të pasurive të paluajtshme në Shqipëri
        </p>
      </div>

      {agencies.length === 0 ? (
        <p className="py-12 text-center text-warm-gray">
          Nuk u gjetën agjenci.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          {agencies.map((agency) => (
            <Link
              key={agency.id}
              href={`/agencies/${agency.slug}`}
              className="group block rounded-2xl border border-warm-gray-light/50 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_-8px_rgba(27,42,74,0.12)]"
            >
              {/* Agency icon + name */}
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-cream-dark text-navy">
                  <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-lg font-bold text-navy group-hover:text-terracotta">
                    {agency.name}
                  </h2>
                  <p className="mt-0.5 text-sm text-warm-gray">
                    {agency.listing_count} {agency.listing_count === 1 ? "njoftim" : "njoftime"}
                  </p>
                </div>
              </div>

              {/* Contact info */}
              {(agency.phone || agency.email) && (
                <div className="mt-4 space-y-1.5 text-sm text-warm-gray">
                  {agency.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="size-4 shrink-0 text-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      <span className="truncate">{agency.phone}</span>
                    </div>
                  )}
                  {agency.email && (
                    <div className="flex items-center gap-2">
                      <svg className="size-4 shrink-0 text-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      <span className="truncate">{agency.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* CTA */}
              <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-terracotta">
                Shiko njoftimet
                <svg className="size-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(page > 1 || has_more) && (
        <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Faqosja">
          {page > 1 && (
            <Link
              href={`/agencies?page=${page - 1}`}
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
              href={`/agencies?page=${page + 1}`}
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
