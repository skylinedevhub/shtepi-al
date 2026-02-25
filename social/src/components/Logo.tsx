import React from "react";
import { colors, fonts } from "../tokens/design";

export const Logo: React.FC<{
  size?: number;
  variant?: "light" | "dark";
}> = ({ size = 48, variant = "light" }) => {
  const baseColor = variant === "light" ? colors.cream : colors.navy;

  return (
    <div
      style={{
        fontFamily: fonts.display,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: -1,
        display: "flex",
        alignItems: "baseline",
      }}
    >
      <span style={{ color: colors.gold }}>Shtëpi</span>
      <span style={{ color: baseColor }}>AL</span>
    </div>
  );
};
