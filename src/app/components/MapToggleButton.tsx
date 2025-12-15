// src/app/components/MapToggleButton.tsx
// Global map toggle button for CHAP (Chat + Map) unified experience
// Positioned in top-right corner, available on all pages

"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useMapControl } from "@/app/hooks/useMapControl";
import { Map, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export default function MapToggleButton() {
  const { currentTheme } = useTheme();
  const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();
  const isLight = currentTheme === "lightgradient";

  const handleToggleMap = () => {
    if (isMapVisible) {
      hideMap();
    } else {
      // Show map centered on Palm Desert (default location)
      showMapAtLocation(33.8303, -116.5453, 12);
    }
  };

  return (
    <motion.button
      onClick={handleToggleMap}
      className={`
        fixed top-4 right-4 z-50
        w-12 h-12 md:w-14 md:h-14
        flex items-center justify-center
        rounded-xl
        transition-all duration-200
        shadow-lg
        ${isLight
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        }
      `}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.05 }}
      aria-label={isMapVisible ? "Show Chat" : "Show Map"}
      style={{ pointerEvents: 'auto' }}
    >
      {isMapVisible ? (
        <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
      ) : (
        <Map className="w-5 h-5 md:w-6 md:h-6" />
      )}
    </motion.button>
  );
}
