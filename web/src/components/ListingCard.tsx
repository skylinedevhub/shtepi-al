"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Listing } from "@/lib/types";
import { buildListingPath } from "@/lib/seo/slugs";
import { cn } from "@/lib/cn";
import FavoriteButton from "./FavoriteButton";
import SourceBadge from "./SourceBadge";

const SOURCE_COLORS: Record<string, string> = {
  merrjep: "bg-terracotta-light text-terracotta ring-1 ring-terracotta/20",
  celesi: "bg-gold-light text-navy ring-1 ring-gold/30",
  mirlir: "bg-navy/5 text-navy ring-1 ring-navy/10",
  njoftime: "bg-cream-dark text-warm-gray ring-1 ring-warm-gray-light",
  duashpi: "bg-gold-light/60 text-navy ring-1 ring-gold/20",
  shpi: "bg-terracotta/10 text-terracotta ring-1 ring-terracotta/15",
  indomio: "bg-navy/10 text-navy ring-1 ring-navy/15",
  century21: "bg-gold-light text-warm-gray ring-1 ring-gold/25",
  realestate: "bg-cream-dark/80 text-navy ring-1 ring-navy/10",
  propertyhub: "bg-terracotta-light/70 text-terracotta ring-1 ring-terracotta/15",
  kerko360: "bg-navy/5 text-warm-gray ring-1 ring-warm-gray-light/80",
  homezone: "bg-gold-light/40 text-navy ring-1 ring-gold/15",
  futurehome: "bg-cream-dark text-terracotta ring-1 ring-terracotta/10",
};

interface LastPriceChange {
  old_price: number;
  new_price: number;
  currency?: string;
  changed_at?: string;
}

interface ListingWithMeta extends Listing {
  metadata?: { last_price_change?: LastPriceChange } | null;
}

interface ListingCardProps {
  listing: Listing;
  variant?: "default" | "compact";
}

function PriceChangeBadge({ metadata }: { metadata?: { last_price_change?: LastPriceChange } | null }) {
  if (!metadata?.last_price_change) return null;
  const { old_price, new_price } = metadata.last_price_change;
  if (old_price == null || new_price == null) return null;

  const diff = new_price - old_price;
  if (diff === 0) return null;

  const decreased = diff < 0;
  const formatted = `€${Math.abs(diff).toLocaleString("de-DE", { maximumFractionDigits: 0 })}`;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
        decreased
          ? "bg-green-50 text-green-700 ring-1 ring-green-200"
          : "bg-red-50 text-red-700 ring-1 ring-red-200"
      )}
    >
      {decreased ? "↓" : "↑"} {formatted}
    </span>
  );
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
      className={cn(
        "group block overflow-hidden bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_32px_-8px_rgba(27,42,74,0.12)]",
        isCompact
          ? "rounded-xl border border-warm-gray-light/50"
          : "rounded-2xl border border-warm-gray-light/50"
      )}
    >
      {/* Image */}
      <div className={cn("relative overflow-hidden bg-cream-dark", isCompact ? "aspect-[3/2]" : "aspect-[4/3]")}>
        {firstImage && !imgError ? (
          <Image
            src={firstImage}
            alt={listing.title}
            fill
            sizes={isCompact ? "(max-width: 640px) 100vw, 384px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
            className="object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-warm-gray-light">
            <svg className="size-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
        <div className={cn("absolute left-2 top-2 flex gap-1.5", isCompact && "text-[10px]")}>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              SOURCE_COLORS[listing.source] ?? "bg-gray-50 text-gray-700 ring-1 ring-gray-200"
            )}
          >
            {listing.source}
          </span>
          {listing.transaction_type && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                listing.transaction_type === "sale"
                  ? "bg-terracotta text-white"
                  : "bg-gold text-navy"
              )}
            >
              {listing.transaction_type === "sale" ? "Shitje" : "Qira"}
            </span>
          )}
        </div>

        {/* Favorite button */}
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton listingId={listing.id} variant="overlay" />
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
        <div className={cn("flex items-center gap-2 font-bold tabular-nums text-navy", isCompact ? "text-base" : "text-lg")}>
          <span>
            {priceText}
            {periodSuffix && (
              <span className="text-sm font-normal text-warm-gray">
                {periodSuffix}
              </span>
            )}
          </span>
          <PriceChangeBadge metadata={(listing as ListingWithMeta).metadata} />
        </div>

        {/* Multi-source badge */}
        {listing.group_count && listing.group_count > 1 && listing.group_sources && (
          <div className="mt-1">
            <SourceBadge sources={listing.group_sources} count={listing.group_count} />
          </div>
        )}

        {/* Details row */}
        <div className="mt-1.5 flex items-center gap-3 text-sm text-warm-gray">
          {listing.room_config && (
            <span className="flex items-center gap-1">
              <svg className="size-3.5 text-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {listing.room_config}
            </span>
          )}
          {listing.area_sqm && (
            <span className="flex items-center gap-1">
              <svg className="size-3.5 text-warm-gray-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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

        {/* Location — only render when we have data */}
        {(listing.neighborhood || listing.city) && (
          <div className="mt-1.5 flex items-center gap-1 truncate text-sm text-warm-gray">
            <svg className="size-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {[listing.neighborhood, listing.city].filter(Boolean).join(", ")}
          </div>
        )}

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
