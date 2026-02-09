import Link from "next/link";
import type { Listing } from "@/lib/types";

const SOURCE_COLORS: Record<string, string> = {
  merrjep: "bg-blue-100 text-blue-800",
  celesi: "bg-green-100 text-green-800",
  mirlir: "bg-purple-100 text-purple-800",
  njoftime: "bg-orange-100 text-orange-800",
};

export default function ListingCard({ listing }: { listing: Listing }) {
  const firstImage = listing.images[0];
  const priceText = listing.price
    ? `€${listing.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`
    : "Pa çmim";
  const periodSuffix =
    listing.price_period === "monthly" ? "/muaj" : "";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block rounded-lg border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-gray-100">
        {firstImage ? (
          <img
            src={firstImage}
            alt={listing.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
          </div>
        )}
        {/* Source badge */}
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[listing.source] ?? "bg-gray-100 text-gray-800"}`}
        >
          {listing.source}
        </span>
        {/* Image count */}
        {listing.image_count > 1 && (
          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
            {listing.image_count} foto
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Price */}
        <div className="text-lg font-bold text-gray-900">
          {priceText}
          {periodSuffix && (
            <span className="text-sm font-normal text-gray-500">
              {periodSuffix}
            </span>
          )}
        </div>

        {/* Details row */}
        <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
          {listing.room_config && <span>{listing.room_config}</span>}
          {listing.area_sqm && <span>{listing.area_sqm} m²</span>}
          {listing.floor != null && (
            <span>
              Kati {listing.floor}
              {listing.total_floors ? `/${listing.total_floors}` : ""}
            </span>
          )}
        </div>

        {/* Location */}
        <div className="mt-1 truncate text-sm text-gray-500">
          {[listing.neighborhood, listing.city].filter(Boolean).join(", ")}
        </div>

        {/* Title */}
        <h3 className="mt-1 truncate text-sm font-medium text-gray-700">
          {listing.title}
        </h3>
      </div>
    </Link>
  );
}
