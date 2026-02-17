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
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "fade-up-delay-1": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both",
        "fade-up-delay-2": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both",
        "fade-up-delay-3": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s both",
        "fade-in": "fade-in 0.5s ease both",
      },
    },
  },
  plugins: [],
};
export default config;
