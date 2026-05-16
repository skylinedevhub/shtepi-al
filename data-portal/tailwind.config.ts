import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Legacy brand colors (kept for non-terminal pages if any)
        navy: "#1B2A4A",
        cream: "#FDF8F0",
        terracotta: "#C75B39",
        gold: "#D4A843",
        warmgray: "#8B8178",
        // Terminal palette
        ink: {
          900: "#070A14",
          800: "#0B1020",
          700: "#0F1628",
          600: "#141C33",
          500: "#1A2440",
          400: "#26314F",
        },
        line: {
          DEFAULT: "#1F2A44",
          strong: "#2C3A5C",
          subtle: "#172033",
        },
        fg: {
          DEFAULT: "#E2E8F0",
          muted: "#8FA0BD",
          dim: "#5A6A8A",
        },
        acc: {
          mint: "#5EE6A0",
          gold: "#F4B860",
          rose: "#FF6B6B",
          cyan: "#5BC0DE",
          amber: "#D4A843",
          terra: "#E07A4F",
        },
      },
      fontFamily: {
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        sans: [
          "var(--font-sans)",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "0.9rem" }],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(94, 230, 160, 0.15), 0 0 24px -8px rgba(94, 230, 160, 0.35)",
        ring: "inset 0 0 0 1px rgba(255,255,255,0.04)",
      },
      animation: {
        "pulse-dot": "pulseDot 1.6s ease-in-out infinite",
        marquee: "marquee 60s linear infinite",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
