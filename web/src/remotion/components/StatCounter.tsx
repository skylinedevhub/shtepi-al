import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts } from "../lib/theme";

// Animated stat counter with label - counts up from 0
export const StatCounter: React.FC<{
  value: number | string;
  label: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
  variant?: "light" | "dark";
}> = ({ value, label, prefix = "", suffix = "", delay = 0, variant = "light" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 80 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const scale = interpolate(entrance, [0, 1], [0.8, 1]);

  // Animate number counting up
  const numericValue = typeof value === "number" ? value : 0;
  const displayValue =
    typeof value === "number"
      ? `${prefix}${Math.round(interpolate(entrance, [0, 1], [0, numericValue])).toLocaleString()}${suffix}`
      : `${prefix}${value}${suffix}`;

  const valueColor = variant === "dark" ? colors.cream : colors.terracotta;
  const labelColor = variant === "dark" ? colors.warmGrayLight : colors.navy;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 72,
          fontWeight: 700,
          color: valueColor,
          letterSpacing: "-0.02em",
        }}
      >
        {displayValue}
      </div>
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 24,
          fontWeight: 500,
          color: labelColor,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>
    </div>
  );
};
