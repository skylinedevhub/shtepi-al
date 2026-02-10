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
import { StepIndicator } from "../components/StepIndicator";
import { CTAButton } from "../components/CTAButton";
import { colors, seconds } from "../lib/theme";
import { Lang, t } from "../lib/translations";

/*
 * Video 2: How It Works
 * Structure:
 *   Scene 1 (0-3s):    Title "How It Works"
 *   Scene 2 (3-7s):    Steps 1 & 2 (Search + Filter)
 *   Scene 3 (7-11s):   Steps 3 & 4 (Explore + Connect)
 *   Scene 4 (11-14s):  Tagline + CTA outro
 * Total: ~14 seconds at 30fps = 420 frames
 */

export const HOW_IT_WORKS_DURATION = seconds(14);

export const HowItWorks: React.FC<{ lang: Lang }> = ({ lang }) => {
  return (
    <AbsoluteFill>
      <MeshGradientBg variant="warm" />

      {/* Scene 1: Title */}
      <Sequence from={0} durationInFrames={seconds(4)}>
        <TitleScene lang={lang} />
      </Sequence>

      {/* Scene 2: Steps 1 & 2 */}
      <Sequence from={seconds(3)} durationInFrames={seconds(5)}>
        <StepsScene lang={lang} stepsToShow={[1, 2]} />
      </Sequence>

      {/* Scene 3: Steps 3 & 4 */}
      <Sequence from={seconds(7)} durationInFrames={seconds(5)}>
        <StepsScene lang={lang} stepsToShow={[3, 4]} />
      </Sequence>

      {/* Scene 4: Tagline + CTA */}
      <Sequence from={seconds(11)} durationInFrames={seconds(3)}>
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
        gap: 32,
        opacity: fadeOut,
      }}
    >
      <Logo size={72} delay={seconds(0.2)} />
      <AnimatedText
        text={t("howItWorks", "title", lang)}
        textStyle="heading"
        align="center"
        delay={seconds(0.5)}
        fontSize={80}
      />
      {/* Decorative line */}
      <div
        style={{
          width: 80,
          height: 4,
          background: colors.terracotta,
          borderRadius: 2,
          opacity: interpolate(frame, [seconds(0.8), seconds(1.2)], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};

const stepData = [
  { num: 1, titleKey: "step1Title", descKey: "step1Desc", icon: "1" },
  { num: 2, titleKey: "step2Title", descKey: "step2Desc", icon: "2" },
  { num: 3, titleKey: "step3Title", descKey: "step3Desc", icon: "3" },
  { num: 4, titleKey: "step4Title", descKey: "step4Desc", icon: "4" },
];

const StepsScene: React.FC<{
  lang: Lang;
  stepsToShow: number[];
}> = ({ lang, stepsToShow }) => {
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

  const steps = stepData.filter((s) => stepsToShow.includes(s.num));

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        padding: "0 200px",
        opacity,
      }}
    >
      {steps.map((step, i) => (
        <StepIndicator
          key={step.num}
          number={step.num}
          title={t("howItWorks", step.titleKey, lang)}
          description={t("howItWorks", step.descKey, lang)}
          delay={seconds(0.3 + i * 0.5)}
          isActive={i === 0}
        />
      ))}
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
        gap: 40,
        opacity: fadeIn,
      }}
    >
      <AnimatedText
        text={t("howItWorks", "tagline", lang)}
        textStyle="heading"
        align="center"
        delay={seconds(0.2)}
        fontSize={56}
      />
      <CTAButton text={t("launch", "cta", lang)} delay={seconds(0.6)} />
      <Logo size={48} delay={seconds(1)} />
    </AbsoluteFill>
  );
};
