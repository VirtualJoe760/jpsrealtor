"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useMapState } from "@/app/contexts/MapStateContext";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
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

// Default bounds - show entire California state with all regions visible
// Matches /map page implementation
const DEFAULT_BOUNDS = {
  north: 42.0,
  south: 32.5,
  east: -114.0,
  west: -124.5,
  zoom: 4.8, // More zoomed out to show full California view
};

/**
 * MapLayer Component
 *
 * Renders an interactive map as a layer within page content with full MLS functionality.
 * Architecture matches /map page to prevent infinite loops.
 *
 * Features:
 * - Hierarchical clustering (regions → counties → cities → listings)
 * - Polygon boundaries with hover effects
 * - Auto-loads listings when user pans/zooms
 * - Supports all map styles
 *
 * IMPORTANT: Uses local state for position (like /map page) to prevent feedback loops
 */
export default function MapLayer() {
  const {
    isMapVisible,
    mapStyle,
    viewState: contextViewState,
  } = useMapState();

  const {
    markers,
    selectedListing,
    isLoading,
    isPreloaded,
    loadListings,
    selectListing,
    filters,
  } = useMLSContext();

  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [mounted, setMounted] = useState(false);
  const hasInitializedRef = useRef(false);

  // Auto-select map style based on theme (override MapStateContext)
  const themeAwareMapStyle = isLight ? 'bright' : 'dark';

  // Use viewState from context if available, otherwise use default bounds
  const viewState = useMemo(() => {
    if (contextViewState) {
      console.log('🗺️ [MapLayer] Using viewState from context:', contextViewState);
      return contextViewState;
    }
    const defaultState = {
      centerLat: (DEFAULT_BOUNDS.north + DEFAULT_BOUNDS.south) / 2,
      centerLng: (DEFAULT_BOUNDS.east + DEFAULT_BOUNDS.west) / 2,
      zoom: DEFAULT_BOUNDS.zoom,
    };
    console.log('🗺️ [MapLayer] Using default viewState:', defaultState);
    return defaultState;
  }, [contextViewState]); // Update when context changes

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initial data load is handled by the map's onLoad event calling handleBoundsChange
  // This ensures data is loaded for the actual visible map bounds, not the DEFAULT_BOUNDS
  // Keeping this comment to explain why there's no initial data load here

  // Load listings when bounds change (user pans/zooms)
  // CRITICAL: Do NOT update viewState or any external state here!
  const handleBoundsChange = useCallback(
    async (bounds: {north: number, south: number, east: number, west: number, zoom: number}) => {
      console.log("🗺️ [MapLayer] Bounds changed:", bounds);

      // Load new listings with current filters (merge mode = true to keep existing listings)
      // The useServerClusters hook handles caching and deduplication internally
      await loadListings(bounds, filters, true);

      // NOTE: We do NOT call setBounds/setViewState here!
      // That would create a feedback loop: bounds change → state update → props change → map moves → bounds change
      // The MapView's internal state is the source of truth for position
    },
    [filters, loadListings]
  );

  // Handle listing selection
  const handleSelectListing = useCallback(
    async (listing: MapListing) => {
      console.log('🗺️ [MapLayer] Listing selected:', listing.address);
      await selectListing(listing);
    },
    [selectListing]
  );

  if (!mounted) {
    return null;
  }

  return (
    <div
      className="fixed inset-0"
      style={{
        opacity: 1,
        pointerEvents: isMapVisible ? 'auto' : 'none',
        zIndex: 0,
      }}
    >
      {/* Map Container */}
      <div className="absolute inset-0 w-full h-full">
        <MapView
          listings={[]}
          markers={markers}
          centerLat={viewState.centerLat}
          centerLng={viewState.centerLng}
          zoom={viewState.zoom}
          onSelectListing={handleSelectListing}
          selectedListing={selectedListing}
          onBoundsChange={handleBoundsChange}
          panelOpen={false}
          mapStyle={themeAwareMapStyle}
        />
      </div>

    </div>
  );
}
