// src/app/components/chat/ChatHeader.tsx
// Mobile-only header bar for chat - matches map info panel styling exactly

"use client";

import { useTheme } from "@/app/contexts/ThemeContext";

export default function ChatHeader() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div
      className={`
        md:hidden fixed top-0 left-0 right-0 z-40
        w-full px-6 py-10 backdrop-blur-xl
        flex items-center justify-center
        border-b
        ${isLight
          ? 'bg-gradient-to-b from-white/95 to-white/90 shadow-lg shadow-blue-500/10 border-gray-200/50'
          : 'bg-gradient-to-b from-black/90 to-black/85 shadow-xl shadow-emerald-500/30 border-emerald-700/40'
        }
      `}
    >
      {/* Centered Brand - matches info panel text styling */}
      <h1 className={`
        text-3xl font-bold tracking-tight
        ${isLight
          ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-900'
          : 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200'
        }
      `}>
        JPS
      </h1>
    </div>
  );
}
