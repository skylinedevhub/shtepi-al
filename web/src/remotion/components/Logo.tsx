import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts } from "../lib/theme";

// Animated ShtëpiAL logo matching the site branding
export const Logo: React.FC<{
  size?: number;
  delay?: number;
  variant?: "light" | "dark";
}> = ({ size = 80, delay = 0, variant = "dark" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const scale = interpolate(entrance, [0, 1], [0.7, 1]);

  const shtëpiColor =
    variant === "dark" ? colors.terracotta : colors.terracotta;
  const alColor = variant === "dark" ? colors.navy : colors.cream;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        display: "flex",
        alignItems: "baseline",
        fontFamily: fonts.display,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.02em",
      }}
    >
      <span style={{ color: shtëpiColor }}>Shtepi</span>
      <span style={{ color: alColor }}>AL</span>
    </div>
  );
};
