import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        navy: {
          DEFAULT: "#1B2A4A",
          light: "#2D3F63",
        },
        cream: {
          DEFAULT: "#FDF8F0",
          dark: "#F5EDE0",
        },
        terracotta: {
          DEFAULT: "#C75B39",
          dark: "#A8462A",
          light: "#F4E0D8",
        },
        gold: {
          DEFAULT: "#D4A843",
          light: "#F5EDD4",
        },
        "warm-gray": {
          DEFAULT: "#8B8178",
          light: "#D5CFC7",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        btn: "0.625rem",
        card: "1rem",
        input: "0.5rem",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
