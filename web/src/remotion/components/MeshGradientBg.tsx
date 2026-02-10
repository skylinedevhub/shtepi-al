import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { colors } from "../lib/theme";

// Animated mesh gradient background matching the ShtëpiAL hero section
export const MeshGradientBg: React.FC<{
  variant?: "hero" | "dark" | "warm";
}> = ({ variant = "hero" }) => {
  const frame = useCurrentFrame();

  const shift = interpolate(frame, [0, 300], [0, 40], {
    extrapolateRight: "extend",
  });

  const bgColor =
    variant === "dark"
      ? colors.navy
      : variant === "warm"
        ? colors.creamDark
        : colors.cream;

  const grad1Color =
    variant === "dark" ? colors.navyLight : colors.terracottaLight;
  const grad2Color = variant === "dark" ? colors.terracotta : colors.goldLight;
  const grad3Color = variant === "dark" ? colors.gold : colors.terracottaLight;

  return (
    <AbsoluteFill
      style={{
        background: bgColor,
        overflow: "hidden",
      }}
    >
      {/* Radial gradient 1 */}
      <div
        style={{
          position: "absolute",
          width: "120%",
          height: "120%",
          top: `-${10 + shift * 0.3}%`,
          left: `-${10 + shift * 0.2}%`,
          background: `radial-gradient(ellipse at 30% 20%, ${grad1Color}88 0%, transparent 60%)`,
        }}
      />
      {/* Radial gradient 2 */}
      <div
        style={{
          position: "absolute",
          width: "120%",
          height: "120%",
          top: `${shift * 0.2}%`,
          right: `-${10 + shift * 0.15}%`,
          background: `radial-gradient(ellipse at 70% 60%, ${grad2Color}66 0%, transparent 55%)`,
        }}
      />
      {/* Radial gradient 3 */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          bottom: `-${shift * 0.25}%`,
          left: `${20 + shift * 0.1}%`,
          background: `radial-gradient(ellipse at 50% 80%, ${grad3Color}44 0%, transparent 50%)`,
        }}
      />
    </AbsoluteFill>
  );
};
