import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { colors, fonts, radii, shadows, SOURCE_COLORS, TRANSACTION_COLORS } from "../tokens/design";
import { Logo } from "../components/Logo";
import { AccentBar, Watermark } from "../components/Background";
import { GrainOverlay } from "../components/Grain";
import { AnimatedRule, CornerFrame } from "../components/Decorative";
import { listingsWithImages } from "../data/listings";

/**
 * Featured Listing — cinematic single property showcase.
 * Elevated with film grain, dramatic gradient overlays,
 * spring-based reveals, and editorial framing details.
 */
export const FeaturedListing: React.FC<{
  listingIndex?: number;
}> = ({ listingIndex = 4 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const listing = listingsWithImages[listingIndex % listingsWithImages.length];

  const price = listing.price
    ? new Intl.NumberFormat("de-DE").format(listing.price)
    : null;

  const amenities: string[] = [];
  if (listing.room_config) amenities.push(listing.room_config);
  if (listing.area_sqm) amenities.push(`${listing.area_sqm} m\u00B2`);
  if (listing.rooms) amenities.push(`${listing.rooms} dhoma`);
  if (listing.bathrooms) amenities.push(`${listing.bathrooms} banjo`);

  const features: string[] = [];
  if (listing.is_new_build) features.push("Nd\u00EBrtim i ri");
  if (listing.has_elevator) features.push("Ashensor");
  if (listing.has_parking) features.push("Parking");
  if (listing.is_furnished) features.push("I mobiluar");

  const srcStyle = SOURCE_COLORS[listing.source] ?? SOURCE_COLORS.merrjep;
  const txStyle = TRANSACTION_COLORS[listing.transaction_type] ?? TRANSACTION_COLORS.sale;
  const txLabel = listing.transaction_type === "rent" ? "Qira" : "Shitje";

  // ── Cinematic image zoom ──
  const imageScale = interpolate(frame, [0, durationInFrames], [1.0, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // ── Panel reveal with spring ──
  const panelSpring = spring({
    fps,
    frame: frame - 6,
    config: { damping: 100, stiffness: 150 },
  });
  const panelY = interpolate(panelSpring, [0, 1], [40, 0]);
  const panelOpacity = interpolate(frame, [4, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // ── Price spring ──
  const priceSpring = spring({
    fps,
    frame: frame - 14,
    config: { damping: 80, stiffness: 200 },
  });

  // ── Staggered detail entrance ──
  const detailIn = (delay: number) =>
    interpolate(frame, [delay, delay + 12], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  const detailSlide = (delay: number) =>
    interpolate(frame, [delay, delay + 12], [10, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

  const secondaryImages = listing.images.slice(1, 4);
  const hasSecondary = secondaryImages.length > 0;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navy }}>
      {/* ── Hero Image ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: hasSecondary ? "52%" : "58%",
          overflow: "hidden",
        }}
      >
        {listing.images[0] && (
          <Img
            src={listing.images[0]}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${imageScale})`,
            }}
          />
        )}

        {/* Cinematic gradient — richer layered overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "70%",
            background: `linear-gradient(
              transparent 0%,
              ${colors.navy}30 30%,
              ${colors.navy}B0 70%,
              ${colors.navy}E8 100%
            )`,
          }}
        />

        {/* Top vignette */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 140,
            background: `linear-gradient(${colors.navy}80, transparent)`,
          }}
        />

        {/* Logo */}
        <div style={{ position: "absolute", top: 38, left: 44 }}>
          <Logo size={32} variant="light" />
        </div>

        {/* Corner frame on image */}
        <CornerFrame position="top-right" delay={2} size={24} color={`${colors.gold}35`} />

        {/* Badges */}
        <div
          style={{
            position: "absolute",
            top: 38,
            right: 44,
            display: "flex",
            gap: 8,
            opacity: detailIn(4),
          }}
        >
          <span
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              fontWeight: 600,
              padding: "7px 16px",
              borderRadius: 20,
              backgroundColor: txStyle.bg,
              color: txStyle.text,
              letterSpacing: 0.3,
            }}
          >
            {txLabel}
          </span>
          <span
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              fontWeight: 600,
              padding: "7px 14px",
              borderRadius: 20,
              backgroundColor: srcStyle.bg,
              color: srcStyle.text,
              border: `1px solid ${srcStyle.border}`,
            }}
          >
            {listing.source}
          </span>
        </div>

        {/* City on image */}
        <div
          style={{
            position: "absolute",
            bottom: 22,
            left: 44,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: detailIn(10),
            transform: `translateY(${detailSlide(10)}px)`,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill={colors.terracotta}
            />
            <circle cx="12" cy="9" r="2.5" fill={colors.white} />
          </svg>
          <span
            style={{
              fontFamily: fonts.sans,
              fontSize: 15,
              fontWeight: 500,
              color: colors.cream,
              textShadow: shadows.textDrop,
            }}
          >
            {listing.city}
            {listing.neighborhood && (
              <span style={{ opacity: 0.6 }}>
                {" · "}
                {listing.neighborhood.split(",")[0]}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* ── Secondary image strip ── */}
      {hasSecondary && (
        <div
          style={{
            position: "absolute",
            top: "52%",
            left: 44,
            right: 44,
            height: 96,
            display: "flex",
            gap: 8,
            opacity: detailIn(16),
          }}
        >
          {secondaryImages.map((imgUrl, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                borderRadius: radii.btn,
                overflow: "hidden",
                border: `2px solid ${colors.navyLight}`,
              }}
            >
              <Img
                src={imgUrl}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </div>
          ))}
          {listing.images.length > 4 && (
            <div
              style={{
                width: 96,
                borderRadius: radii.btn,
                backgroundColor: `${colors.cream}08`,
                border: `2px solid ${colors.navyLight}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: fonts.sans,
                fontSize: 13,
                fontWeight: 700,
                color: `${colors.cream}80`,
                flexShrink: 0,
              }}
            >
              +{listing.images.length - 4}
            </div>
          )}
        </div>
      )}

      {/* ── Content Panel ── */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: hasSecondary ? "36%" : "42%",
          backgroundColor: colors.cream,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: "30px 44px 56px",
          display: "flex",
          flexDirection: "column",
          opacity: panelOpacity,
          transform: `translateY(${panelY}px)`,
          boxShadow: `0 -8px 40px ${colors.navy}30`,
        }}
      >
        {/* Price row */}
        {price && (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              transform: `scale(${interpolate(priceSpring, [0, 1], [0.9, 1])})`,
              transformOrigin: "left center",
            }}
          >
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 48,
                fontWeight: 700,
                color: colors.navy,
                lineHeight: 1,
              }}
            >
              {price}
            </span>
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 24,
                fontWeight: 600,
                color: colors.warmGray,
              }}
            >
              {listing.currency_original === "ALL" ? "ALL" : "\u20AC"}
            </span>
            {listing.transaction_type === "rent" && (
              <span
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  color: colors.warmGray,
                }}
              >
                /muaj
              </span>
            )}
          </div>
        )}

        {/* Animated divider under price */}
        <div style={{ marginTop: 12 }}>
          <AnimatedRule width={40} delay={18} height={2} color={colors.terracotta} />
        </div>

        {/* Amenities pills */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 14,
            flexWrap: "wrap",
            opacity: detailIn(20),
            transform: `translateY(${detailSlide(20)}px)`,
          }}
        >
          {amenities.map((item, i) => (
            <div
              key={i}
              style={{
                fontFamily: fonts.sans,
                fontSize: 15,
                fontWeight: 500,
                color: colors.foreground,
                padding: "8px 16px",
                borderRadius: radii.btn,
                backgroundColor: colors.white,
                border: `1px solid ${colors.warmGrayLight}50`,
                boxShadow: shadows.card,
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Feature tags */}
        {features.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 14,
              marginTop: 12,
              opacity: detailIn(24),
              transform: `translateY(${detailSlide(24)}px)`,
            }}
          >
            {features.map((feat, i) => (
              <span
                key={i}
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.terracotta,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 14 }}>{"\u2713"}</span> {feat}
              </span>
            ))}
          </div>
        )}

        {/* Poster / agency */}
        {listing.poster_name && (
          <div
            style={{
              marginTop: "auto",
              fontFamily: fonts.sans,
              fontSize: 12,
              color: colors.warmGray,
              opacity: detailIn(28),
              letterSpacing: 0.3,
            }}
          >
            {listing.poster_name}
          </div>
        )}
      </div>

      {/* Film grain */}
      <GrainOverlay intensity={0.04} />

      <AccentBar height={5} />
      <Watermark variant="dark" />
    </AbsoluteFill>
  );
};
