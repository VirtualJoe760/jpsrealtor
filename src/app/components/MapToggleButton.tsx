// src/app/components/MapToggleButton.tsx
// Global map toggle button for CHAP (Chat + Map) unified experience
// Positioned in top-right corner, available on all pages

"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { useMapControl } from "@/app/hooks/useMapControl";
import { usePathname, useRouter } from "next/navigation";
import { Map, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export default function MapToggleButton() {
  const { currentTheme } = useTheme();
  const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();
  const pathname = usePathname();
  const router = useRouter();
  const isLight = currentTheme === "lightgradient";

  const isHomePage = pathname === "/";

  const handleToggleMap = () => {
    // If we're on the homepage, toggle the map
    if (isHomePage) {
      if (isMapVisible) {
        hideMap();
      } else {
        // Show map centered on California (entire state view)
        // Center: ~37°N, 119.5°W (California geographic center)
        // Zoom: 5 shows entire state with more breathing room
        showMapAtLocation(37.0, -119.5, 5);
      }
    } else {
      // If we're on any other page, redirect to homepage (returns to last state)
      router.push("/");
    }
  };

  return (
    <motion.button
      onClick={handleToggleMap}
      className={`
        fixed top-4 right-4 z-50
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
      aria-label={isMapVisible ? "Show Chat" : "Show Map"}
      style={{ pointerEvents: 'auto' }}
    >
      {isMapVisible ? (
        <MessageSquare className="w-7 h-7 md:w-8 md:h-8" />
      ) : (
        <Map className="w-7 h-7 md:w-8 md:h-8" />
      )}
    </motion.button>
  );
}
