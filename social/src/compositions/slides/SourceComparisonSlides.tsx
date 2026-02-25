import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts, radii, shadows } from "../../tokens/design";
import { Logo } from "../../components/Logo";
import { Watermark } from "../../components/Background";
import { StaticGrain } from "../../components/Grain";
import { priceBySource, liveStats } from "../../data/listings";

const sources = priceBySource();

const sourceColors = [
  colors.terracotta,
  colors.gold,
  colors.cream,
  colors.warmGrayLight,
  colors.warmGray,
];

/* ══════════════════════════════════════════════════
   SLIDE 1 — Title + total numbers
   ══════════════════════════════════════════════════ */
export const SourceSlide1: React.FC = () => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(170deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
    }}
  >
    {/* Atmospheric glow */}
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 20% 80%, ${colors.terracotta}08 0%, transparent 45%),
                     radial-gradient(ellipse at 80% 15%, ${colors.gold}06 0%, transparent 40%)`,
      }}
    />
    {/* Header */}
    <div style={{ position: "absolute", top: 40, left: 48 }}>
      <Logo size={34} variant="light" />
    </div>

    <div
      style={{
        position: "absolute",
        top: 160,
        left: 48,
        right: 48,
        bottom: 80,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 14,
          fontWeight: 600,
          color: colors.gold,
          textTransform: "uppercase",
          letterSpacing: 2,
        }}
      >
        Krahasim burimesh
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 44,
          fontWeight: 700,
          color: colors.cream,
          lineHeight: 1.15,
          marginTop: 8,
        }}
      >
        5 burime,{"\n"}një platformë
      </div>

      <div
        style={{
          width: 60,
          height: 4,
          backgroundColor: colors.gold,
          borderRadius: 2,
          marginTop: 28,
        }}
      />

      {/* Total stat */}
      <div
        style={{
          marginTop: 40,
          padding: "28px 24px",
          borderRadius: radii.card,
          backgroundColor: `${colors.cream}10`,
          border: `1px solid ${colors.cream}15`,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 64,
            fontWeight: 700,
            color: colors.cream,
            lineHeight: 1,
          }}
        >
          {new Intl.NumberFormat("de-DE").format(liveStats.total_listings)}
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 18,
            color: colors.warmGrayLight,
            marginTop: 10,
          }}
        >
          prona nga {sources.length} faqe të ndryshme
        </div>
      </div>

      {/* Source dots preview */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 40,
          justifyContent: "center",
        }}
      >
        {sources.map((s, i) => (
          <div
            key={s.name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: sourceColors[i],
              }}
            />
            <span
              style={{
                fontFamily: fonts.sans,
                fontSize: 12,
                fontWeight: 600,
                color: colors.warmGrayLight,
                textTransform: "capitalize",
              }}
            >
              {s.name}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "auto",
          fontFamily: fonts.sans,
          fontSize: 16,
          color: colors.warmGrayLight,
          textAlign: "center",
        }}
      >
        Rrëshqit për krahasim →
      </div>
    </div>

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
    <StaticGrain intensity={0.03} />
    <Watermark variant="light" />
  </AbsoluteFill>
);

/* ══════════════════════════════════════════════════
   SLIDE 2 — Top 3 sources detail
   ══════════════════════════════════════════════════ */
export const SourceSlide2: React.FC = () => {
  const top3 = sources.slice(0, 3);
  const maxTotal = top3[0].realTotal;

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(170deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
      }}
    >
      <div style={{ position: "absolute", top: 40, left: 48 }}>
        <Logo size={32} variant="light" />
      </div>

      <div
        style={{
          position: "absolute",
          top: 130,
          left: 48,
          right: 48,
          bottom: 80,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            fontWeight: 700,
            color: colors.gold,
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}
        >
          Top 3 burime
        </div>

        {top3.map((source, i) => {
          const barWidth = (source.realTotal / maxTotal) * 100;
          return (
            <SourceCard
              key={source.name}
              source={source}
              barWidth={barWidth}
              color={sourceColors[i]}
              rank={i + 1}
            />
          );
        })}
      </div>

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
      <StaticGrain intensity={0.03} />
    <Watermark variant="light" />
    </AbsoluteFill>
  );
};

/* ══════════════════════════════════════════════════
   SLIDE 3 — Remaining sources + price comparison
   ══════════════════════════════════════════════════ */
export const SourceSlide3: React.FC = () => {
  const remaining = sources.slice(3);
  const maxTotal = sources[0].realTotal;
  const maxAvgSale = Math.max(...sources.map((s) => s.avgSale), 1);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(170deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
      }}
    >
      <div style={{ position: "absolute", top: 40, left: 48 }}>
        <Logo size={32} variant="light" />
      </div>

      <div
        style={{
          position: "absolute",
          top: 130,
          left: 48,
          right: 48,
          bottom: 80,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Remaining sources */}
        {remaining.length > 0 && (
          <>
            <div
              style={{
                fontFamily: fonts.sans,
                fontSize: 12,
                fontWeight: 700,
                color: colors.gold,
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 20,
              }}
            >
              Burime të tjera
            </div>
            {remaining.map((source, i) => (
              <div key={source.name} style={{ marginBottom: 20 }}>
                <SourceCard
                  source={source}
                  barWidth={(source.realTotal / maxTotal) * 100}
                  color={sourceColors[i + 3]}
                  rank={i + 4}
                />
              </div>
            ))}
          </>
        )}

        {/* Price comparison table */}
        <div
          style={{
            marginTop: 24,
            fontFamily: fonts.sans,
            fontSize: 12,
            fontWeight: 700,
            color: colors.gold,
            textTransform: "uppercase",
            letterSpacing: 1.5,
            marginBottom: 16,
          }}
        >
          Çmimi mesatar (shitje)
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {sources
            .filter((s) => s.avgSale > 0)
            .map((source, i) => (
              <div
                key={source.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: radii.btn,
                  backgroundColor: `${colors.cream}08`,
                  border: `1px solid ${colors.cream}10`,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.sans,
                    fontSize: 15,
                    fontWeight: 700,
                    color: colors.cream,
                    textTransform: "capitalize",
                    width: 100,
                  }}
                >
                  {source.name}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 14,
                    backgroundColor: `${colors.cream}10`,
                    borderRadius: 7,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(source.avgSale / maxAvgSale) * 100}%`,
                      backgroundColor: sourceColors[sources.indexOf(source)],
                      borderRadius: 7,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 18,
                    fontWeight: 700,
                    color: colors.cream,
                    width: 100,
                    textAlign: "right",
                  }}
                >
                  {new Intl.NumberFormat("de-DE").format(source.avgSale)}€
                </span>
              </div>
            ))}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: "auto",
            textAlign: "center",
          }}
        >
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
            Kërko në shtepi.al
          </div>
        </div>
      </div>

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
      <StaticGrain intensity={0.03} />
    <Watermark variant="light" />
    </AbsoluteFill>
  );
};

/* ── Source card sub-component ── */
const SourceCard: React.FC<{
  source: ReturnType<typeof priceBySource>[number];
  barWidth: number;
  color: string;
  rank: number;
}> = ({ source, barWidth, color, rank }) => (
  <div
    style={{
      padding: "20px",
      borderRadius: radii.card,
      backgroundColor: `${colors.cream}08`,
      border: `1px solid ${colors.cream}12`,
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 20,
            fontWeight: 700,
            color,
            width: 28,
          }}
        >
          #{rank}
        </div>
        <span
          style={{
            fontFamily: fonts.sans,
            fontSize: 18,
            fontWeight: 700,
            color: colors.cream,
            textTransform: "capitalize",
          }}
        >
          {source.name}
        </span>
      </div>
      <span
        style={{
          fontFamily: fonts.display,
          fontSize: 24,
          fontWeight: 700,
          color: colors.cream,
        }}
      >
        {new Intl.NumberFormat("de-DE").format(source.realTotal)}
      </span>
    </div>

    {/* Bar */}
    <div
      style={{
        height: 10,
        backgroundColor: `${colors.cream}10`,
        borderRadius: 5,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${barWidth}%`,
          backgroundColor: color,
          borderRadius: 5,
        }}
      />
    </div>

    {/* Sub-stats */}
    <div
      style={{
        display: "flex",
        gap: 20,
        marginTop: 10,
        fontFamily: fonts.sans,
        fontSize: 13,
        color: colors.warmGrayLight,
      }}
    >
      <span>{source.saleCount} shitje</span>
      <span>{source.rentCount} qira</span>
      {source.avgSale > 0 && (
        <span>
          Mesatar: {new Intl.NumberFormat("de-DE").format(source.avgSale)}€
        </span>
      )}
    </div>
  </div>
);
