"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/app/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { currentTheme, toggleTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative w-16 h-8 rounded-full bg-gray-800/50 backdrop-blur-sm border border-gray-700 flex items-center p-1 cursor-pointer transition-colors duration-300"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
    >
      {/* Toggle slider */}
      <motion.div
        className="absolute w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg"
        style={{
          backgroundImage: isLight
            ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
            : "linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)",
        }}
        animate={{
          x: isLight ? 32 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30,
        }}
      >
        {isLight ? (
          <Sun className="w-4 h-4 text-white" />
        ) : (
          <Moon className="w-4 h-4 text-white" />
        )}
      </motion.div>

      {/* Background icons */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <Moon
          className={`w-3 h-3 transition-opacity ${
            isLight ? "opacity-30" : "opacity-0"
          }`}
        />
        <Sun
          className={`w-3 h-3 transition-opacity ${
            isLight ? "opacity-0" : "opacity-30"
          }`}
        />
      </div>
    </motion.button>
  );
}

// Alternative: Card-based theme selector for dashboard
export function ThemeSelector() {
  const { currentTheme, setTheme } = useTheme();

  const themes = [
    {
      id: "blackspace" as const,
      name: "Black Space",
      description: "Deep space aesthetic with spatial backgrounds",
      icon: Moon,
      preview: "linear-gradient(135deg, #000000 0%, #1e3a8a 100%)",
    },
    {
      id: "lightgradient" as const,
      name: "Light Gradient",
      description: "Clean, bright interface with soft gradients",
      icon: Sun,
      preview: "linear-gradient(135deg, #ffffff 0%, #dbeafe 100%)",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Theme Preference</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isSelected = currentTheme === theme.id;

          return (
            <motion.button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Preview gradient */}
              <div
                className="w-full h-20 rounded-lg mb-3 shadow-lg"
                style={{ background: theme.preview }}
              />

              {/* Theme info */}
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? "bg-emerald-500/20" : "bg-gray-700/50"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isSelected ? "text-emerald-400" : "text-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-1 text-left">
                  <h4
                    className={`font-semibold ${
                      isSelected ? "text-emerald-400" : "text-white"
                    }`}
                  >
                    {theme.name}
                  </h4>
                  <p className="text-sm text-gray-400 mt-1">
                    {theme.description}
                  </p>
                </div>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
