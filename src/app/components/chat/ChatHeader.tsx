// src/app/components/chat/ChatHeader.tsx
// Mobile-only header bar for chat with branding and map link

"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

export default function ChatHeader() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div
      className={`md:hidden fixed top-0 left-0 right-0 h-20 z-40 flex items-center justify-between px-4 backdrop-blur-lg border-b ${
        isLight
          ? 'bg-white/80 border-gray-200'
          : 'bg-black/60 border-neutral-800'
      }`}
    >
      {/* Left spacer to match hamburger width (w-16 h-16) */}
      <div className="w-16"></div>

      {/* Centered Brand */}
      <h1 className={`text-xl font-bold tracking-wide ${
        isLight ? 'text-gray-900' : 'text-white'
      }`}>
        JPSREALTOR
      </h1>

      {/* Map Icon Button - Right Side (matches hamburger size) */}
      <Link
        href="/map"
        className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
          isLight
            ? 'bg-blue-100 hover:bg-blue-200 active:bg-blue-300'
            : 'bg-emerald-500/20 hover:bg-emerald-500/30 active:bg-emerald-500/40'
        }`}
      >
        <MapPin className={`w-6 h-6 ${
          isLight ? 'text-blue-600' : 'text-emerald-400'
        }`} />
      </Link>
    </div>
  );
}
