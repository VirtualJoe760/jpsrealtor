import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Override with your brand color; drives buttons, links, map pins.
        brand: {
          DEFAULT: "#1e3a5f",
          600: "#1e3a5f",
          700: "#16304f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
