"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";

// 🔁 Dynamically import the client-only map component
const MapPageClient = dynamic(() => import("@/app/components/mls/map/MapPageClient"), {
  ssr: false,
});

function LoadingFallback() {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  return (
    <div className={`fixed top-32 bottom-0 left-0 right-0 flex items-center justify-center w-full ${
      isLight ? 'bg-white' : 'bg-black'
    }`}>
      <div className="text-center space-y-4">
        <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto ${
          isLight ? 'border-blue-500' : 'border-emerald-500'
        }`} />
        <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-zinc-400'}`}>
          Loading map and listings...
        </p>
      </div>
    </div>
  );
}

export default function MapClientWrapper() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MapPageClient />
    </Suspense>
  );
}
