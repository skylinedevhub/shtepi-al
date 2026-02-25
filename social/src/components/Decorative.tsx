import React from "react";
import { interpolate, useCurrentFrame, Easing } from "remotion";
import { noise2D } from "@remotion/noise";
import { makePie } from "@remotion/shapes";
import { evolvePath } from "@remotion/paths";
import { colors, fonts } from "../tokens/design";

/**
 * Animated horizontal rule with terracotta/gold gradient.
 * Draws in from the left with eased timing.
 */
export const AnimatedRule: React.FC<{
  width?: number;
  delay?: number;
  height?: number;
  color?: string;
}> = ({ width = 60, delay = 0, height = 3, color = colors.terracotta }) => {
  const frame = useCurrentFrame();
  const scaleX = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: color,
        borderRadius: height / 2,
        transformOrigin: "left center",
        transform: `scaleX(${scaleX})`,
      }}
    />
  );
};

/**
 * Corner ornament — thin L-shaped lines for editorial framing.
 */
export const CornerFrame: React.FC<{
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size?: number;
  color?: string;
  thickness?: number;
  delay?: number;
}> = ({
  position,
  size = 30,
  color = `${colors.gold}40`,
  thickness = 1.5,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const isTop = position.includes("top");
  const isLeft = position.includes("left");

  return (
    <div
      style={{
        position: "absolute",
        [isTop ? "top" : "bottom"]: 28,
        [isLeft ? "left" : "right"]: 28,
        width: size,
        height: size,
        opacity,
        [isTop ? "borderTop" : "borderBottom"]: `${thickness}px solid ${color}`,
        [isLeft ? "borderLeft" : "borderRight"]: `${thickness}px solid ${color}`,
      }}
    />
  );
};

/**
 * Animated donut/pie chart using @remotion/shapes.
 * Used for showing percentages in a visually rich way.
 */
export const AnimatedPie: React.FC<{
  progress: number; // 0-1
  size?: number;
  color?: string;
  bgColor?: string;
  delay?: number;
  strokeWidth?: number;
}> = ({
  progress,
  size = 60,
  color = colors.terracotta,
  bgColor = `${colors.warmGrayLight}30`,
  delay = 0,
  strokeWidth = 8,
}) => {
  const frame = useCurrentFrame();
  const animProgress = interpolate(
    frame,
    [delay, delay + 30],
    [0, progress],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - animProgress);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={bgColor}
        strokeWidth={strokeWidth}
      />
      {/* Foreground arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

/**
 * Floating decorative dots using noise for organic movement.
 * Adds subtle life to backgrounds.
 */
export const FloatingDots: React.FC<{
  count?: number;
  color?: string;
  maxRadius?: number;
}> = ({ count = 6, color = `${colors.gold}15`, maxRadius = 120 }) => {
  const frame = useCurrentFrame();

  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const baseX = ((i * 173 + 47) % 100);
        const baseY = ((i * 237 + 91) % 100);
        const r = maxRadius * (0.4 + ((i * 67) % 60) / 100);
        const dx = noise2D("dot-x", i, frame * 0.005) * 8;
        const dy = noise2D("dot-y", i, frame * 0.005) * 8;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${baseX}%`,
              top: `${baseY}%`,
              width: r,
              height: r,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${color}, transparent 70%)`,
              transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px)`,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};
