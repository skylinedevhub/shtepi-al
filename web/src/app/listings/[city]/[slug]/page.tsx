import type { Metadata } from "next";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { getListingByShortId } from "@/lib/db/queries";
import { parseSlugId } from "@/lib/seo/slugs";
import { buildListingMetadata } from "@/lib/seo/metadata";
import { buildListingJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo/jsonld";
import { SITE_URL, PROPERTY_TYPE_SQ } from "@/lib/seo/constants";
import { buildListingPath } from "@/lib/seo/slugs";
import JsonLd from "@/components/JsonLd";
import ImageGallery from "@/components/ImageGallery";
import ShareButton from "@/components/ShareButton";
import { ChevronIcon } from "@/components/icons/ChevronIcon";

const DetailMap = nextDynamic(() => import("@/components/DetailMap"), { ssr: false });

export const revalidate = 3600;

const POSTER_TYPE_LABELS: Record<string, string> = {
  agency: "Agjenci",
  private: "Privat",
  broker: "Ndërmjetës",
};

interface Props {
  params: Promise<{ city: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const shortId = parseSlugId(slug);
  if (!shortId) return {};

  const listing = await getListingByShortId(shortId);
  if (!listing) return {};

  return buildListingMetadata(listing);
}

export default async function ListingDetailPage({ params }: Props) {
  const { city, slug } = await params;
  const shortId = parseSlugId(slug);
  if (!shortId) notFound();

  const listing = await getListingByShortId(shortId);
  if (!listing) notFound();

  const canonicalPath = buildListingPath(listing.title, listing.city, listing.id);
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;

  const priceText = listing.price
    ? `€${listing.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`
    : "Pa çmim";
  const periodSuffix = listing.price_period === "monthly" ? "/muaj" : "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <JsonLd data={buildListingJsonLd(listing, canonicalUrl)} />
      <JsonLd
        data={buildBreadcrumbJsonLd([
          { name: "Kryefaqja", url: SITE_URL },
          ...(listing.city
            ? [{ name: listing.city, url: `${SITE_URL}/${city}` }]
            : []),
          { name: listing.title },
        ])}
      />

      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-warm-gray" aria-label="Breadcrumb">
        <Link href="/listings" className="transition hover:text-terracotta">
          Njoftime
        </Link>
        <ChevronIcon />
        {listing.city && (
          <>
            <Link
              href={`/${city}`}
              className="transition hover:text-terracotta"
            >
              {listing.city}
            </Link>
            <ChevronIcon />
          </>
        )}
        <span className="truncate font-medium text-navy">{listing.title}</span>
      </nav>

      <ImageGallery images={listing.images} alt={listing.title} />

      {/* Header */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy md:text-3xl">{listing.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <span className="text-3xl font-bold tabular-nums text-terracotta">
              {priceText}
              {periodSuffix && (
                <span className="text-lg font-normal text-warm-gray">
                  {periodSuffix}
                </span>
              )}
            </span>
            {listing.price_all != null && (
              <span className="rounded-md bg-cream-dark px-2 py-1 text-sm text-warm-gray">
                {listing.price_all.toLocaleString("de-DE", {
                  maximumFractionDigits: 0,
                })}{" "}
                ALL
              </span>
            )}
          </div>
        </div>
        <ShareButton />
      </div>

      {/* Details grid */}
      <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-warm-gray-light/40 bg-cream-dark p-4 sm:grid-cols-3 sm:gap-4 sm:p-5 lg:grid-cols-4">
        {listing.room_config && (
          <Detail icon={<RoomIcon />} label="Dhoma" value={listing.room_config} />
        )}
        {listing.area_sqm != null && (
          <Detail icon={<AreaIcon />} label="Sipërfaqja" value={`${listing.area_sqm} m²`} />
        )}
        {listing.floor != null && (
          <Detail
            icon={<FloorIcon />}
            label="Kati"
            value={`${listing.floor}${listing.total_floors ? `/${listing.total_floors}` : ""}`}
          />
        )}
        {listing.property_type && (
          <Detail
            icon={<TypeIcon />}
            label="Lloji"
            value={PROPERTY_TYPE_SQ[listing.property_type] ?? listing.property_type}
          />
        )}
        {listing.transaction_type && (
          <Detail
            icon={<TransactionIcon />}
            label="Transaksioni"
            value={listing.transaction_type === "sale" ? "Shitje" : "Qira"}
          />
        )}
        {listing.bathrooms != null && (
          <Detail icon={<BathIcon />} label="Banjot" value={String(listing.bathrooms)} />
        )}
        {listing.has_elevator && <Detail icon={<ElevatorIcon />} label="Ashensor" value="Po" />}
        {listing.has_parking && <Detail icon={<ParkingIcon />} label="Parking" value="Po" />}
        {listing.is_furnished && <Detail icon={<FurnishedIcon />} label="I mobiluar" value="Po" />}
        {listing.is_new_build && <Detail icon={<NewBuildIcon />} label="Ndërtim i ri" value="Po" />}
      </div>

      {/* Location */}
      <div className="mt-6">
        <h2 className="font-display text-lg font-semibold text-navy">Vendndodhja</h2>
        <p className="mt-1 text-warm-gray">
          {[listing.neighborhood, listing.city, listing.address_raw]
            .filter(Boolean)
            .join(", ")}
        </p>
        {listing.latitude != null && listing.longitude != null && (
          <div className="mt-3">
            <DetailMap latitude={listing.latitude} longitude={listing.longitude} />
          </div>
        )}
      </div>

      {/* Description */}
      {listing.description && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold text-navy">Përshkrimi</h2>
          <p className="mt-2 whitespace-pre-line leading-relaxed text-warm-gray">
            {listing.description}
          </p>
        </div>
      )}

      {/* Contact */}
      {(listing.poster_name || listing.poster_phone) && (
        <div className="mt-6 rounded-2xl border border-terracotta/20 bg-terracotta-light p-5">
          <h2 className="font-display text-lg font-semibold text-navy">Kontakti</h2>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {listing.poster_name && (
              <p className="font-medium text-navy">{listing.poster_name}</p>
            )}
            {listing.poster_type && (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-warm-gray ring-1 ring-warm-gray-light">
                {POSTER_TYPE_LABELS[listing.poster_type] ?? listing.poster_type}
              </span>
            )}
          </div>
          {listing.poster_phone && (
            <a
              href={`tel:${listing.poster_phone}`}
              className="btn-press mt-3 inline-flex w-full items-center justify-center gap-2 rounded-btn bg-terracotta px-5 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-terracotta-dark hover:shadow-md sm:w-auto sm:justify-start sm:py-2.5"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {listing.poster_phone}
            </a>
          )}
        </div>
      )}

      {/* Source link */}
      <div className="mt-6 flex flex-col gap-3 border-t border-warm-gray-light pt-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-warm-gray">
          Nga <strong className="text-navy">{listing.source}</strong> — parë më{" "}
          {new Date(listing.first_seen).toLocaleDateString("sq-AL")}
        </span>
        <a
          href={listing.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-btn border border-warm-gray-light px-4 py-2 text-sm font-medium text-navy transition hover:bg-cream-dark"
        >
          Shiko në faqen origjinale
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-terracotta/60">{icon}</span>
      <div>
        <dt className="text-xs uppercase tracking-wide text-warm-gray">{label}</dt>
        <dd className="font-medium text-navy">{value}</dd>
      </div>
    </div>
  );
}

function RoomIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function AreaIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
    </svg>
  );
}

function FloorIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function TypeIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
    </svg>
  );
}

function TransactionIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function BathIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ElevatorIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
    </svg>
  );
}

function ParkingIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    </svg>
  );
}

function FurnishedIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function NewBuildIcon() {
  return (
    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}
