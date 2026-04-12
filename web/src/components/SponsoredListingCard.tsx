"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Listing } from "@/lib/types";
import ListingCard from "./ListingCard";
import SponsoredBadge from "./SponsoredBadge";

interface SponsoredListingCardProps {
  listing: Listing;
  campaignId: string;
  variant?: "default" | "compact";
  onImpression?: (campaignId: string, listingId: string) => void;
  onClick?: (campaignId: string, listingId: string) => void;
}

/**
 * Wraps ListingCard with a gold accent border, sponsored badge,
 * and IntersectionObserver-based impression tracking.
 *
 * An impression is fired when the card is 50% visible for 1 second.
 */
export default function SponsoredListingCard({
  listing,
  campaignId,
  variant = "default",
  onImpression,
  onClick,
}: SponsoredListingCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const impressionFired = useRef(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || impressionFired.current || !onImpression) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionFired.current) {
          // Start 1-second timer when 50% visible
          timer = setTimeout(() => {
            if (!impressionFired.current) {
              impressionFired.current = true;
              onImpression(campaignId, listing.id);
            }
          }, 1000);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [campaignId, listing.id, onImpression]);

  const handleClick = useCallback(() => {
    onClick?.(campaignId, listing.id);
  }, [campaignId, listing.id, onClick]);

  return (
    <div
      ref={cardRef}
      className="relative"
      data-campaign-id={campaignId}
      onClick={handleClick}
    >
      {/* Gold left border accent */}
      <div className="rounded-xl border-l-[3px] border-[#D4A843]/60">
        <ListingCard listing={listing} variant={variant} />
      </div>

      {/* Sponsored badge overlay */}
      <div className="absolute left-3 top-3 z-10">
        <SponsoredBadge variant={variant === "compact" ? "compact" : "default"} />
      </div>
    </div>
  );
}
