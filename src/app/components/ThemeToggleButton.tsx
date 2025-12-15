// src/app/components/ThemeToggleButton.tsx
// Global theme toggle button - replaces hamburger menu
// Positioned in top-left corner, available on all pages

"use client";

import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function ThemeToggleButton() {
  const { currentTheme, setTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const handleToggleTheme = () => {
    setTheme(isLight ? "blackspace" : "lightgradient");
  };

  return (
    <motion.button
      onClick={handleToggleTheme}
      className={`
        fixed top-4 left-4 z-50
        w-12 h-12 md:w-14 md:h-14
        flex items-center justify-center
        transition-all duration-200
        ${isLight
          ? 'text-blue-600 hover:text-blue-700'
          : 'text-emerald-400 hover:text-emerald-300'
        }
      `}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      style={{ pointerEvents: 'auto' }}
    >
      {isLight ? (
        <Moon className="w-7 h-7 md:w-8 md:h-8" />
      ) : (
        <Sun className="w-7 h-7 md:w-8 md:h-8" />
      )}
    </motion.button>
  );
}
