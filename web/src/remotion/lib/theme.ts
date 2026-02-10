// ShtëpiAL brand theme for Remotion videos
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
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const fonts = {
  display: "'Playfair Display', Georgia, serif",
  sans: "'DM Sans', system-ui, sans-serif",
} as const;

// 30fps standard
export const FPS = 30;

// Standard video dimensions (1080p landscape)
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

// Duration helpers (in frames at 30fps)
export const seconds = (s: number) => Math.round(s * FPS);
