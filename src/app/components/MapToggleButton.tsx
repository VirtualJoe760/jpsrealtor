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

  const isChapPage = pathname === "/chap";

  const handleToggleMap = () => {
    if (isChapPage) {
      if (isMapVisible) {
        hideMap();
      } else {
        showMapAtLocation(37.0, -119.5, 5);
      }
    } else {
      router.push("/chap");
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
