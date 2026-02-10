import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts } from "../lib/theme";

// A feature card with icon, title, and description - animated entrance
export const FeatureCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  delay?: number;
  variant?: "light" | "dark";
}> = ({ icon, title, description, delay = 0, variant = "light" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const y = interpolate(entrance, [0, 1], [40, 0]);
  const scale = interpolate(entrance, [0, 1], [0.95, 1]);

  const bgColor = variant === "dark" ? colors.navyLight : colors.white;
  const titleColor = variant === "dark" ? colors.cream : colors.navy;
  const descColor = variant === "dark" ? colors.warmGrayLight : colors.warmGray;
  const iconBg = variant === "dark" ? colors.terracotta : colors.terracottaLight;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        background: bgColor,
        borderRadius: 24,
        padding: "40px 36px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow:
          variant === "dark"
            ? "0 8px 32px rgba(0,0,0,0.3)"
            : "0 4px 24px rgba(27,42,74,0.08)",
        border:
          variant === "dark"
            ? "none"
            : `1px solid ${colors.warmGrayLight}`,
        width: 480,
      }}
    >
      {/* Icon circle */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
        }}
      >
        {icon}
      </div>
      {/* Title */}
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 30,
          fontWeight: 700,
          color: titleColor,
        }}
      >
        {title}
      </div>
      {/* Description */}
      <div
        style={{
          fontFamily: fonts.sans,
          fontSize: 22,
          fontWeight: 400,
          color: descColor,
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </div>
  );
};
