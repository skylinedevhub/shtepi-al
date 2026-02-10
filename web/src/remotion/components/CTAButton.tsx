import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts } from "../lib/theme";

// Animated call-to-action button
export const CTAButton: React.FC<{
  text: string;
  delay?: number;
}> = ({ text, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const scale = interpolate(entrance, [0, 1], [0.85, 1]);

  // Subtle pulse after fully entered
  const pulseFrame = Math.max(0, frame - delay - 30);
  const pulse = 1 + Math.sin(pulseFrame * 0.08) * 0.015;

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale * pulse})`,
        background: `linear-gradient(135deg, ${colors.terracotta}, ${colors.terracottaDark})`,
        borderRadius: 16,
        padding: "24px 56px",
        fontFamily: fonts.sans,
        fontSize: 36,
        fontWeight: 700,
        color: colors.white,
        boxShadow: `0 6px 24px ${colors.terracotta}55`,
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      {text}
      <span style={{ fontSize: 28 }}>&#8594;</span>
    </div>
  );
};
