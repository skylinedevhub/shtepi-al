import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { colors, fonts } from "../tokens/design";

export const PriceTag: React.FC<{
  price: number;
  currency?: string;
  period?: string;
  size?: number;
  delay?: number;
}> = ({ price, currency = "EUR", period, size = 42, delay = 10 }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const moveY = interpolate(frame, [delay, delay + 12], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const formatted = new Intl.NumberFormat("de-DE").format(price);
  const symbol = currency === "EUR" ? "\u20AC" : "ALL";

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${moveY}px)`,
        fontFamily: fonts.display,
        fontSize: size,
        fontWeight: 700,
        color: colors.navy,
        display: "flex",
        alignItems: "baseline",
        gap: 6,
      }}
    >
      <span>{formatted}</span>
      <span style={{ fontSize: size * 0.55, color: colors.warmGray }}>
        {symbol}
      </span>
      {period && period !== "total" && (
        <span style={{ fontSize: size * 0.4, color: colors.warmGray }}>
          /{period === "monthly" ? "muaj" : period}
        </span>
      )}
    </div>
  );
};
