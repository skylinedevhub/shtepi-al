"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/lib/types";
import { buildListingPath } from "@/lib/seo/slugs";

const SOURCE_COLORS: Record<string, string> = {
  merrjep: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  celesi: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  mirlir: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  njoftime: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

interface ListingCardProps {
  listing: Listing;
  variant?: "default" | "compact";
}

export default function ListingCard({ listing, variant = "default" }: ListingCardProps) {
  const [imgError, setImgError] = useState(false);
  const firstImage = listing.images[0];
  const priceText = listing.price
    ? `€${listing.price.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`
    : "Pa çmim";
  const periodSuffix =
    listing.price_period === "monthly" ? "/muaj" : "";

  const isCompact = variant === "compact";

  return (
    <Link
      href={buildListingPath(listing.title, listing.city, listing.id)}
      className={`group block overflow-hidden bg-white shadow-sm transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${
        isCompact
          ? "rounded-xl border border-warm-gray-light/60"
          : "rounded-2xl border border-warm-gray-light/40"
      }`}
    >
      {/* Image */}
      <div className={`relative overflow-hidden bg-cream-dark ${isCompact ? "aspect-[3/2]" : "aspect-[4/3]"}`}>
        {firstImage && !imgError ? (
          <Image
            src={firstImage}
            alt={listing.title}
            fill
            sizes={isCompact ? "(max-width: 640px) 100vw, 384px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            className="object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-warm-gray-light">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
              />
            </svg>
          </div>
        )}

        {/* Badges */}
        <div className={`absolute left-2 top-2 flex gap-1.5 ${isCompact ? "text-[10px]" : ""}`}>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[listing.source] ?? "bg-gray-50 text-gray-700 ring-1 ring-gray-200"}`}
          >
            {listing.source}
          </span>
          {listing.transaction_type && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                listing.transaction_type === "sale"
                  ? "bg-terracotta text-white"
                  : "bg-gold text-navy"
              }`}
            >
              {listing.transaction_type === "sale" ? "Shitje" : "Qira"}
            </span>
          )}
        </div>

        {/* Image count */}
        {listing.image_count > 1 && (
          <span className="absolute bottom-2 right-2 rounded-md bg-navy/60 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
            {listing.image_count} foto
          </span>
        )}
      </div>

      {/* Content */}
      <div className={isCompact ? "p-3" : "p-4"}>
        {/* Price */}
        <div className={`font-bold text-navy ${isCompact ? "text-base" : "text-lg"}`}>
          {priceText}
          {periodSuffix && (
            <span className="text-sm font-normal text-warm-gray">
              {periodSuffix}
            </span>
          )}
        </div>

        {/* Details row */}
        <div className="mt-1.5 flex items-center gap-3 text-sm text-warm-gray">
          {listing.room_config && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {listing.room_config}
            </span>
          )}
          {listing.area_sqm && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
              {listing.area_sqm} m²
            </span>
          )}
          {!isCompact && listing.floor != null && (
            <span>
              Kati {listing.floor}
              {listing.total_floors ? `/${listing.total_floors}` : ""}
            </span>
          )}
        </div>

        {/* Location */}
        <div className="mt-1.5 flex items-center gap-1 truncate text-sm text-warm-gray">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {[listing.neighborhood, listing.city].filter(Boolean).join(", ")}
        </div>

        {/* Title */}
        {!isCompact && (
          <h3 className="mt-1.5 truncate text-sm font-medium text-navy/80 group-hover:text-terracotta">
            {listing.title}
          </h3>
        )}
      </div>
    </Link>
  );
}
