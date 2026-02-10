import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { MeshGradientBg } from "../components/MeshGradientBg";
import { Logo } from "../components/Logo";
import { AnimatedText } from "../components/AnimatedText";
import { FeatureCard } from "../components/FeatureCard";
import { CTAButton } from "../components/CTAButton";
import { colors, fonts, seconds } from "../lib/theme";
import { Lang, t } from "../lib/translations";

/*
 * Video 1: Launch Announcement
 * Structure:
 *   Scene 1 (0-3s):   Logo reveal + "Now Live" badge
 *   Scene 2 (3-6s):   Tagline + subtitle
 *   Scene 3 (6-13s):  Three feature cards
 *   Scene 4 (13-16s): CTA + logo outro
 * Total: ~16 seconds at 30fps = 480 frames
 */

export const LAUNCH_DURATION = seconds(16);

export const LaunchAnnouncement: React.FC<{ lang: Lang }> = ({ lang }) => {
  return (
    <AbsoluteFill>
      <MeshGradientBg variant="hero" />

      {/* Scene 1: Logo Reveal */}
      <Sequence from={0} durationInFrames={seconds(6)}>
        <LogoRevealScene lang={lang} />
      </Sequence>

      {/* Scene 2: Tagline + Subtitle */}
      <Sequence from={seconds(3)} durationInFrames={seconds(5)}>
        <TaglineScene lang={lang} />
      </Sequence>

      {/* Scene 3: Feature Cards */}
      <Sequence from={seconds(6)} durationInFrames={seconds(7)}>
        <FeaturesScene lang={lang} />
      </Sequence>

      {/* Scene 4: CTA Outro */}
      <Sequence from={seconds(13)} durationInFrames={seconds(3)}>
        <CTAScene lang={lang} />
      </Sequence>
    </AbsoluteFill>
  );
};

// --- Scene Components ---

const LogoRevealScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade out near end of scene
  const opacity = interpolate(frame, [seconds(4.5), seconds(5.5)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const badgeEntrance = spring({
    frame: frame - seconds(1),
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
        opacity,
      }}
    >
      <Logo size={120} delay={seconds(0.3)} />

      {/* "Now Live" badge */}
      <div
        style={{
          opacity: interpolate(badgeEntrance, [0, 1], [0, 1]),
          transform: `scale(${interpolate(badgeEntrance, [0, 1], [0.8, 1])})`,
          background: colors.terracotta,
          borderRadius: 40,
          padding: "12px 32px",
          fontFamily: fonts.sans,
          fontSize: 28,
          fontWeight: 700,
          color: colors.white,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {t("launch", "nowLive", lang)}
      </div>
    </AbsoluteFill>
  );
};

const TaglineScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, seconds(0.5)], [0, 1], {
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
        gap: 24,
        padding: "0 120px",
        opacity,
      }}
    >
      <AnimatedText
        text={t("launch", "tagline", lang)}
        textStyle="heading"
        align="center"
        delay={seconds(0.3)}
      />
      <AnimatedText
        text={t("launch", "subtitle", lang)}
        textStyle="subheading"
        align="center"
        delay={seconds(0.8)}
      />
    </AbsoluteFill>
  );
};

const FeaturesScene: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, seconds(0.3)], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [seconds(5.5), seconds(6.5)],
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
        gap: 40,
        padding: "0 80px",
        opacity,
      }}
    >
      <FeatureCard
        icon="&#127968;"
        title={t("launch", "feature1Title", lang)}
        description={t("launch", "feature1Desc", lang)}
        delay={seconds(0.3)}
      />
      <FeatureCard
        icon="&#128269;"
        title={t("launch", "feature2Title", lang)}
        description={t("launch", "feature2Desc", lang)}
        delay={seconds(0.8)}
      />
      <FeatureCard
        icon="&#128506;"
        title={t("launch", "feature3Title", lang)}
        description={t("launch", "feature3Desc", lang)}
        delay={seconds(1.3)}
      />
    </AbsoluteFill>
  );
};

const CTAScene: React.FC<{ lang: Lang }> = ({ lang }) => {
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
        gap: 40,
        opacity: fadeIn,
      }}
    >
      <Logo size={80} delay={seconds(0.2)} />
      <CTAButton text={t("launch", "cta", lang)} delay={seconds(0.5)} />
    </AbsoluteFill>
  );
};
