import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts } from "../lib/theme";

// A numbered step with connector line, title, and description
export const StepIndicator: React.FC<{
  number: number;
  title: string;
  description: string;
  delay?: number;
  isActive?: boolean;
}> = ({ number, title, description, delay = 0, isActive = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const x = interpolate(entrance, [0, 1], [-40, 0]);

  const circleColor = isActive ? colors.terracotta : colors.gold;
  const titleColor = isActive ? colors.navy : colors.navyLight;

  return (
    <div
      style={{
        opacity,
        transform: `translateX(${x}px)`,
        display: "flex",
        alignItems: "flex-start",
        gap: 28,
      }}
    >
      {/* Number circle */}
      <div
        style={{
          width: 72,
          height: 72,
          minWidth: 72,
          borderRadius: "50%",
          background: circleColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts.display,
          fontSize: 34,
          fontWeight: 700,
          color: colors.white,
          boxShadow: isActive
            ? `0 4px 20px ${colors.terracotta}66`
            : `0 2px 12px ${colors.gold}44`,
        }}
      >
        {number}
      </div>
      {/* Text content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 6 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 36,
            fontWeight: 700,
            color: titleColor,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: fonts.sans,
            fontSize: 26,
            fontWeight: 400,
            color: colors.warmGray,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};
