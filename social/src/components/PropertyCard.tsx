import React from "react";
import { Img, interpolate, useCurrentFrame } from "remotion";
import { colors, fonts, radii } from "../tokens/design";
import { SourceBadge, TransactionBadge } from "./Badge";
import type { Listing } from "../data/listings";

export const PropertyCard: React.FC<{
  listing: Listing;
  delay?: number;
  showSource?: boolean;
  compact?: boolean;
}> = ({ listing, delay = 0, showSource = true, compact = false }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const moveY = interpolate(frame, [delay, delay + 12], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [delay, delay + 12], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const hasImage = listing.images.length > 0;
  const price = listing.price
    ? new Intl.NumberFormat("de-DE").format(listing.price)
    : null;

  const cardHeight = compact ? 200 : 320;
  const imageHeight = compact ? 120 : 200;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${moveY}px) scale(${scale})`,
        width: "100%",
        height: cardHeight,
        borderRadius: radii.card,
        backgroundColor: colors.white,
        border: `1px solid ${colors.warmGrayLight}80`,
        boxShadow: "0 4px 16px rgba(27,42,74,0.08)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Image */}
      <div
        style={{
          height: imageHeight,
          backgroundColor: colors.creamDark,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {hasImage ? (
          <Img
            src={listing.images[0]}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.warmGray,
              fontFamily: fonts.sans,
              fontSize: 14,
            }}
          >
            Pa foto
          </div>
        )}

        {/* Badges overlay */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            display: "flex",
            gap: 6,
          }}
        >
          <TransactionBadge type={listing.transaction_type} size={11} />
          {showSource && <SourceBadge source={listing.source} size={11} />}
        </div>
      </div>

      {/* Details */}
      <div
        style={{
          padding: compact ? "8px 12px" : "12px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          flex: 1,
        }}
      >
        {price && (
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: compact ? 18 : 22,
              fontWeight: 700,
              color: colors.navy,
            }}
          >
            {price} \u20AC
          </div>
        )}
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: compact ? 11 : 13,
            color: colors.warmGray,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {listing.room_config && <span>{listing.room_config}</span>}
          {listing.area_sqm && <span>{listing.area_sqm} m\u00B2</span>}
          {listing.city && (
            <span style={{ color: colors.terracotta }}>{listing.city}</span>
          )}
        </div>
      </div>
    </div>
  );
};
