import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#d4a853",
          light: "#f0d78c",
          dark: "#a67c2e",
        },
        cosmic: {
          DEFAULT: "#0a0e1a",
          card: "#141b2d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
