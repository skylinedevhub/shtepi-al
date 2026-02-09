import Link from "next/link";
import { notFound } from "next/navigation";
import { getListingById } from "@/lib/db";
import ImageGallery from "@/components/ImageGallery";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default function ListingDetailPage({ params }: Props) {
  const listing = getListingById(params.id);

  if (!listing) {
    notFound();
  }

  const priceText = listing.price
    ? `€${listing.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`
    : "Pa çmim";
  const periodSuffix = listing.price_period === "monthly" ? "/muaj" : "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/listings" className="hover:text-blue-600">
          Njoftime
        </Link>
        {" > "}
        {listing.city && (
          <>
            <Link
              href={`/listings?city=${encodeURIComponent(listing.city)}`}
              className="hover:text-blue-600"
            >
              {listing.city}
            </Link>
            {" > "}
          </>
        )}
        <span className="text-gray-700">{listing.title}</span>
      </nav>

      <ImageGallery images={listing.images} alt={listing.title} />

      {/* Header */}
      <div className="mt-6">
        <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <span className="text-2xl font-bold text-blue-600">
            {priceText}
            {periodSuffix}
          </span>
          {listing.price_all != null && (
            <span className="text-sm text-gray-500">
              (
              {listing.price_all.toLocaleString("de-DE", {
                maximumFractionDigits: 0,
              })}{" "}
              ALL)
            </span>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-4">
        {listing.room_config && (
          <Detail label="Dhoma" value={listing.room_config} />
        )}
        {listing.area_sqm != null && (
          <Detail label="Sipërfaqja" value={`${listing.area_sqm} m²`} />
        )}
        {listing.floor != null && (
          <Detail
            label="Kati"
            value={`${listing.floor}${listing.total_floors ? `/${listing.total_floors}` : ""}`}
          />
        )}
        {listing.property_type && (
          <Detail label="Lloji" value={listing.property_type} />
        )}
        {listing.transaction_type && (
          <Detail
            label="Transaksioni"
            value={listing.transaction_type === "sale" ? "Shitje" : "Qira"}
          />
        )}
        {listing.bathrooms != null && (
          <Detail label="Banjot" value={String(listing.bathrooms)} />
        )}
        {listing.has_elevator && <Detail label="Ashensor" value="Po" />}
        {listing.has_parking && <Detail label="Parking" value="Po" />}
        {listing.is_furnished && <Detail label="I mobiluar" value="Po" />}
        {listing.is_new_build && <Detail label="Ndërtim i ri" value="Po" />}
      </div>

      {/* Location */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Vendndodhja</h2>
        <p className="mt-1 text-gray-600">
          {[listing.neighborhood, listing.city, listing.address_raw]
            .filter(Boolean)
            .join(", ")}
        </p>
      </div>

      {/* Description */}
      {listing.description && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Përshkrimi</h2>
          <p className="mt-2 whitespace-pre-line text-gray-600">
            {listing.description}
          </p>
        </div>
      )}

      {/* Contact */}
      {(listing.poster_name || listing.poster_phone) && (
        <div className="mt-6 rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Kontakti</h2>
          {listing.poster_name && (
            <p className="mt-1 text-gray-600">{listing.poster_name}</p>
          )}
          {listing.poster_phone && (
            <a
              href={`tel:${listing.poster_phone}`}
              className="mt-1 inline-block text-blue-600 hover:underline"
            >
              {listing.poster_phone}
            </a>
          )}
          <span className="ml-2 text-xs text-gray-400">
            ({listing.poster_type})
          </span>
        </div>
      )}

      {/* Source link */}
      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4 text-sm text-gray-500">
        <span>
          Nga <strong>{listing.source}</strong> — parë më{" "}
          {new Date(listing.first_seen).toLocaleDateString("sq-AL")}
        </span>
        <a
          href={listing.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          Shiko në faqen origjinale
        </a>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900">{value}</dd>
    </div>
  );
}
