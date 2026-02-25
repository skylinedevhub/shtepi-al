import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors, fonts } from "../tokens/design";

export const AnimatedNumber: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  size?: number;
  color?: string;
  delay?: number;
  duration?: number;
}> = ({
  value,
  prefix = "",
  suffix = "",
  size = 72,
  color = colors.navy,
  delay = 5,
  duration = 30,
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ease-out cubic for a satisfying count-up
  const eased = 1 - Math.pow(1 - progress, 3);
  const current = Math.round(value * eased);
  const formatted = new Intl.NumberFormat("de-DE").format(current);

  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        fontFamily: fonts.display,
        fontSize: size,
        fontWeight: 700,
        color,
        lineHeight: 1,
        display: "flex",
        alignItems: "baseline",
        gap: 8,
      }}
    >
      {prefix && (
        <span style={{ fontSize: size * 0.6, color: colors.warmGray }}>
          {prefix}
        </span>
      )}
      <span>{formatted}</span>
      {suffix && (
        <span style={{ fontSize: size * 0.45, color: colors.warmGray }}>
          {suffix}
        </span>
      )}
    </div>
  );
};
