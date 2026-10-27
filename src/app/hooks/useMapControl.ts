import { useMapState } from "@/app/contexts/MapStateContext";
import type { MapListing } from "@/types/types";
import { resolveSpawnPoint, PALM_DESERT } from "@/lib/map/resolve-spawn-point";

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
    console.log('🗺️ [useMapControl.showMapWithListings] Called with:', {
      listingsCount: listings.length,
      viewState,
      hasViewState: !!viewState,
    });

    setDisplayListings(listings);
    console.log('🗺️ [useMapControl.showMapWithListings] Display listings set');

    // IMPORTANT: Show map FIRST to trigger wipe animation, then fly to location
    console.log('🗺️ [useMapControl.showMapWithListings] Setting map visible to trigger wipe animation');
    setMapVisible(true);
    setMapOpacity(0.8);

    // Delay the flyTo slightly to allow wipe animation to start
    setTimeout(() => {
      if (viewState) {
        console.log('🗺️ [useMapControl.showMapWithListings] Flying to location:', viewState);
        setViewState(viewState);
      } else if (listings.length > 0) {
        const first = listings[0];
        if (first.latitude && first.longitude) {
          console.log('🗺️ [useMapControl.showMapWithListings] Auto-centering on first listing');
          setViewState({
            centerLat: first.latitude,
            centerLng: first.longitude,
            zoom: 13,
          });
        }
      }
    }, 100); // Small delay to let wipe animation start

    console.log('🗺️ [useMapControl.showMapWithListings] Completed');
  };

  /**
   * Show map at a specific location (e.g., when user asks about a city)
   */
  const showMapAtLocation = (lat: number, lng: number, zoom: number = 12) => {
    console.log('🗺️ [useMapControl.showMapAtLocation] 🚀 CALLED with:', { lat, lng, zoom });
    console.log('🗺️ [useMapControl.showMapAtLocation] Setting map visible...');
    setMapVisible(true); // Make map visible
    console.log('🗺️ [useMapControl.showMapAtLocation] Calling flyToLocation...');
    flyToLocation(lat, lng, zoom);
    console.log('🗺️ [useMapControl.showMapAtLocation] Setting opacity...');
    setMapOpacity(0.8);
    console.log('🗺️ [useMapControl.showMapAtLocation] ✅ Complete');
  };

  /**
   * Open the map for a fresh chat session (no persisted viewState).
   *
   * Reveals the map NOW at Palm Desert, then re-centres once
   * resolveSpawnPoint() answers. Awaiting the resolver before revealing
   * left the chat on screen for the whole geolocation round-trip — ~1s
   * even when permission is denied, up to 8s while the prompt is open —
   * so a map click read as "chat, then the map switches in on its own".
   * The re-centre uses setViewState, which moves the map without
   * touching visibility, so toggling back to chat mid-resolve sticks.
   */
  const showMapAtSpawnPoint = () => {
    showMapAtLocation(PALM_DESERT.lat, PALM_DESERT.lng, PALM_DESERT.zoom);
    resolveSpawnPoint().then((spawn) => {
      if (spawn === PALM_DESERT) return;
      setViewState({ centerLat: spawn.lat, centerLng: spawn.lng, zoom: spawn.zoom });
    });
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

  /**
   * Pre-position map in background WITHOUT revealing it
   * Used by AI to prepare the map silently - user clicks "Open in Map View" to reveal
   */
  const prePositionMap = (
    listings: MapListing[],
    viewState?: { centerLat: number; centerLng: number; zoom: number }
  ) => {
    console.log('🗺️ [useMapControl] Pre-positioning map (hidden) with', listings.length, 'listings');
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

    // DO NOT call setMapVisible(true) - keep map hidden
    // Map will be revealed when user clicks "Open in Map View"
  };

  return {
    showMapWithListings,
    showMapAtLocation,
    showMapAtSpawnPoint,
    hideMap,
    selectListing,
    setOpacity,
    enableMapInteraction,
    disableMapInteraction,
    toggleMapInteraction,
    prePositionMap,
    isMapInteractive,
    isMapVisible,
    setBounds,
    setMapVisible,
  };
}
