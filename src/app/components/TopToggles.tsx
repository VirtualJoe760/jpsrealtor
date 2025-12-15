// src/app/components/TopToggles.tsx
// Top navigation toggles - Theme (left) and Map (right)
// Persists across all pages, properly centered with application content

"use client";

import { Sun, Moon, Map, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useMapControl } from "@/app/hooks/useMapControl";
import { usePathname, useRouter } from "next/navigation";

export default function TopToggles() {
  const { currentTheme, setTheme } = useTheme();
  const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();
  const pathname = usePathname();
  const router = useRouter();
  const isLight = currentTheme === "lightgradient";
  const isHomePage = pathname === "/";

  const handleToggleTheme = () => {
    setTheme(isLight ? "blackspace" : "lightgradient");
  };

  const handleToggleMap = () => {
    if (isHomePage) {
      if (isMapVisible) {
        hideMap();
      } else {
        // Show map centered on California (entire state view)
        showMapAtLocation(37.0, -119.5, 5);
      }
    } else {
      // If we're on any other page, redirect to homepage (returns to last state)
      router.push("/");
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Blur gradient backdrop - only show when NOT on map view */}
      {!isMapVisible && (
        <div
          className={`absolute inset-0 h-32 backdrop-blur-md transition-opacity duration-300 ${
            isLight
              ? 'bg-gradient-to-b from-white/80 via-white/40 to-transparent'
              : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'
          }`}
          style={{
            backdropFilter: 'blur(12px) saturate(150%)',
            WebkitBackdropFilter: 'blur(12px) saturate(150%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 100%)',
          }}
        />
      )}

      {/*
        Info panel is min-h-[3.5rem] (56px) with py-2
        Icon buttons are h-12 (48px) on mobile
        Add pt-4 to push icons down and center with panel content
      */}
      <div className="max-w-7xl mx-auto px-4 pt-6 flex items-center justify-between pointer-events-none relative z-10">
        {/* Theme Toggle - Left */}
        <motion.button
          onClick={handleToggleTheme}
          className={`
            w-14 h-14 md:w-14 md:h-14
            flex items-center justify-center
            transition-all duration-200
            pointer-events-auto
            ${isLight
              ? 'text-blue-600 hover:text-blue-700'
              : 'text-emerald-400 hover:text-emerald-300'
            }
          `}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
        >
          {isLight ? (
            <Moon className="w-7 h-7 md:w-8 md:h-8" />
          ) : (
            <Sun className="w-7 h-7 md:w-8 md:h-8" />
          )}
        </motion.button>

        {/* Map Toggle - Right */}
        <motion.button
          onClick={handleToggleMap}
          className={`
            w-12 h-12 md:w-14 md:h-14
            flex items-center justify-center
            transition-all duration-200
            pointer-events-auto
            ${isLight
              ? 'text-blue-600 hover:text-blue-700'
              : 'text-emerald-400 hover:text-emerald-300'
            }
          `}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          aria-label={isMapVisible ? "Show Chat" : "Show Map"}
        >
          {isMapVisible ? (
            <MessageSquare className="w-7 h-7 md:w-8 md:h-8" />
          ) : (
            <Map className="w-7 h-7 md:w-8 md:h-8" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
