import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { MeshGradientBg } from "../components/MeshGradientBg";
import { Logo } from "../components/Logo";
import { AnimatedText } from "../components/AnimatedText";
import { StatCounter } from "../components/StatCounter";
import { SourceBadge } from "../components/SourceBadge";
import { CTAButton } from "../components/CTAButton";
import { colors, seconds } from "../lib/theme";
import { Lang, t } from "../lib/translations";

/*
 * Video 3: Stats & Sources Showcase
 * Structure:
 *   Scene 1 (0-3s):    Title - "Albania's Largest Property Search"
 *   Scene 2 (3-8s):    Animated stat counters (4 stats)
 *   Scene 3 (8-12s):   Source badges - "We aggregate from..."
 *   Scene 4 (12-15s):  Tagline + CTA outro
 * Total: ~15 seconds at 30fps = 450 frames
 */

export const STATS_DURATION = seconds(15);

export const StatsShowcase: React.FC<{ lang: Lang }> = ({ lang }) => {
  return (
    <AbsoluteFill>
      <MeshGradientBg variant="dark" />

      {/* Scene 1: Title */}
      <Sequence from={0} durationInFrames={seconds(4)}>
        <TitleScene lang={lang} />
      </Sequence>

      {/* Scene 2: Stats */}
      <Sequence from={seconds(3)} durationInFrames={seconds(6)}>
        <StatsScene lang={lang} />
      </Sequence>

      {/* Scene 3: Sources */}
      <Sequence from={seconds(8)} durationInFrames={seconds(5)}>
        <SourcesScene lang={lang} />
      </Sequence>

      {/* Scene 4: CTA Outro */}
      <Sequence from={seconds(12)} durationInFrames={seconds(3)}>
        <OutroScene lang={lang} />
      </Sequence>
    </AbsoluteFill>
  );
};

// --- Scene Components ---

const TitleScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();

  const fadeOut = interpolate(
    frame,
    [seconds(2.5), seconds(3.5)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        opacity: fadeOut,
      }}
    >
      <Logo size={72} delay={seconds(0.2)} variant="light" />
      <AnimatedText
        text={t("stats", "title", lang)}
        textStyle="heading"
        align="center"
        delay={seconds(0.5)}
        color={colors.cream}
        fontSize={72}
      />
      {/* Decorative gold line */}
      <div
        style={{
          width: 100,
          height: 4,
          background: colors.gold,
          borderRadius: 2,
          opacity: interpolate(frame, [seconds(0.9), seconds(1.3)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};

const StatsScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, seconds(0.3)], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [seconds(4.5), seconds(5.5)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 80,
        opacity,
      }}
    >
      <StatCounter
        value={50000}
        suffix="+"
        label={t("stats", "listingsLabel", lang)}
        delay={seconds(0.3)}
        variant="dark"
      />
      <div
        style={{
          width: 2,
          height: 100,
          background: `${colors.warmGray}44`,
          borderRadius: 1,
        }}
      />
      <StatCounter
        value={12}
        suffix="+"
        label={t("stats", "citiesLabel", lang)}
        delay={seconds(0.6)}
        variant="dark"
      />
      <div
        style={{
          width: 2,
          height: 100,
          background: `${colors.warmGray}44`,
          borderRadius: 1,
        }}
      />
      <StatCounter
        value={4}
        label={t("stats", "sourcesLabel", lang)}
        delay={seconds(0.9)}
        variant="dark"
      />
      <div
        style={{
          width: 2,
          height: 100,
          background: `${colors.warmGray}44`,
          borderRadius: 1,
        }}
      />
      <StatCounter
        value="24/7"
        label={t("stats", "updatedLabel", lang)}
        delay={seconds(1.2)}
        variant="dark"
      />
    </AbsoluteFill>
  );
};

const SourcesScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, seconds(0.3)], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [seconds(3.5), seconds(4.5)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        opacity,
      }}
    >
      <AnimatedText
        text={t("stats", "sourcesTitle", lang)}
        textStyle="subheading"
        align="center"
        delay={seconds(0.2)}
        color={colors.warmGrayLight}
        fontSize={32}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 24,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <SourceBadge
          name={t("stats", "source1", lang)}
          delay={seconds(0.4)}
        />
        <SourceBadge
          name={t("stats", "source2", lang)}
          delay={seconds(0.6)}
        />
        <SourceBadge
          name={t("stats", "source3", lang)}
          delay={seconds(0.8)}
        />
        <SourceBadge
          name={t("stats", "source4", lang)}
          delay={seconds(1.0)}
        />
      </div>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, seconds(0.3)], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        opacity: fadeIn,
      }}
    >
      <AnimatedText
        text={t("stats", "tagline", lang)}
        textStyle="heading"
        align="center"
        delay={seconds(0.2)}
        color={colors.cream}
        fontSize={60}
      />
      <CTAButton text={t("launch", "cta", lang)} delay={seconds(0.5)} />
      <Logo size={48} delay={seconds(0.9)} variant="light" />
    </AbsoluteFill>
  );
};
