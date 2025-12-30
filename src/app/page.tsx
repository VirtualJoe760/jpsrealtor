"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useMapState } from "@/app/contexts/MapStateContext";
import ChatWidget from "@/app/components/chat/ChatWidget";
import { useChatContext } from "@/app/components/chat/ChatProvider";
import NotificationToast from "@/app/components/NotificationToast";
import MapLayer from "@/app/components/MapLayer";
import MapSearchBar from "@/app/components/map/MapSearchBar";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import { useMapControl } from "@/app/hooks/useMapControl";
import { Map, Satellite, Globe, SlidersHorizontal, ChevronUp, ChevronDown, MessageSquare } from "lucide-react";
import type { Filters } from "@/types/types";
import { useChatTutorial } from "@/app/components/tutorial";

// Dynamic imports for map panels (client-side only)
const ListingBottomPanel = dynamic(
  () => import("@/app/components/mls/map/ListingBottomPanel"),
  { ssr: false }
);

const FavoritesPannel = dynamic(
  () => import("@/app/components/mls/map/FavoritesPannel"),
  { ssr: false }
);

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isMapVisible, showMapAtLocation, hideMap } = useMapControl();
  const { viewState } = useMapState();
  const {
    selectedListing,
    selectedFullListing,
    visibleListings,
    likedListings,
    dislikedListings,
    closeListing,
    selectListing,
    removeFavorite,
    clearFavorites,
    swipeLeft,
    swipeRight,
    removeDislike,
    clearDislikes,
    mapStyle,
    setMapStyle,
    filters,
    setFilters,
    loadListings,
    swipeQueue,
  } = useMLSContext();

  const { notificationContent, setNotificationContent, setUnreadMessage } = useChatContext();
  const tutorial = useChatTutorial();

  const [favoritesPannelOpen, setFavoritesPannelOpen] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [filterSections, setFilterSections] = useState({
    listingType: true,  // Open by default
    propertyAttributes: false,
    hoa: false,
    communityFeatures: false
  });
  const [initialLoad, setInitialLoad] = useState(true);
  const isClosingRef = useRef(false);

  // Notify TopToggles when favorites panel opens/closes
  useEffect(() => {
    const event = new CustomEvent('favoritesPanelChange', { detail: { isOpen: favoritesPannelOpen } });
    window.dispatchEvent(event);
  }, [favoritesPannelOpen]);

  // Import theme context
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Check for view parameter on initial mount with conflict resolution
  useEffect(() => {
    const viewParam = searchParams?.get('view');
    const mapParam = searchParams?.get('map');
    const urlWantsMap = viewParam === 'map' || mapParam === 'open';

    // Conflict resolution: if URL and state disagree, state wins (user's last action)
    // sessionStorage is already loaded into isMapVisible state
    if (urlWantsMap && !isMapVisible) {
      // URL wants map but state says hidden
      // This means user closed map, then refreshed - respect their choice
      console.log('🔧 [HomePage] URL/state conflict: Clearing stale ?view=map parameter');
      router.replace('/', { scroll: false });
    } else if (!urlWantsMap && isMapVisible) {
      // State wants map but URL doesn't have it - sync URL
      console.log('🔧 [HomePage] URL/state conflict: Adding missing ?view=map parameter');
      router.replace('/?view=map', { scroll: false });
    } else if (urlWantsMap && isMapVisible) {
      // Both agree map should be visible - restore position if available
      const latParam = searchParams?.get('lat');
      const lngParam = searchParams?.get('lng');
      const zoomParam = searchParams?.get('zoom');

      if (latParam && lngParam && zoomParam) {
        const lat = parseFloat(latParam);
        const lng = parseFloat(lngParam);
        const zoom = parseFloat(zoomParam);
        console.log('🗺️ [HomePage] Restoring map view from URL:', { lat, lng, zoom });
        showMapAtLocation(lat, lng, zoom);
      } else {
        // Show entire California on initial map load
        showMapAtLocation(37.0, -119.5, 5);
      }
    }

    setInitialLoad(false);
  }, []); // Only run on mount

  // Update URL when map visibility changes (but not on initial load)
  useEffect(() => {
    if (initialLoad) return;

    const currentView = searchParams?.get('view');

    if (isMapVisible && currentView !== 'map') {
      console.log('🔧 [HomePage] Syncing URL: Adding ?view=map');
      router.replace('/?view=map', { scroll: false });
    } else if (!isMapVisible && currentView === 'map') {
      console.log('🔧 [HomePage] Syncing URL: Removing ?view=map');
      router.replace('/', { scroll: false });
    }
  }, [isMapVisible, initialLoad, router, searchParams]);

  // Listen for map controls toggle event from ChatWidget
  useEffect(() => {
    const handleToggleControls = () => {
      setControlsExpanded(prev => !prev);
    };

    window.addEventListener('toggleMapControls', handleToggleControls);
    return () => window.removeEventListener('toggleMapControls', handleToggleControls);
  }, []);

  // Restore selected listing from URL parameter
  useEffect(() => {
    if (initialLoad || !isMapVisible || isClosingRef.current) return;

    // Check URL for listing slug
    const listingParam = searchParams?.get('listing');
    if (listingParam && !selectedListing) {
      console.log('🗺️ [HomePage] Attempting to restore selected listing from URL:', listingParam);

      // Fetch the listing from the API and select it
      fetch(`/api/mls-listings/${listingParam}`)
        .then(res => res.json())
        .then(data => {
          if (data.listing) {
            console.log('✅ [HomePage] Fetched listing data, selecting:', listingParam);
            selectListing(data.listing);
          } else {
            console.warn('⚠️ [HomePage] No listing data returned for:', listingParam);
          }
        })
        .catch((err) => {
          console.warn('⚠️ [HomePage] Failed to fetch listing:', listingParam, err);
        });
    }
  }, [isMapVisible, selectedListing, selectListing, initialLoad, searchParams]);

  // Initialize swipe queue when a listing is selected
  useEffect(() => {
    if (selectedListing) {
      console.log('[HomePage] Initializing swipe queue for:', selectedListing.listingKey);
      swipeQueue.initializeQueue(selectedListing);
    }
  }, [selectedListing?.listingKey, swipeQueue]);

  // Wrapper to close listing and clear URL parameter
  const handleCloseListing = () => {
    console.log('[HomePage] Closing listing and clearing URL parameter');

    // Mark that we're intentionally closing
    isClosingRef.current = true;

    // Remove listing parameter from URL FIRST
    const params = new URLSearchParams(searchParams?.toString());
    params.delete('listing');

    const newUrl = params.toString() ? `/?${params.toString()}` : '/';
    router.replace(newUrl, { scroll: false });

    // Then close the listing state
    closeListing();

    // Reset the closing flag after a brief delay
    setTimeout(() => {
      isClosingRef.current = false;
    }, 100);
  };

  // Handler to advance to next listing after swipe
  const handleSwipeAndAdvance = async (swipeAction: 'left' | 'right') => {
    if (!selectedFullListing) return;

    console.log(`\n🔄 [handleSwipeAndAdvance] Swipe ${swipeAction} on:`, selectedFullListing.listingKey);

    // Perform the swipe action
    if (swipeAction === 'left') {
      swipeLeft(selectedFullListing);
    } else {
      swipeRight(selectedFullListing);
    }

    // Get next listing from queue
    console.log('📊 [handleSwipeAndAdvance] Calling swipeQueue.getNext()...');
    const { listing: nextQueueItem } = swipeQueue.getNext();

    console.log('📊 [handleSwipeAndAdvance] getNext() returned:', nextQueueItem ? `${nextQueueItem.listingKey} - ${nextQueueItem.slug}` : 'null');

    if (nextQueueItem) {
      console.log(`🔍 [handleSwipeAndAdvance] Looking for ${nextQueueItem.listingKey} in ${visibleListings.length} visible listings`);

      // Find the full listing in visibleListings
      const nextListing = visibleListings.find(
        (l) => l.listingKey === nextQueueItem.listingKey
      );

      if (nextListing) {
        console.log('✅ [handleSwipeAndAdvance] Found next listing, advancing to:', nextQueueItem.listingKey);
        await selectListing(nextListing);
      } else {
        console.warn('⚠️ [handleSwipeAndAdvance] Next listing not found in visibleListings');
        console.warn('   Visible listing keys:', visibleListings.slice(0, 5).map(l => l.listingKey));
        handleCloseListing();
      }
    } else {
      console.log('🏁 [handleSwipeAndAdvance] Queue exhausted, closing panel');
      handleCloseListing();
    }
  };

  const handleToggleMap = () => {
    if (isMapVisible) {
      hideMap();
    } else {
      // Check if map was pre-positioned by chat (viewState exists)
      if (viewState) {
        // Use pre-positioned location from chat query
        console.log('🗺️ [handleToggleMap] Using pre-positioned location:', viewState);
        showMapAtLocation(
          viewState.centerLat,
          viewState.centerLng,
          viewState.zoom
        );
      } else {
        // Default: Show entire California
        console.log('🗺️ [handleToggleMap] No pre-positioned location, showing California');
        showMapAtLocation(37.0, -119.5, 5);
      }
    }
  };

  // Default bounds for California
  const DEFAULT_BOUNDS = {
    north: 42.0,
    south: 32.5,
    east: -114.0,
    west: -124.5,
    zoom: 5.5,
  };

  const handleApplyFilters = async (newFilters: Filters) => {
    console.log("🎯 Applying filters:", newFilters);
    setFilters(newFilters);
    setFiltersExpanded(false);
    // Reload listings with new filters
    await loadListings(DEFAULT_BOUNDS, newFilters);
  };

  const handleResetFilters = () => {
    const defaultFilters: Filters = {
      listingType: "sale",
      minPrice: "",
      maxPrice: "",
      beds: "",
      baths: "",
      minSqft: "",
      maxSqft: "",
      minLotSize: "",
      maxLotSize: "",
      minYear: "",
      maxYear: "",
      propertyType: "",
      propertySubType: "",
      minGarages: "",
      hoa: "",
      landType: "",
      city: "",
      subdivision: "",
    };
    handleApplyFilters(defaultFilters);
  };

  // Notification toast handlers
  const handleDismissNotification = () => {
    setNotificationContent(null);
  };

  const handleClickNotification = () => {
    // Switch to chat view
    hideMap();
    // Clear notification badge and toast
    setUnreadMessage(false);
    setNotificationContent(null);
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{ minHeight: '100dvh' }}
    >
      {/* Spatial Background - base layer */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 0,
          pointerEvents: 'none',
        }}
      >
        <SpaticalBackground showGradient={true} className="h-full w-full" />
      </div>

      {/* Map Layer with wipe clip-path effect */}
      <div
        className="fixed inset-0 transition-all duration-[1500ms] ease-in-out"
        style={{
          zIndex: 1,
          clipPath: isMapVisible
            ? 'inset(0% 0% 0% 0%)' // Fully visible
            : 'inset(50% 0% 50% 0%)', // Clipped to center horizontal line (hidden)
          pointerEvents: isMapVisible ? 'auto' : 'none',
        }}
      >
        <MapLayer />
      </div>

      {/* Map Search Bar - Only visible when map is active */}
      {isMapVisible && (
        <MapSearchBar
          onSearch={(query) => {
            console.log('🗺️ [Map Search]:', query);
          }}
          onSettingsClick={() => {
            setControlsExpanded(!controlsExpanded);
          }}
        />
      )}

      {/* Favorites Button - Under info panel (when map is visible and has favorites) */}
      {isMapVisible && likedListings.length > 0 && (
        <button
          onClick={() => setFavoritesPannelOpen(true)}
          className={`fixed top-32 right-4 z-30 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
            isLight
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-pink-600 hover:bg-pink-700 text-white"
          }`}
          aria-label="View Favorites"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          {likedListings.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {likedListings.length}
            </span>
          )}
        </button>
      )}

      {/* Chat Widget - renders above both backgrounds */}
      {/* When map is visible, only the input bar should capture clicks */}
      <div className="relative z-20" style={{ pointerEvents: isMapVisible ? 'none' : 'auto' }}>
        <ChatWidget />
      </div>

      {/* Favorites Panel - only show when map is visible */}
      {isMapVisible && (
        <FavoritesPannel
          visibleListings={visibleListings}
          favorites={likedListings}
          dislikedListings={dislikedListings}
          isSidebarOpen={favoritesPannelOpen}
          selectedListing={selectedListing}
          onClose={() => setFavoritesPannelOpen(false)}
          onSelectListing={selectListing}
          onRemoveFavorite={removeFavorite}
          onClearFavorites={clearFavorites}
          onRemoveDislike={removeDislike}
          onClearDislikes={clearDislikes}
        />
      )}

      {/* Listing Bottom Panel - shows when a listing is selected */}
      <AnimatePresence mode="wait">
        {isMapVisible && selectedListing && selectedFullListing && (
          <ListingBottomPanel
            key={selectedFullListing.listingKey}
            listing={selectedListing}
            fullListing={selectedFullListing}
            onClose={handleCloseListing}
            onSwipeLeft={() => handleSwipeAndAdvance('left')}
            onSwipeRight={() => handleSwipeAndAdvance('right')}
            isSidebarOpen={false}
            isDisliked={dislikedListings.some(l => l.listingKey === selectedFullListing.listingKey)}
            onRemoveDislike={() => selectedListing && removeDislike(selectedListing)}
            onPanelClosedForTutorial={tutorial.run && tutorial.stepIndex === 9 ? tutorial.onPanelClosed : undefined}
          />
        )}
      </AnimatePresence>

      {/* Map Controls - Only visible when map is active and expanded */}
      {isMapVisible && controlsExpanded && (
        <div className="fixed bottom-[160px] sm:bottom-28 left-4 right-4 z-40 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl pointer-events-auto">
          {/* Expanded Panel - slides up from search bar */}
          <AnimatePresence>
            {controlsExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                mass: 0.5
              }}
              className={`rounded-2xl backdrop-blur-xl border overflow-hidden max-h-[70vh] overflow-y-auto shadow-2xl ${
                isLight
                  ? 'bg-white/95 border-gray-300'
                  : 'bg-black/95 border-neutral-800'
              }`}
              style={{
                backdropFilter: "blur(20px) saturate(150%)",
                WebkitBackdropFilter: "blur(20px) saturate(150%)",
              }}
            >
              {/* Header with Close Button */}
              <div
                className={`pt-3 pb-2 flex justify-between items-center px-4 border-b ${
                  isLight ? 'bg-white/95 border-gray-200' : 'bg-black/95 border-neutral-700'
                }`}
              >
                <h3 className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Map Settings
                </h3>
                <button
                  onClick={() => setControlsExpanded(false)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isLight ? 'hover:bg-gray-200 active:bg-gray-300 text-gray-600' : 'hover:bg-neutral-800 active:bg-neutral-700 text-neutral-400'
                  }`}
                  aria-label="Close settings"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              {/* Filters Section */}
              <div className={`border-b ${isLight ? 'border-gray-200' : 'border-neutral-700'}`}>
                <button
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className={`w-full px-3 sm:px-4 py-3 sm:py-2.5 flex items-center justify-between transition-colors touch-manipulation ${
                    isLight
                      ? 'hover:bg-gray-100 active:bg-gray-200'
                      : 'hover:bg-neutral-800/50 active:bg-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className={`w-4 h-4 sm:w-5 sm:h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                    <span className={`text-xs sm:text-sm font-medium ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>FILTERS</span>
                  </div>
                  {filtersExpanded ? (
                    <ChevronUp className={`w-4 h-4 sm:w-5 sm:h-5 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                  ) : (
                    <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                  )}
                </button>

                <AnimatePresence>
                  {filtersExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`max-h-[60vh] overflow-y-auto ${
                        isLight ? 'scrollbar-light' : 'scrollbar-dark'
                      }`}>
                        {/* Listing Type Accordion */}
                        <div className={`border-b ${isLight ? 'border-gray-200' : 'border-neutral-700'}`}>
                          <button
                            onClick={() => setFilterSections({ listingType: !filterSections.listingType, propertyAttributes: false, hoa: false, communityFeatures: false })}
                            className={`w-full px-3 sm:px-4 py-3 sm:py-2.5 flex items-center justify-between transition-colors touch-manipulation ${
                              isLight
                                ? 'hover:bg-gray-100 active:bg-gray-200'
                                : 'hover:bg-neutral-800/50 active:bg-neutral-800'
                            }`}
                          >
                            <span className={`text-xs sm:text-sm font-medium ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>
                              LISTING TYPE
                            </span>
                            {filterSections.listingType ? (
                              <ChevronUp className={`w-4 h-4 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                            ) : (
                              <ChevronDown className={`w-4 h-4 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                            )}
                          </button>
                          <AnimatePresence>
                            {filterSections.listingType && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-3 sm:p-4">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { value: "sale", label: "For Sale" },
                              { value: "rental", label: "For Rent" },
                              { value: "multifamily", label: "Multi-Family" },
                              { value: "land", label: "Land" }
                            ].map((type) => (
                              <button
                                key={type.value}
                                onClick={() => handleApplyFilters({ ...filters, listingType: type.value })}
                                className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                  filters.listingType === type.value
                                    ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                    : (isLight
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                                }`}
                              >
                                {type.label}
                              </button>
                            ))}
                          </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Property Attributes Accordion */}
                        <div className={`border-b ${isLight ? 'border-gray-200' : 'border-neutral-700'}`}>
                          <button
                            onClick={() => setFilterSections({ listingType: false, propertyAttributes: !filterSections.propertyAttributes, hoa: false, communityFeatures: false })}
                            className={`w-full px-3 sm:px-4 py-3 sm:py-2.5 flex items-center justify-between transition-colors touch-manipulation ${
                              isLight
                                ? 'hover:bg-gray-100 active:bg-gray-200'
                                : 'hover:bg-neutral-800/50 active:bg-neutral-800'
                            }`}
                          >
                            <span className={`text-xs sm:text-sm font-medium ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>
                              PROPERTY ATTRIBUTES
                            </span>
                            {filterSections.propertyAttributes ? (
                              <ChevronUp className={`w-4 h-4 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                            ) : (
                              <ChevronDown className={`w-4 h-4 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                            )}
                          </button>
                          <AnimatePresence>
                            {filterSections.propertyAttributes && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                        {/* Price Range */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                              Min Price
                            </label>
                            <input
                              type="text"
                              placeholder="Any"
                              value={filters.minPrice}
                              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                              className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                isLight
                                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                  : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                              }`}
                            />
                          </div>
                          <div>
                            <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                              Max Price
                            </label>
                            <input
                              type="text"
                              placeholder="Any"
                              value={filters.maxPrice}
                              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                              className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                isLight
                                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                  : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Bedrooms */}
                        <div>
                          <label className={`text-xs sm:text-sm mb-2 block font-medium ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                            Bedrooms
                          </label>
                          <div className="grid grid-cols-6 gap-1.5">
                            {['Any', '1', '2', '3', '4', '5+'].map((bed) => (
                              <button
                                key={bed}
                                onClick={() => setFilters({ ...filters, beds: bed === 'Any' ? '' : bed === '5+' ? '5' : bed })}
                                className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                  (bed === 'Any' && !filters.beds) || (bed === '5+' && filters.beds === '5') || filters.beds === bed
                                    ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                    : (isLight
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                                }`}
                              >
                                {bed}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Bathrooms */}
                        <div>
                          <label className={`text-xs sm:text-sm mb-2 block font-medium ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                            Bathrooms
                          </label>
                          <div className="grid grid-cols-6 gap-1.5">
                            {['Any', '1', '2', '3', '4', '5+'].map((bath) => (
                              <button
                                key={bath}
                                onClick={() => setFilters({ ...filters, baths: bath === 'Any' ? '' : bath === '5+' ? '5' : bath })}
                                className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                  (bath === 'Any' && !filters.baths) || (bath === '5+' && filters.baths === '5') || filters.baths === bath
                                    ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                    : (isLight
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                                }`}
                              >
                                {bath}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Square Footage */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                              Min Sqft
                            </label>
                            <select
                              value={filters.minSqft}
                              onChange={(e) => setFilters({ ...filters, minSqft: e.target.value })}
                              className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                isLight
                                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                  : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                              }`}
                            >
                              <option value="">Any</option>
                              <option value="500">500+ sqft</option>
                              <option value="750">750+ sqft</option>
                              <option value="1000">1,000+ sqft</option>
                              <option value="1250">1,250+ sqft</option>
                              <option value="1500">1,500+ sqft</option>
                              <option value="1750">1,750+ sqft</option>
                              <option value="2000">2,000+ sqft</option>
                              <option value="2500">2,500+ sqft</option>
                              <option value="3000">3,000+ sqft</option>
                              <option value="3500">3,500+ sqft</option>
                              <option value="4000">4,000+ sqft</option>
                              <option value="5000">5,000+ sqft</option>
                            </select>
                          </div>
                          <div>
                            <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                              Max Sqft
                            </label>
                            <select
                              value={filters.maxSqft}
                              onChange={(e) => setFilters({ ...filters, maxSqft: e.target.value })}
                              className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                isLight
                                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                  : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                              }`}
                            >
                              <option value="">Any</option>
                              <option value="500">500 sqft</option>
                              <option value="750">750 sqft</option>
                              <option value="1000">1,000 sqft</option>
                              <option value="1250">1,250 sqft</option>
                              <option value="1500">1,500 sqft</option>
                              <option value="1750">1,750 sqft</option>
                              <option value="2000">2,000 sqft</option>
                              <option value="2500">2,500 sqft</option>
                              <option value="3000">3,000 sqft</option>
                              <option value="3500">3,500 sqft</option>
                              <option value="4000">4,000 sqft</option>
                              <option value="5000">5,000 sqft</option>
                            </select>
                          </div>
                        </div>

                        {/* Lot Size */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                              Min Lot Size
                            </label>
                            <select
                              value={filters.minLotSize}
                              onChange={(e) => setFilters({ ...filters, minLotSize: e.target.value })}
                              className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                isLight
                                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                  : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                              }`}
                            >
                              <option value="">Any</option>
                              <option value="2000">2,000+ sqft</option>
                              <option value="3000">3,000+ sqft</option>
                              <option value="4000">4,000+ sqft</option>
                              <option value="5000">5,000+ sqft</option>
                              <option value="7500">7,500+ sqft</option>
                              <option value="10000">10,000+ sqft (0.23 acres)</option>
                              <option value="21780">21,780+ sqft (0.5 acres)</option>
                              <option value="43560">43,560+ sqft (1 acre)</option>
                              <option value="87120">87,120+ sqft (2 acres)</option>
                              <option value="217800">217,800+ sqft (5 acres)</option>
                              <option value="435600">435,600+ sqft (10 acres)</option>
                            </select>
                          </div>
                          <div>
                            <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                              Max Lot Size
                            </label>
                            <select
                              value={filters.maxLotSize}
                              onChange={(e) => setFilters({ ...filters, maxLotSize: e.target.value })}
                              className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                isLight
                                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                  : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                              }`}
                            >
                              <option value="">Any</option>
                              <option value="2000">2,000 sqft</option>
                              <option value="3000">3,000 sqft</option>
                              <option value="4000">4,000 sqft</option>
                              <option value="5000">5,000 sqft</option>
                              <option value="7500">7,500 sqft</option>
                              <option value="10000">10,000 sqft (0.23 acres)</option>
                              <option value="21780">21,780 sqft (0.5 acres)</option>
                              <option value="43560">43,560 sqft (1 acre)</option>
                              <option value="87120">87,120 sqft (2 acres)</option>
                              <option value="217800">217,800 sqft (5 acres)</option>
                              <option value="435600">435,600 sqft (10 acres)</option>
                            </select>
                          </div>
                        </div>

                        {/* Year Built */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                              Min Year Built
                            </label>
                            <select
                              value={filters.minYear}
                              onChange={(e) => setFilters({ ...filters, minYear: e.target.value })}
                              className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                isLight
                                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                  : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                              }`}
                            >
                              <option value="">Any</option>
                              <option value="1900">1900+</option>
                              <option value="1950">1950+</option>
                              <option value="1960">1960+</option>
                              <option value="1970">1970+</option>
                              <option value="1980">1980+</option>
                              <option value="1990">1990+</option>
                              <option value="2000">2000+</option>
                              <option value="2005">2005+</option>
                              <option value="2010">2010+</option>
                              <option value="2015">2015+</option>
                              <option value="2020">2020+</option>
                              <option value="2024">2024+</option>
                              <option value="2025">2025 (New)</option>
                            </select>
                          </div>
                          <div>
                            <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                              Max Year Built
                            </label>
                            <select
                              value={filters.maxYear}
                              onChange={(e) => setFilters({ ...filters, maxYear: e.target.value })}
                              className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                isLight
                                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                  : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                              }`}
                            >
                              <option value="">Any</option>
                              <option value="1900">1900</option>
                              <option value="1950">1950</option>
                              <option value="1960">1960</option>
                              <option value="1970">1970</option>
                              <option value="1980">1980</option>
                              <option value="1990">1990</option>
                              <option value="2000">2000</option>
                              <option value="2005">2005</option>
                              <option value="2010">2010</option>
                              <option value="2015">2015</option>
                              <option value="2020">2020</option>
                              <option value="2024">2024</option>
                              <option value="2025">2025</option>
                            </select>
                          </div>
                        </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* HOA Accordion */}
                        <div className={`border-b ${isLight ? 'border-gray-200' : 'border-neutral-700'}`}>
                          <button
                            onClick={() => setFilterSections({ listingType: false, propertyAttributes: false, hoa: !filterSections.hoa, communityFeatures: false })}
                            className={`w-full px-3 sm:px-4 py-3 sm:py-2.5 flex items-center justify-between transition-colors touch-manipulation ${
                              isLight
                                ? 'hover:bg-gray-100 active:bg-gray-200'
                                : 'hover:bg-neutral-800/50 active:bg-neutral-800'
                            }`}
                          >
                            <span className={`text-xs sm:text-sm font-medium ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>
                              HOA
                            </span>
                            {filterSections.hoa ? (
                              <ChevronUp className={`w-4 h-4 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                            ) : (
                              <ChevronDown className={`w-4 h-4 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                            )}
                          </button>
                          <AnimatePresence>
                            {filterSections.hoa && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                        {/* HOA Presence */}
                        <div>
                          <label className={`text-xs sm:text-sm mb-2 block font-medium ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                            HOA
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => setFilters({ ...filters, associationYN: undefined })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.associationYN === undefined
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              Any
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, associationYN: true })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.associationYN === true
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, associationYN: false })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.associationYN === false
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        {/* Max HOA Fee */}
                        <div>
                          <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                            Max HOA Fee ($/month)
                          </label>
                          <input
                            type="text"
                            placeholder="Any"
                            value={filters.hoa}
                            onChange={(e) => setFilters({ ...filters, hoa: e.target.value })}
                            className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                              isLight
                                ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                            }`}
                          />
                        </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Community Features Accordion */}
                        <div className={`border-b ${isLight ? 'border-gray-200' : 'border-neutral-700'}`}>
                          <button
                            onClick={() => setFilterSections({ listingType: false, propertyAttributes: false, hoa: false, communityFeatures: !filterSections.communityFeatures })}
                            className={`w-full px-3 sm:px-4 py-3 sm:py-2.5 flex items-center justify-between transition-colors touch-manipulation ${
                              isLight
                                ? 'hover:bg-gray-100 active:bg-gray-200'
                                : 'hover:bg-neutral-800/50 active:bg-neutral-800'
                            }`}
                          >
                            <span className={`text-xs sm:text-sm font-medium ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>
                              COMMUNITY FEATURES
                            </span>
                            {filterSections.communityFeatures ? (
                              <ChevronUp className={`w-4 h-4 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                            ) : (
                              <ChevronDown className={`w-4 h-4 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                            )}
                          </button>
                          <AnimatePresence>
                            {filterSections.communityFeatures && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                        {/* Pool */}
                        <div>
                          <label className={`text-xs sm:text-sm mb-2 block font-medium ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                            Pool
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => setFilters({ ...filters, poolYn: undefined })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.poolYn === undefined
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              Any
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, poolYn: true })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.poolYn === true
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, poolYn: false })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.poolYn === false
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        {/* Spa */}
                        <div>
                          <label className={`text-xs sm:text-sm mb-2 block font-medium ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                            Spa
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => setFilters({ ...filters, spaYn: undefined })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.spaYn === undefined
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              Any
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, spaYn: true })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.spaYn === true
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, spaYn: false })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.spaYn === false
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        {/* Gated Community */}
                        <div>
                          <label className={`text-xs sm:text-sm mb-2 block font-medium ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                            Gated Community
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => setFilters({ ...filters, gatedCommunity: undefined })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.gatedCommunity === undefined
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              Any
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, gatedCommunity: true })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.gatedCommunity === true
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, gatedCommunity: false })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.gatedCommunity === false
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                        {/* Senior Community */}
                        <div>
                          <label className={`text-xs sm:text-sm mb-2 block font-medium ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                            Senior Community (55+)
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              onClick={() => setFilters({ ...filters, seniorCommunity: undefined })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.seniorCommunity === undefined
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              Any
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, seniorCommunity: true })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.seniorCommunity === true
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setFilters({ ...filters, seniorCommunity: false })}
                              className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation transition-all ${
                                filters.seniorCommunity === false
                                  ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                                  : (isLight
                                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                      : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600')
                              }`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Action Buttons - Always visible */}
                        <div className="p-3 sm:p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApplyFilters(filters)}
                            className={`flex-1 px-3 py-2.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                              isLight
                                ? 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white'
                                : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white'
                            }`}
                          >
                            Apply Filters
                          </button>
                          <button
                            onClick={handleResetFilters}
                            className={`px-4 py-2.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                              isLight
                                ? 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-700'
                                : 'bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300'
                            }`}
                          >
                            Reset
                          </button>
                        </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Notification Toast */}
      <AnimatePresence>
        {notificationContent && (
          <NotificationToast
            message={notificationContent.message}
            locationName={notificationContent.locationName}
            onDismiss={handleDismissNotification}
            onClick={handleClickNotification}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <MLSProvider>
      <ChatProvider>
        <HomeContent />
      </ChatProvider>
    </MLSProvider>
  );
}
