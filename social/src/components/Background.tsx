import React from "react";
import { AbsoluteFill } from "remotion";
import { colors, fonts } from "../tokens/design";

export const CreamBackground: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <AbsoluteFill style={{ backgroundColor: colors.cream }}>
    <AbsoluteFill
      style={{
        backgroundImage: `radial-gradient(${colors.warmGrayLight}25 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }}
    />
    {children}
  </AbsoluteFill>
);

export const NavyBackground: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(145deg, ${colors.navy} 0%, ${colors.navyLight} 100%)`,
    }}
  >
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 80% 20%, ${colors.gold}15 0%, transparent 50%)`,
      }}
    />
    {children}
  </AbsoluteFill>
);

export const AccentBar: React.FC<{
  position?: "top" | "bottom";
  height?: number;
}> = ({ position = "bottom", height = 6 }) => (
  <div
    style={{
      position: "absolute",
      [position]: 0,
      left: 0,
      right: 0,
      height,
      background: `linear-gradient(90deg, ${colors.gold}, ${colors.terracotta})`,
    }}
  />
);

export const Watermark: React.FC<{ variant?: "light" | "dark" }> = ({
  variant = "dark",
}) => {
  const textColor = variant === "light" ? colors.cream : colors.navy;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 28,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        opacity: 0.5,
      }}
    >
      <div
        style={{
          width: 28,
          height: 2,
          backgroundColor: colors.gold,
          borderRadius: 1,
        }}
      />
      <span
        style={{
          fontFamily: fonts.sans,
          fontSize: 13,
          color: textColor,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        shtepi.al
      </span>
      <div
        style={{
          width: 28,
          height: 2,
          backgroundColor: colors.gold,
          borderRadius: 1,
        }}
      />
    </div>
  );
};
