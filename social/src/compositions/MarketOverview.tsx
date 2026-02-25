import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { colors, fonts, radii, shadows } from "../tokens/design";
import { Logo } from "../components/Logo";
import { AccentBar, Watermark } from "../components/Background";
import { GrainOverlay } from "../components/Grain";
import { AnimatedRule, CornerFrame, FloatingDots, AnimatedPie } from "../components/Decorative";
import { allListings, getStats, liveStats } from "../data/listings";

/**
 * Market Overview — editorial infographic with real production data.
 * Elevated with film grain, eased animations, decorative framing,
 * and confident negative space.
 */
export const MarketOverview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stats = getStats();

  // Source breakdown from production stats
  const sourceData = Object.entries(liveStats.by_source)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Room config distribution from sample
  const roomConfigs = Object.entries(
    allListings.reduce(
      (acc, l) => {
        if (l.room_config) acc[l.room_config] = (acc[l.room_config] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Price distribution for sale
  const salePrices = allListings.filter(
    (l) => l.transaction_type === "sale" && l.price
  );
  const priceBuckets = [
    { label: "<50k", count: salePrices.filter((l) => l.price! < 50000).length },
    { label: "50-100k", count: salePrices.filter((l) => l.price! >= 50000 && l.price! < 100000).length },
    { label: "100-200k", count: salePrices.filter((l) => l.price! >= 100000 && l.price! < 200000).length },
    { label: "200-500k", count: salePrices.filter((l) => l.price! >= 200000 && l.price! < 500000).length },
    { label: "500k+", count: salePrices.filter((l) => l.price! >= 500000).length },
  ];
  const maxBucket = Math.max(...priceBuckets.map((b) => b.count), 1);

  // ── Eased animations ──
  const fadeIn = (delay: number, dur = 14) =>
    interpolate(frame, [delay, delay + dur], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  const slideUp = (delay: number, dist = 18) =>
    interpolate(frame, [delay, delay + 16], [dist, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

  const sourceColors = [
    colors.terracotta,
    colors.gold,
    colors.navy,
    colors.navyLight,
    colors.warmGray,
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: colors.cream }}>
      {/* Subtle warm gradient wash */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse at 15% 15%, ${colors.gold}08 0%, transparent 50%),
            radial-gradient(ellipse at 85% 85%, ${colors.terracotta}06 0%, transparent 50%)
          `,
        }}
      />

      {/* Floating decorative dots */}
      <FloatingDots count={5} color={`${colors.gold}08`} maxRadius={160} />

      {/* Corner frames for editorial feel */}
      <CornerFrame position="top-left" delay={2} color={`${colors.gold}25`} />
      <CornerFrame position="bottom-right" delay={4} color={`${colors.gold}25`} />

      {/* ── Header ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "40px 44px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <Logo size={30} variant="dark" />
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 11,
              fontWeight: 700,
              color: colors.terracotta,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginTop: 16,
            }}
          >
            Pasqyra e tregut
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 34,
              fontWeight: 700,
              color: colors.navy,
              lineHeight: 1.15,
              marginTop: 4,
            }}
          >
            Tregu i pronave në Shqipëri
          </div>
          <div style={{ marginTop: 10 }}>
            <AnimatedRule width={50} delay={8} />
          </div>
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            fontWeight: 600,
            color: colors.white,
            padding: "6px 14px",
            borderRadius: 20,
            backgroundColor: colors.terracotta,
            marginTop: 4,
            letterSpacing: 0.5,
          }}
        >
          {new Date().toLocaleDateString("sq-AL", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>

      {/* ── Big Stats Row ── */}
      <div
        style={{
          position: "absolute",
          top: 200,
          left: 44,
          right: 44,
          display: "flex",
          gap: 14,
          opacity: fadeIn(5),
          transform: `translateY(${slideUp(5)}px)`,
        }}
      >
        {[
          { value: stats.totalActive, label: "Prona aktive", color: colors.navy },
          { value: stats.forSale, label: "Në shitje", color: colors.terracotta },
          { value: stats.forRent, label: "Me qira", color: colors.gold },
          { value: stats.sources, label: "Burime", color: colors.navyLight },
        ].map((stat, i) => {
          const scale = spring({
            fps,
            frame: frame - (8 + i * 3),
            config: { damping: 120, stiffness: 180 },
          });
          return (
            <div
              key={stat.label}
              style={{
                flex: 1,
                padding: "22px 16px",
                borderRadius: radii.card,
                backgroundColor: colors.white,
                border: `1px solid ${colors.warmGrayLight}40`,
                boxShadow: shadows.card,
                textAlign: "center",
                transform: `scale(${interpolate(scale, [0, 1], [0.92, 1])})`,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 38,
                  fontWeight: 700,
                  color: stat.color,
                  lineHeight: 1,
                }}
              >
                {stat.value.toLocaleString("de-DE")}
              </div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 11,
                  color: colors.warmGray,
                  marginTop: 8,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Price Distribution ── */}
      <div
        style={{
          position: "absolute",
          top: 340,
          left: 44,
          width: 470,
          opacity: fadeIn(14),
          transform: `translateY(${slideUp(14)}px)`,
        }}
      >
        <SectionLabel text="Shpërndarja e çmimeve (shitje)" />
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
          {priceBuckets.map((bucket, i) => {
            const barWidth = (bucket.count / maxBucket) * 100;
            const barProgress = interpolate(
              frame,
              [18 + i * 4, 38 + i * 4],
              [0, 1],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              }
            );
            return (
              <div key={bucket.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    fontWeight: 700,
                    color: colors.navy,
                    width: 58,
                    textAlign: "right",
                  }}
                >
                  {bucket.label}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 22,
                    backgroundColor: `${colors.warmGrayLight}25`,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${barWidth}%`,
                      backgroundColor:
                        i === 2 ? colors.terracotta
                          : i === 3 ? colors.gold
                            : colors.navy,
                      borderRadius: 6,
                      transform: `scaleX(${barProgress})`,
                      transformOrigin: "left",
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    fontWeight: 700,
                    color: colors.navy,
                    width: 28,
                    textAlign: "right",
                  }}
                >
                  {bucket.count}
                </span>
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 11,
            color: colors.warmGray,
            marginTop: 8,
            letterSpacing: 0.2,
          }}
        >
          Çmimi mesatar: {new Intl.NumberFormat("de-DE").format(stats.avgPrice)}€
        </div>
      </div>

      {/* ── Sources Breakdown with pie indicators ── */}
      <div
        style={{
          position: "absolute",
          top: 340,
          right: 44,
          width: 440,
          opacity: fadeIn(20),
          transform: `translateY(${slideUp(20)}px)`,
        }}
      >
        <SectionLabel text="Burimet" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          {sourceData.map(([source, count], i) => {
            const pct = count / stats.totalActive;
            return (
              <div
                key={source}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <AnimatedPie
                  progress={pct}
                  size={36}
                  color={sourceColors[i]}
                  bgColor={`${colors.warmGrayLight}20`}
                  delay={22 + i * 3}
                  strokeWidth={5}
                />
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 14,
                    fontWeight: 700,
                    color: colors.navy,
                    textTransform: "capitalize",
                    flex: 1,
                  }}
                >
                  {source}
                </span>
                <span
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 18,
                    fontWeight: 700,
                    color: colors.navy,
                  }}
                >
                  {count.toLocaleString("de-DE")}
                </span>
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 11,
                    color: colors.warmGray,
                    width: 36,
                    textAlign: "right",
                    fontWeight: 600,
                  }}
                >
                  {Math.round(pct * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Room Config ── */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 44,
          width: 470,
          opacity: fadeIn(28),
          transform: `translateY(${slideUp(28)}px)`,
        }}
      >
        <SectionLabel text="Konfigurimet më të njohura" />
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          {roomConfigs.map(([config, count], i) => (
            <div
              key={config}
              style={{
                flex: 1,
                padding: "16px 8px",
                borderRadius: radii.btn,
                backgroundColor: i === 0 ? colors.navy : colors.white,
                textAlign: "center",
                border: i === 0 ? "none" : `1px solid ${colors.warmGrayLight}40`,
                boxShadow: i === 0 ? shadows.cardLifted : shadows.card,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  fontWeight: 700,
                  color: i === 0 ? colors.cream : colors.navy,
                }}
              >
                {config}
              </div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 11,
                  color: i === 0 ? colors.warmGrayLight : colors.warmGray,
                  marginTop: 3,
                  fontWeight: 500,
                }}
              >
                {count} prona
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Property Types ── */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          right: 44,
          width: 440,
          opacity: fadeIn(32),
          transform: `translateY(${slideUp(32)}px)`,
        }}
      >
        <SectionLabel text="Lloji i pronës" />
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          {[
            { label: "Apartamente", count: liveStats.by_type.apartment ?? 0, color: colors.terracotta },
            { label: "Shtëpi", count: liveStats.by_type.house ?? 0, color: colors.gold },
            { label: "Vila", count: liveStats.by_type.villa ?? 0, color: colors.navy },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                padding: "18px 14px",
                borderRadius: radii.btn,
                backgroundColor: colors.white,
                border: `1px solid ${colors.warmGrayLight}40`,
                boxShadow: shadows.card,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 26,
                  fontWeight: 700,
                  color: item.color,
                  lineHeight: 1,
                }}
              >
                {item.count.toLocaleString("de-DE")}
              </div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 12,
                  color: colors.warmGray,
                  marginTop: 5,
                  fontWeight: 500,
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Film grain for editorial texture */}
      <GrainOverlay intensity={0.045} />

      <AccentBar height={5} />
      <Watermark />
    </AbsoluteFill>
  );
};

const SectionLabel: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      fontFamily: fonts.sans,
      fontSize: 10,
      fontWeight: 700,
      color: colors.warmGray,
      textTransform: "uppercase",
      letterSpacing: 2,
    }}
  >
    {text}
  </div>
);
