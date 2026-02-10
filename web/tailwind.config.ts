import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
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
        success: "#16a34a",
        warning: "#d97706",
        error: "#dc2626",
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
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
