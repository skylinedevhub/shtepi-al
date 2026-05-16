import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1B2A4A",
        cream: "#FDF8F0",
        terracotta: "#C75B39",
        gold: "#D4A843",
        warmgray: "#8B8178",
      },
    },
  },
  plugins: [],
} satisfies Config;
