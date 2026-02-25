import React from "react";
import { Composition, Still } from "remotion";
import { FeaturedListing } from "./compositions/FeaturedListing";
import { MarketOverview } from "./compositions/MarketOverview";
import { SourceComparison } from "./compositions/SourceComparison";
import {
  MarketSlide1,
  MarketSlide2,
  MarketSlide3,
  MarketSlide4,
} from "./compositions/slides/MarketOverviewSlides";
import {
  FeaturedSlide1,
  FeaturedSlide2,
  FeaturedSlide3,
} from "./compositions/slides/FeaturedListingSlides";
import {
  SourceSlide1,
  SourceSlide2,
  SourceSlide3,
} from "./compositions/slides/SourceComparisonSlides";

// Fonts are loaded via @remotion/google-fonts in tokens/design.ts

const W = 1080;
const H = 1080;
const FPS = 30;

// Instagram carousel: 4:5 portrait
const SLIDE_W = 1080;
const SLIDE_H = 1350;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Animated Videos (1080x1080 square) ── */}
      <Composition
        id="FeaturedListing"
        component={FeaturedListing}
        durationInFrames={150}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ listingIndex: 4 }}
      />
      <Composition
        id="MarketOverview"
        component={MarketOverview}
        durationInFrames={150}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{}}
      />
      <Composition
        id="SourceComparison"
        component={SourceComparison}
        durationInFrames={150}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{}}
      />

      {/* ── Instagram Carousel Slides (1080x1350 portrait) ── */}

      {/* Market Overview carousel (4 slides) */}
      <Still id="MarketSlide1" component={MarketSlide1} width={SLIDE_W} height={SLIDE_H} />
      <Still id="MarketSlide2" component={MarketSlide2} width={SLIDE_W} height={SLIDE_H} />
      <Still id="MarketSlide3" component={MarketSlide3} width={SLIDE_W} height={SLIDE_H} />
      <Still id="MarketSlide4" component={MarketSlide4} width={SLIDE_W} height={SLIDE_H} />

      {/* Featured Listing carousel (3 slides) */}
      <Still id="FeaturedSlide1" component={FeaturedSlide1} width={SLIDE_W} height={SLIDE_H} />
      <Still id="FeaturedSlide2" component={FeaturedSlide2} width={SLIDE_W} height={SLIDE_H} />
      <Still id="FeaturedSlide3" component={FeaturedSlide3} width={SLIDE_W} height={SLIDE_H} />

      {/* Source Comparison carousel (3 slides) */}
      <Still id="SourceSlide1" component={SourceSlide1} width={SLIDE_W} height={SLIDE_H} />
      <Still id="SourceSlide2" component={SourceSlide2} width={SLIDE_W} height={SLIDE_H} />
      <Still id="SourceSlide3" component={SourceSlide3} width={SLIDE_W} height={SLIDE_H} />
    </>
  );
};
