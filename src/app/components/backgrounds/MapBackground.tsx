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
        <LoadingGlobe message="Loading map background..." size={100} />
      </div>
    )
  }
);

/**
 * MapBackground Component
 *
 * Renders the map as a fixed background layer that can be controlled
 * from anywhere in the app via MapStateContext.
 *
 * Features:
 * - Theme-aware map styling
 * - Controlled via global state
 * - Proper pointer-events management for click-through
 * - Smooth opacity transitions
 */
export default function MapBackground() {
  const {
    isMapVisible,
    viewState,
    selectedListing,
    setSelectedListing,
    displayListings,
    mapStyle,
    mapOpacity,
    isMapInteractive,
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
    console.log('🗺️ [MapBackground] Listing selected:', listing.address);
    setSelectedListing(listing);
  };

  // Handle bounds change (when user pans/zooms)
  const handleBoundsChange = (bounds: any) => {
    console.log('🗺️ [MapBackground] Bounds changed:', bounds);
    // Could trigger listing loading here if needed
  };

  if (!mounted) {
    return null;
  }

  console.log('🗺️ [MapBackground] Render:', {
    isMapVisible,
    isMapInteractive,
    pointerEvents: isMapVisible && isMapInteractive ? 'auto' : 'none'
  });

  return (
    <div
      className="fixed inset-0 z-[1] transition-opacity duration-500"
      style={{
        opacity: isMapVisible ? mapOpacity : 0,
        pointerEvents: isMapVisible && isMapInteractive ? 'auto' : 'none',
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

      {/* Overlay gradient for better content readability (optional) */}
      {isMapVisible && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            background: isLight
              ? 'linear-gradient(to top, rgba(255,255,255,0.4), transparent 30%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.4), transparent 30%)',
            opacity: mapOpacity,
          }}
        />
      )}
    </div>
  );
}
