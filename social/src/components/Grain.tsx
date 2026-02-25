import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { noise3D } from "@remotion/noise";

/**
 * Film-grain overlay that adds editorial texture.
 * Uses @remotion/noise for animated grain that shifts per frame.
 * Subtle enough to add richness without distracting.
 */
export const GrainOverlay: React.FC<{
  intensity?: number;
  speed?: number;
  animated?: boolean;
}> = ({ intensity = 0.06, speed = 0.3, animated = true }) => {
  const frame = useCurrentFrame();
  const t = animated ? frame * speed : 0;

  // Generate a CSS-based grain via an SVG filter reference
  // This is lighter than rendering thousands of noise dots
  const seed = Math.floor(
    ((noise3D("grain", 0, 0, t) + 1) / 2) * 10000
  );

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        mixBlendMode: "multiply",
        opacity: intensity,
      }}
    >
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <filter id={`grain-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
            seed={seed}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter={`url(#grain-${seed})`}
        />
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Static grain for Still compositions (no animation needed).
 */
export const StaticGrain: React.FC<{ intensity?: number }> = ({
  intensity = 0.04,
}) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      mixBlendMode: "multiply",
      opacity: intensity,
    }}
  >
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <filter id="static-grain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
          seed={42}
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#static-grain)" />
    </svg>
  </AbsoluteFill>
);
