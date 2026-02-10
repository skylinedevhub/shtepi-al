import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts } from "../lib/theme";

// A source site badge (e.g., "MerrJep.al") with animated entrance
export const SourceBadge: React.FC<{
  name: string;
  delay?: number;
}> = ({ name, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1]);
  const scale = interpolate(entrance, [0, 1], [0.85, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        background: colors.white,
        border: `2px solid ${colors.goldLight}`,
        borderRadius: 16,
        padding: "20px 36px",
        fontFamily: fonts.sans,
        fontSize: 28,
        fontWeight: 600,
        color: colors.navy,
        boxShadow: `0 2px 12px rgba(27,42,74,0.06)`,
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: colors.gold,
          display: "inline-block",
        }}
      />
      {name}
    </div>
  );
};
