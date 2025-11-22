"use client";

import { useTheme } from "@/app/contexts/ThemeContext";

export default function MapGlobeLoader() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className={`absolute inset-0 z-50 flex items-center justify-center ${
      isLight ? 'bg-white' : 'bg-black'
    }`}>
      <div className="flex flex-col items-center gap-6">
        {/* Simple Spinner */}
        <div className={`w-16 h-16 border-4 rounded-full animate-spin ${
          isLight
            ? 'border-gray-200 border-t-blue-500'
            : 'border-gray-800 border-t-emerald-500'
        }`} />

        {/* Loading Text */}
        <div className="text-center">
          <p className={`text-lg font-semibold ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>
            Loading map...
          </p>
          <p className={`text-sm ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            Preparing your listings
          </p>
        </div>
      </div>
    </div>
  );
}
