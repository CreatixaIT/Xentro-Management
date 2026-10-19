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
        xentro: {
          red: "#E31C25",
          yellow: "#FFD700",
          black: "#1A1A1A",
          dark: "#0D0D0D",
        },
      },
    },
  },
};
export default config;
