import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography"; // Use ESM import syntax

export default {
  darkMode: "class", // Enable class-based dark mode
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Match all files under `src` for Tailwind
  ],
  theme: {
    extend: {
      colors: {
        neutral: {
          light: '#ffffff', // Matches light mode background
          DEFAULT: '#e5e5e5',
          dark: '#0a0a0a', // Matches dark mode background
        },
        foreground: {
          light: '#171717', // Matches light mode text
          dark: '#ededed', // Matches dark mode text
        },
      },
      fontFamily: {
        sans: ['Raleway', 'sans-serif'], // Your project font
      },
      transitionTimingFunction: {
        smooth: 'ease-in-out', // Smooth transitions for animations
      },
      transitionDuration: {
        DEFAULT: '300ms', // Default duration for transitions
      },
    },
  },
  plugins: [typography], // Use the imported plugin
} satisfies Config;
