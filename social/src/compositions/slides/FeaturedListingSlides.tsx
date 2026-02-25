import React from "react";
import { AbsoluteFill, Img } from "remotion";
import { colors, fonts, radii, shadows, SOURCE_COLORS, TRANSACTION_COLORS } from "../../tokens/design";
import { Logo } from "../../components/Logo";
import { Watermark } from "../../components/Background";
import { StaticGrain } from "../../components/Grain";
import { listingsWithImages, Listing } from "../../data/listings";

const listing = listingsWithImages[4 % listingsWithImages.length];

/* ══════════════════════════════════════════════════
   SLIDE 1 — Hero image with overlay info
   ══════════════════════════════════════════════════ */
export const FeaturedSlide1: React.FC = () => {
  const txStyle = TRANSACTION_COLORS[listing.transaction_type] ?? TRANSACTION_COLORS.sale;
  const txLabel = listing.transaction_type === "rent" ? "Qira" : "Shitje";
  const srcStyle = SOURCE_COLORS[listing.source] ?? SOURCE_COLORS.merrjep;

  const price = listing.price
    ? new Intl.NumberFormat("de-DE").format(listing.price)
    : null;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navy }}>
      {/* Hero image */}
      {listing.images[0] && (
        <Img
          src={listing.images[0]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {/* Gradient overlay bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "65%",
          background: `linear-gradient(transparent, ${colors.navy}F0)`,
        }}
      />

      {/* Top gradient for logo/badges */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 140,
          background: `linear-gradient(${colors.navy}A0, transparent)`,
        }}
      />

      {/* Logo */}
      <div style={{ position: "absolute", top: 40, left: 48 }}>
        <Logo size={34} variant="light" />
      </div>

      {/* Badges */}
      <div
        style={{
          position: "absolute",
          top: 40,
          right: 48,
          display: "flex",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            fontWeight: 600,
            padding: "8px 18px",
            borderRadius: 20,
            backgroundColor: txStyle.bg,
            color: txStyle.text,
          }}
        >
          {txLabel}
        </span>
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 16px",
            borderRadius: 20,
            backgroundColor: srcStyle.bg,
            color: srcStyle.text,
            border: `1px solid ${srcStyle.border}`,
          }}
        >
          {listing.source}
        </span>
      </div>

      {/* Bottom info block */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 48,
          right: 48,
        }}
      >
        {/* City */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill={colors.terracotta}
            />
            <circle cx="12" cy="9" r="2.5" fill={colors.white} />
          </svg>
          <span
            style={{
              fontFamily: fonts.sans,
              fontSize: 16,
              fontWeight: 500,
              color: colors.cream,
            }}
          >
            {listing.city}
            {listing.neighborhood && (
              <span style={{ opacity: 0.7 }}>
                {" "}
                · {listing.neighborhood.split(",")[0]}
              </span>
            )}
          </span>
        </div>

        {/* Price */}
        {price && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 56,
                fontWeight: 700,
                color: colors.cream,
                lineHeight: 1,
              }}
            >
              {price}
            </span>
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 28,
                fontWeight: 600,
                color: colors.warmGrayLight,
              }}
            >
              {listing.currency_original === "ALL" ? "ALL" : "€"}
            </span>
            {listing.transaction_type === "rent" && (
              <span
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 18,
                  color: colors.warmGrayLight,
                }}
              >
                /muaj
              </span>
            )}
          </div>
        )}

        {/* Swipe hint */}
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            color: colors.warmGrayLight,
            marginTop: 16,
          }}
        >
          Rrëshqit për detaje →
        </div>
      </div>

      <StaticGrain intensity={0.035} />
      {/* Bottom bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 5,
          background: `linear-gradient(90deg, ${colors.terracotta}, ${colors.gold})`,
        }}
      />
    </AbsoluteFill>
  );
};

/* ══════════════════════════════════════════════════
   SLIDE 2 — Details + amenities
   ══════════════════════════════════════════════════ */
export const FeaturedSlide2: React.FC = () => {
  const amenities: { icon: string; label: string; value: string }[] = [];
  if (listing.room_config)
    amenities.push({ icon: "🏠", label: "Konfigurim", value: listing.room_config });
  if (listing.area_sqm)
    amenities.push({ icon: "📐", label: "Sipërfaqe", value: `${listing.area_sqm} m²` });
  if (listing.rooms)
    amenities.push({ icon: "🛏", label: "Dhoma", value: String(listing.rooms) });
  if (listing.bathrooms)
    amenities.push({ icon: "🚿", label: "Banjo", value: String(listing.bathrooms) });

  const features: string[] = [];
  if (listing.is_new_build) features.push("Ndërtim i ri");
  if (listing.has_elevator) features.push("Ashensor");
  if (listing.has_parking) features.push("Parking");
  if (listing.is_furnished) features.push("I mobiluar");

  const price = listing.price
    ? new Intl.NumberFormat("de-DE").format(listing.price)
    : null;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.cream }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "40px 48px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Logo size={32} variant="dark" />
      </div>

      <div
        style={{
          position: "absolute",
          top: 120,
          left: 48,
          right: 48,
          bottom: 60,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Price recap */}
        {price && (
          <div
            style={{
              padding: "24px 28px",
              borderRadius: radii.card,
              backgroundColor: colors.navy,
              display: "flex",
              alignItems: "baseline",
              gap: 10,
            }}
          >
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 44,
                fontWeight: 700,
                color: colors.cream,
                lineHeight: 1,
              }}
            >
              {price}
            </span>
            <span
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                color: colors.warmGrayLight,
              }}
            >
              {listing.currency_original === "ALL" ? "ALL" : "€"}
              {listing.transaction_type === "rent" ? " /muaj" : ""}
            </span>
          </div>
        )}

        {/* Amenities grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            marginTop: 28,
          }}
        >
          {amenities.map((item) => (
            <div
              key={item.label}
              style={{
                flex: "1 1 calc(50% - 7px)",
                padding: "20px 18px",
                borderRadius: radii.card,
                backgroundColor: colors.white,
                border: `1px solid ${colors.warmGrayLight}40`,
                boxShadow: shadows.card,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.warmGray,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 28,
                  fontWeight: 700,
                  color: colors.navy,
                  marginTop: 6,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        {features.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 24,
            }}
          >
            {features.map((feat) => (
              <span
                key={feat}
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.terracotta,
                  padding: "10px 20px",
                  borderRadius: 24,
                  backgroundColor: colors.terracottaLight,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ✓ {feat}
              </span>
            ))}
          </div>
        )}

        {/* Poster */}
        {listing.poster_name && (
          <div
            style={{
              marginTop: "auto",
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.warmGray,
            }}
          >
            {listing.poster_name}
          </div>
        )}
      </div>

      <StaticGrain intensity={0.035} />
      {/* Bottom bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 5,
          background: `linear-gradient(90deg, ${colors.terracotta}, ${colors.gold})`,
        }}
      />
      <Watermark />
    </AbsoluteFill>
  );
};

/* ══════════════════════════════════════════════════
   SLIDE 3 — Gallery (secondary images)
   ══════════════════════════════════════════════════ */
export const FeaturedSlide3: React.FC = () => {
  const images = listing.images.slice(1, 5);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navy }}>
      {/* 2x2 image grid */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          right: 40,
          bottom: 200,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        {images.map((url, i) => (
          <div
            key={i}
            style={{
              flex: "1 1 calc(50% - 5px)",
              borderRadius: radii.card,
              overflow: "hidden",
            }}
          >
            <Img
              src={url}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
        ))}
        {images.length < 4 &&
          Array.from({ length: 4 - images.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                flex: "1 1 calc(50% - 5px)",
                borderRadius: radii.card,
                backgroundColor: `${colors.cream}10`,
              }}
            />
          ))}
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 48,
          right: 48,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 24,
            fontWeight: 700,
            color: colors.cream,
            marginBottom: 12,
          }}
        >
          {listing.images.length} foto në total
        </div>
        <div
          style={{
            display: "inline-flex",
            fontFamily: fonts.sans,
            fontSize: 16,
            fontWeight: 600,
            color: colors.navy,
            padding: "14px 32px",
            borderRadius: 28,
            backgroundColor: colors.gold,
          }}
        >
          Shiko në shtepi.al
        </div>
      </div>

      <StaticGrain intensity={0.035} />
      {/* Bottom bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 5,
          background: `linear-gradient(90deg, ${colors.gold}, ${colors.terracotta})`,
        }}
      />
      <Watermark variant="light" />
    </AbsoluteFill>
  );
};
