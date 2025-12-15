// src/app/components/chat/ChatHeader.tsx
// Mobile-only header bar for chat with branding and CHAP map toggle

"use client";

import { MapPin } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useMapControl } from "@/app/hooks/useMapControl";

export default function ChatHeader() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();

  const handleMapToggle = () => {
    if (isMapVisible) {
      hideMap();
    } else {
      // Show map centered on Palm Desert (default location)
      showMapAtLocation(33.8303, -116.5453, 12);
    }
  };

  return (
    <div
      className={`md:hidden fixed top-0 left-0 right-0 h-20 z-40 flex items-center justify-between px-4 backdrop-blur-lg border-b ${
        isLight
          ? 'bg-white/80 border-gray-200'
          : 'bg-black/60 border-neutral-800'
      }`}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Left spacer to match hamburger width (w-16 h-16) */}
      <div className="w-16"></div>

      {/* Centered Brand */}
      <h1 className={`text-xl font-bold tracking-wide ${
        isLight ? 'text-gray-900' : 'text-white'
      }`}>
        JPSREALTOR
      </h1>

      {/* Map Toggle Button - Right Side */}
      <button
        onClick={handleMapToggle}
        className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
          isMapVisible
            ? (isLight
                ? 'bg-blue-600 text-white'
                : 'bg-emerald-600 text-white')
            : (isLight
                ? 'bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-600'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 active:bg-emerald-500/40 text-emerald-400')
        }`}
        aria-label={isMapVisible ? "Hide map" : "Show map"}
      >
        <MapPin className="w-6 h-6" />
      </button>
    </div>
  );
}
