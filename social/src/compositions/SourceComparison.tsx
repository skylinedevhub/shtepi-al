import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  spring,
  Easing,
} from "remotion";
import { colors, fonts, radii, shadows } from "../tokens/design";
import { Logo } from "../components/Logo";
import { Watermark } from "../components/Background";
import { GrainOverlay } from "../components/Grain";
import { AnimatedRule, CornerFrame, FloatingDots, AnimatedPie } from "../components/Decorative";
import { priceBySource, liveStats } from "../data/listings";

/**
 * Source Comparison — dark editorial comparing all 5 aggregated sources.
 * Elevated with noise-based floating orbs, eased reveals, and film grain.
 */
export const SourceComparison: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sources = priceBySource();
  const maxAvgSale = Math.max(...sources.map((s) => s.avgSale), 1);

  const fadeIn = (delay: number, dur = 14) =>
    interpolate(frame, [delay, delay + dur], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

  const dotColors = [
    colors.terracotta,
    colors.gold,
    colors.cream,
    colors.warmGrayLight,
    colors.warmGray,
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(165deg, ${colors.navy} 0%, #162038 50%, ${colors.navyLight} 100%)`,
      }}
    >
      {/* Atmospheric glows */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse at 20% 80%, ${colors.terracotta}0C 0%, transparent 45%),
            radial-gradient(ellipse at 80% 15%, ${colors.gold}0A 0%, transparent 40%)
          `,
        }}
      />

      {/* Floating orbs for depth */}
      <FloatingDots count={4} color={`${colors.gold}08`} maxRadius={200} />

      {/* Corner frames */}
      <CornerFrame position="top-right" delay={3} color={`${colors.gold}20`} />
      <CornerFrame position="bottom-left" delay={5} color={`${colors.gold}20`} />

      {/* ── Header ── */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "40px 44px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <Logo size={30} variant="light" />
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 11,
              fontWeight: 700,
              color: colors.gold,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginTop: 16,
            }}
          >
            Krahasim burimesh
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 32,
              fontWeight: 700,
              color: colors.cream,
              lineHeight: 1.2,
              marginTop: 4,
            }}
          >
            5 burime, një platformë
          </div>
          <div style={{ marginTop: 10 }}>
            <AnimatedRule width={50} delay={6} color={colors.gold} />
          </div>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 13,
              color: `${colors.cream}80`,
              marginTop: 8,
              letterSpacing: 0.3,
            }}
          >
            {new Intl.NumberFormat("de-DE").format(liveStats.total_listings)} prona nga {sources.length} faqe
          </div>
        </div>
      </div>

      {/* ── Source Cards ── */}
      <div
        style={{
          position: "absolute",
          top: 218,
          left: 40,
          right: 40,
          bottom: 62,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {sources.map((source, i) => {
          const delay = 8 + i * 5;
          const opacity = fadeIn(delay);
          const slideX = interpolate(frame, [delay, delay + 16], [24, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          });

          const barWidth = (source.avgSale / maxAvgSale) * 100;
          const barProgress = interpolate(
            frame,
            [delay + 8, delay + 28],
            [0, 1],
            {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }
          );

          return (
            <div
              key={source.name}
              style={{
                opacity,
                transform: `translateX(${slideX}px)`,
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                borderRadius: radii.card,
                backgroundColor: `${colors.cream}06`,
                border: `1px solid ${colors.cream}0A`,
                backdropFilter: "blur(4px)",
              }}
            >
              {/* Rank + Source name */}
              <div style={{ width: 120, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: dotColors[i],
                      boxShadow: `0 0 8px ${dotColors[i]}40`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: fonts.sans,
                      fontSize: 15,
                      fontWeight: 700,
                      color: colors.cream,
                      textTransform: "capitalize",
                    }}
                  >
                    {source.name}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 11,
                    color: `${colors.cream}60`,
                    marginTop: 3,
                    marginLeft: 18,
                  }}
                >
                  {new Intl.NumberFormat("de-DE").format(source.realTotal)} prona
                </div>
              </div>

              {/* Bar chart */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    height: 18,
                    backgroundColor: `${colors.cream}08`,
                    borderRadius: 9,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${barWidth}%`,
                      background:
                        i === 0
                          ? `linear-gradient(90deg, ${colors.terracotta}, ${colors.terracottaDark})`
                          : i === 1
                            ? `linear-gradient(90deg, ${colors.gold}, ${colors.terracotta}90)`
                            : `linear-gradient(90deg, ${colors.navyLight}, ${colors.warmGray}80)`,
                      borderRadius: 9,
                      transform: `scaleX(${barProgress})`,
                      transformOrigin: "left",
                      boxShadow: i < 2 ? `0 0 12px ${dotColors[i]}30` : "none",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginTop: 5,
                    fontFamily: fonts.sans,
                    fontSize: 10,
                    color: `${colors.cream}50`,
                    letterSpacing: 0.3,
                  }}
                >
                  <span>{source.saleCount} shitje</span>
                  <span>{source.rentCount} qira</span>
                </div>
              </div>

              {/* Avg price */}
              <div style={{ textAlign: "right", flexShrink: 0, width: 130 }}>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 22,
                    fontWeight: 700,
                    color: colors.cream,
                    lineHeight: 1,
                  }}
                >
                  {source.avgSale > 0
                    ? new Intl.NumberFormat("de-DE").format(source.avgSale)
                    : "\u2014"}
                  <span
                    style={{
                      fontSize: 13,
                      color: `${colors.cream}60`,
                      marginLeft: 3,
                    }}
                  >
                    {source.avgSale > 0 ? "€" : ""}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 10,
                    color: `${colors.cream}40`,
                    marginTop: 3,
                    letterSpacing: 0.3,
                  }}
                >
                  mesatar shitje
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Film grain — lighter on dark */}
      <GrainOverlay intensity={0.035} />

      {/* Bottom accent */}
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
