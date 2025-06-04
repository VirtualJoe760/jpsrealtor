// src/app/mls-listings/page.tsx
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamically import the client-only map component
const MapPageClient = dynamic(() => import("@/app/components/mls/map/MapPageClient"), {
  ssr: false,
});

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-64px)] w-full bg-black">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-zinc-400 text-sm">Loading map and listings...</p>
      </div>
    </div>
  );
}

export default function SearchMapPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <MapPageClient />
    </Suspense>
  );
}
