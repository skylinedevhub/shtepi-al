import React from "react";
import { Composition } from "remotion";
import {
  LaunchAnnouncement,
  LAUNCH_DURATION,
} from "./compositions/LaunchAnnouncement";
import { HowItWorks, HOW_IT_WORKS_DURATION } from "./compositions/HowItWorks";
import {
  StatsShowcase,
  STATS_DURATION,
} from "./compositions/StatsShowcase";
import { FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "./lib/theme";

// Root component that registers all video compositions for Remotion
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ===== Video 1: Launch Announcement ===== */}
      <Composition
        id="LaunchAnnouncement-EN"
        component={LaunchAnnouncement}
        durationInFrames={LAUNCH_DURATION}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{ lang: "en" as const }}
      />
      <Composition
        id="LaunchAnnouncement-SQ"
        component={LaunchAnnouncement}
        durationInFrames={LAUNCH_DURATION}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{ lang: "sq" as const }}
      />

      {/* ===== Video 2: How It Works ===== */}
      <Composition
        id="HowItWorks-EN"
        component={HowItWorks}
        durationInFrames={HOW_IT_WORKS_DURATION}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{ lang: "en" as const }}
      />
      <Composition
        id="HowItWorks-SQ"
        component={HowItWorks}
        durationInFrames={HOW_IT_WORKS_DURATION}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{ lang: "sq" as const }}
      />

      {/* ===== Video 3: Stats & Sources Showcase ===== */}
      <Composition
        id="StatsShowcase-EN"
        component={StatsShowcase}
        durationInFrames={STATS_DURATION}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{ lang: "en" as const }}
      />
      <Composition
        id="StatsShowcase-SQ"
        component={StatsShowcase}
        durationInFrames={STATS_DURATION}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={{ lang: "sq" as const }}
      />
    </>
  );
};
