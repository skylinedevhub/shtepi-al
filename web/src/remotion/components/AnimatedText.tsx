import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts } from "../lib/theme";

type TextStyle = "heading" | "subheading" | "body" | "label" | "cta";

const styleMap: Record<
  TextStyle,
  {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
    lineHeight: number;
  }
> = {
  heading: {
    fontFamily: fonts.display,
    fontSize: 72,
    fontWeight: 700,
    color: colors.navy,
    lineHeight: 1.15,
  },
  subheading: {
    fontFamily: fonts.sans,
    fontSize: 40,
    fontWeight: 500,
    color: colors.navyLight,
    lineHeight: 1.4,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 32,
    fontWeight: 400,
    color: colors.warmGray,
    lineHeight: 1.5,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: 24,
    fontWeight: 600,
    color: colors.terracotta,
    lineHeight: 1.3,
  },
  cta: {
    fontFamily: fonts.sans,
    fontSize: 36,
    fontWeight: 700,
    color: colors.white,
    lineHeight: 1.3,
  },
};

export const AnimatedText: React.FC<{
  text: string;
  textStyle?: TextStyle;
  delay?: number;
  color?: string;
  fontSize?: number;
  align?: "left" | "center" | "right";
  animation?: "fade-up" | "fade" | "scale";
}> = ({
  text,
  textStyle = "body",
  delay = 0,
  color,
  fontSize,
  align = "left",
  animation = "fade-up",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  let transform = "";
  if (animation === "fade-up") {
    const y = interpolate(entrance, [0, 1], [30, 0]);
    transform = `translateY(${y}px)`;
  } else if (animation === "scale") {
    const s = interpolate(entrance, [0, 1], [0.8, 1]);
    transform = `scale(${s})`;
  }

  const baseStyle = styleMap[textStyle];

  return (
    <div
      style={{
        ...baseStyle,
        opacity,
        transform,
        color: color ?? baseStyle.color,
        fontSize: fontSize ?? baseStyle.fontSize,
        textAlign: align,
        whiteSpace: "pre-line",
      }}
    >
      {text}
    </div>
  );
};
