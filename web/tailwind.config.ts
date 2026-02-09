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
        primary: {
          DEFAULT: "#2563eb", // blue-600
          light: "#dbeafe", // blue-100
          lighter: "#eff6ff", // blue-50
          dark: "#1d4ed8", // blue-700
          darker: "#1e40af", // blue-800
        },
        success: "#16a34a",
        warning: "#d97706",
        error: "#dc2626",
      },
      borderRadius: {
        btn: "0.5rem", // rounded-lg for buttons
        card: "0.75rem", // rounded-xl for cards
        input: "0.5rem", // rounded-lg for inputs
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
