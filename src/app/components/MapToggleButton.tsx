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
        // Show map centered on Palm Desert (default location)
        showMapAtLocation(33.8303, -116.5453, 12);
      }
    } else {
      // If we're on any other page, redirect to homepage with map open
      router.push("/?view=map");
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
        <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
      ) : (
        <Map className="w-5 h-5 md:w-6 md:h-6" />
      )}
    </motion.button>
  );
}
