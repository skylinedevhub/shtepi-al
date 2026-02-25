import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts, radii, shadows } from "../../tokens/design";
import { Logo } from "../../components/Logo";
import { Watermark } from "../../components/Background";
import { StaticGrain } from "../../components/Grain";
import { allListings, getStats, liveStats } from "../../data/listings";

/* ── Shared slide shell with editorial details ── */
const SlideShell: React.FC<{
  children: React.ReactNode;
  bg?: string;
  variant?: "light" | "dark";
}> = ({ children, bg = colors.cream, variant = "light" }) => (
  <AbsoluteFill style={{ backgroundColor: bg }}>
    {/* Warm atmospheric gradient */}
    <AbsoluteFill
      style={{
        background: variant === "light"
          ? `radial-gradient(ellipse at 15% 10%, ${colors.gold}06 0%, transparent 50%),
             radial-gradient(ellipse at 85% 90%, ${colors.terracotta}04 0%, transparent 50%)`
          : "none",
      }}
    />
    {/* Header */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        padding: "44px 52px 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <Logo size={32} variant={variant === "light" ? "dark" : "light"} />
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 11,
          fontWeight: 600,
          color: colors.white,
          padding: "6px 14px",
          borderRadius: 20,
          backgroundColor: colors.terracotta,
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
    {/* Corner ornament */}
    <div
      style={{
        position: "absolute",
        top: 32,
        left: 32,
        width: 24,
        height: 24,
        borderTop: `1.5px solid ${variant === "light" ? colors.gold : colors.gold}30`,
        borderLeft: `1.5px solid ${variant === "light" ? colors.gold : colors.gold}30`,
        opacity: 0.4,
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: 32,
        right: 32,
        width: 24,
        height: 24,
        borderBottom: `1.5px solid ${variant === "light" ? colors.gold : colors.gold}30`,
        borderRight: `1.5px solid ${variant === "light" ? colors.gold : colors.gold}30`,
        opacity: 0.4,
      }}
    />
    {children}
    {/* Film grain */}
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
    <Watermark variant={variant === "light" ? undefined : "light"} />
  </AbsoluteFill>
);

/* ══════════════════════════════════════════════════
   SLIDE 1 — Title + headline numbers
   ══════════════════════════════════════════════════ */
export const MarketSlide1: React.FC = () => {
  const stats = getStats();

  return (
    <SlideShell>
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 48,
          right: 48,
          bottom: 80,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Subtitle */}
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 14,
            fontWeight: 600,
            color: colors.terracotta,
            textTransform: "uppercase",
            letterSpacing: 2,
          }}
        >
          Pasqyra e tregut
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 44,
            fontWeight: 700,
            color: colors.navy,
            lineHeight: 1.15,
            marginTop: 8,
          }}
        >
          Tregu i pronave{"\n"}në Shqipëri
        </div>

        {/* Divider */}
        <div
          style={{
            width: 60,
            height: 4,
            backgroundColor: colors.terracotta,
            borderRadius: 2,
            marginTop: 28,
          }}
        />

        {/* Big stat grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 40,
          }}
        >
          <StatCard
            value={stats.totalActive.toLocaleString("de-DE")}
            label="Prona aktive"
            color={colors.navy}
          />
          <StatCard
            value={stats.forSale.toLocaleString("de-DE")}
            label="Në shitje"
            color={colors.terracotta}
          />
          <StatCard
            value={stats.forRent.toLocaleString("de-DE")}
            label="Me qira"
            color={colors.gold}
          />
          <StatCard
            value={String(stats.sources)}
            label="Burime"
            color={colors.navyLight}
          />
        </div>

        {/* Bottom text */}
        <div
          style={{
            marginTop: "auto",
            fontFamily: fonts.sans,
            fontSize: 16,
            color: colors.warmGray,
            lineHeight: 1.5,
          }}
        >
          Rrëshqit për më shumë detaje →
        </div>
      </div>
    </SlideShell>
  );
};

/* ══════════════════════════════════════════════════
   SLIDE 2 — Price Distribution
   ══════════════════════════════════════════════════ */
export const MarketSlide2: React.FC = () => {
  const stats = getStats();
  const salePrices = allListings.filter(
    (l) => l.transaction_type === "sale" && l.price
  );
  const priceBuckets = [
    { label: "<50k", count: salePrices.filter((l) => l.price! < 50000).length },
    {
      label: "50-100k",
      count: salePrices.filter((l) => l.price! >= 50000 && l.price! < 100000).length,
    },
    {
      label: "100-200k",
      count: salePrices.filter((l) => l.price! >= 100000 && l.price! < 200000).length,
    },
    {
      label: "200-500k",
      count: salePrices.filter((l) => l.price! >= 200000 && l.price! < 500000).length,
    },
    { label: "500k+", count: salePrices.filter((l) => l.price! >= 500000).length },
  ];
  const maxBucket = Math.max(...priceBuckets.map((b) => b.count), 1);

  const barColors = [
    colors.navy,
    colors.navyLight,
    colors.terracotta,
    colors.gold,
    colors.navy,
  ];

  return (
    <SlideShell>
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 48,
          right: 48,
          bottom: 80,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SectionTitle text="Shpërndarja e çmimeve" subtitle="Prona në shitje" />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginTop: 36,
            flex: 1,
          }}
        >
          {priceBuckets.map((bucket, i) => {
            const barWidth = (bucket.count / maxBucket) * 100;
            return (
              <div
                key={bucket.label}
                style={{ display: "flex", alignItems: "center", gap: 14 }}
              >
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 16,
                    fontWeight: 700,
                    color: colors.navy,
                    width: 80,
                    textAlign: "right",
                  }}
                >
                  {bucket.label}€
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 36,
                    backgroundColor: colors.creamDark,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${barWidth}%`,
                      backgroundColor: barColors[i],
                      borderRadius: 8,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 20,
                    fontWeight: 700,
                    color: colors.navy,
                    width: 36,
                  }}
                >
                  {bucket.count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Average price callout */}
        <div
          style={{
            marginTop: 24,
            padding: "20px 24px",
            borderRadius: radii.card,
            backgroundColor: colors.white,
            border: `1px solid ${colors.warmGrayLight}60`,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 36,
              fontWeight: 700,
              color: colors.terracotta,
              lineHeight: 1,
            }}
          >
            {new Intl.NumberFormat("de-DE").format(stats.avgPrice)}€
          </div>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 14,
              color: colors.warmGray,
              lineHeight: 1.4,
            }}
          >
            Çmimi mesatar{"\n"}i pronave në shitje
          </div>
        </div>
      </div>
    </SlideShell>
  );
};

/* ══════════════════════════════════════════════════
   SLIDE 3 — Sources Breakdown
   ══════════════════════════════════════════════════ */
export const MarketSlide3: React.FC = () => {
  const stats = getStats();
  const sourceData = Object.entries(liveStats.by_source)
    .sort((a, b) => b[1] - a[1]);

  const sourceColors = [
    colors.terracotta,
    colors.gold,
    colors.navy,
    colors.navyLight,
    colors.warmGray,
  ];

  return (
    <SlideShell>
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 48,
          right: 48,
          bottom: 80,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SectionTitle text="Burimet" subtitle="Nga vijnë pronat" />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            marginTop: 36,
            flex: 1,
          }}
        >
          {sourceData.map(([source, count], i) => {
            const pct = Math.round((count / stats.totalActive) * 100);
            const barWidth = (count / sourceData[0][1]) * 100;
            return (
              <div key={source}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: sourceColors[i],
                      }}
                    />
                    <span
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 18,
                        fontWeight: 700,
                        color: colors.navy,
                        textTransform: "capitalize",
                      }}
                    >
                      {source}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: fonts.display,
                        fontSize: 24,
                        fontWeight: 700,
                        color: colors.navy,
                      }}
                    >
                      {new Intl.NumberFormat("de-DE").format(count)}
                    </span>
                    <span
                      style={{
                        fontFamily: fonts.sans,
                        fontSize: 14,
                        color: colors.warmGray,
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: 12,
                    backgroundColor: colors.creamDark,
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${barWidth}%`,
                      backgroundColor: sourceColors[i],
                      borderRadius: 6,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SlideShell>
  );
};

/* ══════════════════════════════════════════════════
   SLIDE 4 — Property Types + Room Configs
   ══════════════════════════════════════════════════ */
export const MarketSlide4: React.FC = () => {
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

  const propertyTypes = [
    { label: "Apartamente", count: liveStats.by_type.apartment ?? 0, color: colors.terracotta },
    { label: "Shtëpi", count: liveStats.by_type.house ?? 0, color: colors.gold },
    { label: "Vila", count: liveStats.by_type.villa ?? 0, color: colors.navy },
    { label: "Tokë", count: liveStats.by_type.land ?? 0, color: colors.navyLight },
  ];

  return (
    <SlideShell>
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 48,
          right: 48,
          bottom: 80,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <SectionTitle text="Llojet e pronave" subtitle="Çfarë ka në treg" />

        {/* Property type cards */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            marginTop: 36,
          }}
        >
          {propertyTypes.map((item) => (
            <div
              key={item.label}
              style={{
                flex: "1 1 calc(50% - 7px)",
                padding: "24px 20px",
                borderRadius: radii.card,
                backgroundColor: colors.white,
                border: `1px solid ${colors.warmGrayLight}60`,
                boxShadow: `0 2px 8px ${colors.navy}08`,
              }}
            >
              <div
                style={{
                  fontFamily: fonts.display,
                  fontSize: 36,
                  fontWeight: 700,
                  color: item.color,
                  lineHeight: 1,
                }}
              >
                {new Intl.NumberFormat("de-DE").format(item.count)}
              </div>
              <div
                style={{
                  fontFamily: fonts.sans,
                  fontSize: 15,
                  color: colors.warmGray,
                  marginTop: 6,
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Room configs */}
        <div style={{ marginTop: 40 }}>
          <div
            style={{
              fontFamily: fonts.sans,
              fontSize: 12,
              fontWeight: 700,
              color: colors.warmGray,
              textTransform: "uppercase",
              letterSpacing: 1.5,
              marginBottom: 14,
            }}
          >
            Konfigurimet më të njohura
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {roomConfigs.map(([config, count], i) => (
              <div
                key={config}
                style={{
                  flex: 1,
                  padding: "18px 10px",
                  borderRadius: radii.btn,
                  backgroundColor: i === 0 ? colors.navy : colors.creamDark,
                  textAlign: "center",
                  border:
                    i === 0 ? "none" : `1px solid ${colors.warmGrayLight}60`,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 22,
                    fontWeight: 700,
                    color: i === 0 ? colors.cream : colors.navy,
                  }}
                >
                  {config}
                </div>
                <div
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    color: i === 0 ? colors.warmGrayLight : colors.warmGray,
                    marginTop: 4,
                  }}
                >
                  {count} prona
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: "auto",
            fontFamily: fonts.sans,
            fontSize: 16,
            color: colors.warmGray,
          }}
        >
          shtepi.al — Kërko pronën tënde
        </div>
      </div>
    </SlideShell>
  );
};

/* ── Shared sub-components ── */

const StatCard: React.FC<{ value: string; label: string; color: string }> = ({
  value,
  label,
  color,
}) => (
  <div
    style={{
      flex: "1 1 calc(50% - 8px)",
      padding: "28px 20px",
      borderRadius: radii.card,
      backgroundColor: colors.white,
      border: `1px solid ${colors.warmGrayLight}35`,
      boxShadow: shadows.card,
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontFamily: fonts.display,
        fontSize: 44,
        fontWeight: 700,
        color,
        lineHeight: 1,
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontFamily: fonts.sans,
        fontSize: 13,
        color: colors.warmGray,
        marginTop: 10,
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      {label}
    </div>
  </div>
);

const SectionTitle: React.FC<{ text: string; subtitle: string }> = ({
  text,
  subtitle,
}) => (
  <div>
    <div
      style={{
        fontFamily: fonts.sans,
        fontSize: 12,
        fontWeight: 700,
        color: colors.terracotta,
        textTransform: "uppercase",
        letterSpacing: 2,
      }}
    >
      {subtitle}
    </div>
    <div
      style={{
        fontFamily: fonts.display,
        fontSize: 36,
        fontWeight: 700,
        color: colors.navy,
        lineHeight: 1.2,
        marginTop: 4,
      }}
    >
      {text}
    </div>
    <div
      style={{
        width: 50,
        height: 3,
        backgroundColor: colors.terracotta,
        borderRadius: 2,
        marginTop: 12,
      }}
    />
  </div>
);
