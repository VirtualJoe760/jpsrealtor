"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useMapState } from "@/app/contexts/MapStateContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import type { MapListing } from "@/types/types";
import LoadingGlobe from "@/app/components/LoadingGlobe";

// Dynamic import for MapView (client-side only)
const MapView = dynamic(
  () => import("@/app/components/mls/map/MapView"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <LoadingGlobe message="Loading map..." size={100} />
      </div>
    )
  }
);

/**
 * MapLayer Component
 *
 * Renders an interactive map as a layer within page content.
 * This component is meant to be used INSIDE a page, positioned absolutely
 * to appear behind other content.
 *
 * Usage:
 * ```tsx
 * <div className="relative min-h-screen">
 *   <MapLayer />
 *   <div className="relative z-10">
 *     Your page content here
 *   </div>
 * </div>
 * ```
 */
export default function MapLayer() {
  const {
    isMapVisible,
    viewState,
    selectedListing,
    setSelectedListing,
    displayListings,
    mapStyle,
    mapOpacity,
  } = useMapState();

  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [mounted, setMounted] = useState(false);
  const [markers, setMarkers] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default view state for California (entire state visible)
  const defaultViewState = useMemo(() => ({
    centerLat: 37.0,
    centerLng: -119.5,
    zoom: 5.5,
  }), []);

  const effectiveViewState = viewState || defaultViewState;

  // Handle listing selection
  const handleSelectListing = (listing: MapListing) => {
    console.log('🗺️ [MapLayer] Listing selected:', listing.address);
    setSelectedListing(listing);
  };

  // Handle bounds change (when user pans/zooms)
  const handleBoundsChange = (bounds: any) => {
    console.log('🗺️ [MapLayer] Bounds changed:', bounds);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 transition-opacity duration-500"
      style={{
        opacity: isMapVisible ? mapOpacity : 0,
        pointerEvents: isMapVisible ? 'auto' : 'none',
        zIndex: 0,
      }}
    >
      {/* Map Container */}
      <div className="absolute inset-0 w-full h-full">
        <MapView
          listings={displayListings}
          markers={markers}
          centerLat={effectiveViewState.centerLat}
          centerLng={effectiveViewState.centerLng}
          zoom={effectiveViewState.zoom}
          onSelectListing={handleSelectListing}
          selectedListing={selectedListing}
          onBoundsChange={handleBoundsChange}
          panelOpen={false}
          mapStyle={mapStyle}
        />
      </div>

      {/* Overlay gradient for better content readability */}
      {isMapVisible && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: isLight
              ? 'linear-gradient(to top, rgba(255,255,255,0.3), transparent 40%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.3), transparent 40%)',
            opacity: mapOpacity,
            zIndex: 1,
          }}
        />
      )}
    </div>
  );
}
