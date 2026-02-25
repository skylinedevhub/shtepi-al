/**
 * Design tokens mirroring ShtëpiAL's web/design-system/MASTER.md.
 * Inline styles only (no Tailwind in Remotion).
 */
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadDMSans } from "@remotion/google-fonts/DMSans";

// Load fonts via Remotion's proper font loading (works in headless Chrome)
const playfair = loadPlayfair("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin", "latin-ext"],
});
const dmSans = loadDMSans("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
});

export const colors = {
  navy: "#1B2A4A",
  navyLight: "#2D3F63",
  cream: "#FDF8F0",
  creamDark: "#F5EDE0",
  terracotta: "#C75B39",
  terracottaDark: "#A8462A",
  terracottaLight: "#F4E0D8",
  gold: "#D4A843",
  goldLight: "#F5EDD4",
  warmGray: "#8B8178",
  warmGrayLight: "#D5CFC7",
  foreground: "#374151",
  white: "#FFFFFF",
} as const;

export const fonts = {
  display: playfair.fontFamily,
  sans: dmSans.fontFamily,
} as const;

export const radii = {
  btn: 10,
  card: 16,
} as const;

export const SOURCE_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  merrjep: {
    bg: colors.terracottaLight,
    text: colors.terracotta,
    border: `${colors.terracotta}33`,
  },
  celesi: {
    bg: colors.goldLight,
    text: colors.navy,
    border: `${colors.gold}4D`,
  },
  mirlir: {
    bg: `${colors.navy}0D`,
    text: colors.navy,
    border: `${colors.navy}1A`,
  },
  njoftime: {
    bg: colors.creamDark,
    text: colors.warmGray,
    border: colors.warmGrayLight,
  },
  duashpi: {
    bg: `${colors.goldLight}99`,
    text: colors.navy,
    border: `${colors.gold}33`,
  },
};

export const TRANSACTION_COLORS: Record<
  string,
  { bg: string; text: string }
> = {
  sale: { bg: colors.terracotta, text: colors.white },
  rent: { bg: colors.gold, text: colors.navy },
};

/** Standard social post dimensions */
export const formats = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  landscape: { width: 1200, height: 628 },
} as const;

export type PostFormat = keyof typeof formats;

/**
 * Elevated shadow tokens — layered for realistic depth.
 * Uses navy-tinted shadows instead of generic black.
 */
export const shadows = {
  /** Subtle card elevation */
  card: `0 1px 3px ${colors.navy}08, 0 4px 16px ${colors.navy}06`,
  /** Prominent card hover or featured */
  cardLifted: `0 4px 12px ${colors.navy}0A, 0 12px 40px ${colors.navy}08`,
  /** Inner glow for dark surfaces */
  innerGlow: `inset 0 1px 0 ${colors.cream}08`,
  /** Soft drop for text over images */
  textDrop: `0 2px 20px ${colors.navy}60`,
} as const;
