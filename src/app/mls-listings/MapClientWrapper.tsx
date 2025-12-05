"use client";

import dynamic from "next/dynamic";

// 🔁 Dynamically import the client-only map component (no SSR, no fallback)
const MapPageClient = dynamic(() => import("@/app/components/mls/map/MapPageClient"), {
  ssr: false,
});

export default function MapClientWrapper() {
  return <MapPageClient />;
}
