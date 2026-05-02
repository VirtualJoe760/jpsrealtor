"use client";

import dynamic from "next/dynamic";
import MapErrorBoundary from "@/app/components/MapErrorBoundary";

const MapPageClient = dynamic(() => import("@/app/components/mls/map/MapPageClient"), {
  ssr: false,
});

export default function MapClientWrapper() {
  return (
    <MapErrorBoundary>
      <MapPageClient />
    </MapErrorBoundary>
  );
}
