import { useMapState } from "@/app/contexts/MapStateContext";
import type { MapListing } from "@/types/types";

/**
 * useMapControl Hook
 *
 * Convenient hook for components (like chat) to control the map background.
 *
 * Usage in chat:
 * ```
 * const { showMapWithListings, showMapAtLocation, hideMap } = useMapControl();
 *
 * // Show map with specific listings
 * showMapWithListings(listings, { centerLat: 33.8303, centerLng: -116.5453, zoom: 12 });
 *
 * // Show map at a specific location
 * showMapAtLocation(33.8303, -116.5453, 13);
 *
 * // Hide map
 * hideMap();
 * ```
 */
export function useMapControl() {
  const {
    isMapVisible,
    setMapVisible,
    setViewState,
    setDisplayListings,
    setSelectedListing,
    flyToLocation,
    setBounds,
    setMapOpacity,
    isMapInteractive,
    setMapInteractive,
  } = useMapState();

  /**
   * Show map with specific listings
   */
  const showMapWithListings = (
    listings: MapListing[],
    viewState?: { centerLat: number; centerLng: number; zoom: number }
  ) => {
    console.log('🗺️ [useMapControl] Showing map with', listings.length, 'listings');
    setDisplayListings(listings);

    if (viewState) {
      setViewState(viewState);
    } else if (listings.length > 0) {
      // Auto-center on first listing
      const first = listings[0];
      if (first.latitude && first.longitude) {
        setViewState({
          centerLat: first.latitude,
          centerLng: first.longitude,
          zoom: 13,
        });
      }
    }

    setMapVisible(true);
    setMapOpacity(0.8); // Slightly transparent so content is readable
  };

  /**
   * Show map at a specific location (e.g., when user asks about a city)
   */
  const showMapAtLocation = (lat: number, lng: number, zoom: number = 12) => {
    console.log('🗺️ [useMapControl] Showing map at location:', { lat, lng, zoom });
    flyToLocation(lat, lng, zoom);
    setMapOpacity(0.8);
  };

  /**
   * Hide the map background
   */
  const hideMap = () => {
    console.log('🗺️ [useMapControl] Hiding map');
    setMapVisible(false);
  };

  /**
   * Select a specific listing on the map
   */
  const selectListing = (listing: MapListing) => {
    console.log('🗺️ [useMapControl] Selecting listing:', listing.address);
    setSelectedListing(listing);
    setMapVisible(true);
  };

  /**
   * Update map opacity (0-1)
   */
  const setOpacity = (opacity: number) => {
    console.log('🗺️ [useMapControl] Setting opacity:', opacity);
    setMapOpacity(opacity);
  };

  /**
   * Enable map interaction (dragging, zooming)
   */
  const enableMapInteraction = () => {
    console.log('🗺️ [useMapControl] Enabling map interaction');
    setMapInteractive(true);
  };

  /**
   * Disable map interaction (content is clickable)
   */
  const disableMapInteraction = () => {
    console.log('🗺️ [useMapControl] Disabling map interaction');
    setMapInteractive(false);
  };

  /**
   * Toggle map interaction mode
   */
  const toggleMapInteraction = () => {
    console.log('🗺️ [useMapControl] Toggling map interaction');
    setMapInteractive(!isMapInteractive);
  };

  return {
    showMapWithListings,
    showMapAtLocation,
    hideMap,
    selectListing,
    setOpacity,
    enableMapInteraction,
    disableMapInteraction,
    toggleMapInteraction,
    isMapInteractive,
    isMapVisible,
  };
}
