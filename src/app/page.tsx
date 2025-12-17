"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
import { useTheme } from "@/app/contexts/ThemeContext";
import ChatWidget from "@/app/components/chat/ChatWidget";
import MapLayer from "@/app/components/MapLayer";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import { useMapControl } from "@/app/hooks/useMapControl";
import { Map, Satellite, Globe, SlidersHorizontal, ChevronUp, ChevronDown, MessageSquare } from "lucide-react";
import type { Filters } from "@/types/types";

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

  const [favoritesPannelOpen, setFavoritesPannelOpen] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // Notify TopToggles when favorites panel opens/closes
  useEffect(() => {
    const event = new CustomEvent('favoritesPanelChange', { detail: { isOpen: favoritesPannelOpen } });
    window.dispatchEvent(event);
  }, [favoritesPannelOpen]);

  // Import theme context
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Check for view parameter on initial mount
  useEffect(() => {
    const viewParam = searchParams?.get('view');
    const mapParam = searchParams?.get('map');

    if (viewParam === 'map' || mapParam === 'open') {
      if (!isMapVisible) {
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
      router.replace('/?view=map', { scroll: false });
    } else if (!isMapVisible && currentView === 'map') {
      router.replace('/', { scroll: false });
    }
  }, [isMapVisible, initialLoad]);

  // Listen for map controls toggle event from ChatWidget
  useEffect(() => {
    const handleToggleControls = () => {
      setControlsExpanded(prev => !prev);
    };

    window.addEventListener('toggleMapControls', handleToggleControls);
    return () => window.removeEventListener('toggleMapControls', handleToggleControls);
  }, []);

  // Initialize swipe queue when a listing is selected
  useEffect(() => {
    if (selectedListing && !swipeQueue.isReady) {
      console.log('[HomePage] Initializing swipe queue for:', selectedListing.listingKey);
      swipeQueue.initializeQueue(selectedListing);
    }
  }, [selectedListing, swipeQueue]);

  // Handler to advance to next listing after swipe
  const handleSwipeAndAdvance = async (swipeAction: 'left' | 'right') => {
    if (!selectedFullListing) return;

    // Perform the swipe action
    if (swipeAction === 'left') {
      swipeLeft(selectedFullListing);
    } else {
      swipeRight(selectedFullListing);
    }

    // Get next listing from queue
    const { listing: nextQueueItem } = swipeQueue.getNext();

    if (nextQueueItem) {
      // Find the full listing in visibleListings
      const nextListing = visibleListings.find(
        (l) => l.listingKey === nextQueueItem.listingKey
      );

      if (nextListing) {
        console.log('[HomePage] Advancing to next listing:', nextQueueItem.listingKey);
        await selectListing(nextListing);
      } else {
        console.warn('[HomePage] Next listing not found in visibleListings, closing panel');
        closeListing();
      }
    } else {
      console.log('[HomePage] Queue exhausted, closing panel');
      closeListing();
    }
  };

  const handleToggleMap = () => {
    if (isMapVisible) {
      hideMap();
    } else {
      // Show map centered on California (entire state view)
      showMapAtLocation(37.0, -119.5, 5);
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
            onClose={closeListing}
            onSwipeLeft={() => handleSwipeAndAdvance('left')}
            onSwipeRight={() => handleSwipeAndAdvance('right')}
            isSidebarOpen={false}
            isDisliked={dislikedListings.some(l => l.listingKey === selectedFullListing.listingKey)}
            onRemoveDislike={() => selectedListing && removeDislike(selectedListing)}
          />
        )}
      </AnimatePresence>

      {/* Map Controls - Only visible when map is active and expanded */}
      {isMapVisible && controlsExpanded && (
        <div className="fixed bottom-24 left-4 right-4 z-40 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl pointer-events-auto">
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

              {/* Map Style Options */}
              <div className={`p-3 sm:p-4 border-b ${isLight ? 'border-gray-200' : 'border-neutral-700'}`}>
                <div className="mb-2">
                  <span className={`text-xs sm:text-sm font-medium ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>MAP STYLE</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['dark', 'bright', 'satellite', 'toner'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => {
                        if (setMapStyle) setMapStyle(style);
                      }}
                      className={`px-3 py-2.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all touch-manipulation ${
                        mapStyle === style
                          ? (isLight ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white')
                          : (isLight
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 active:bg-neutral-600')
                      }`}
                    >
                      {style === 'dark' ? 'Dark Matter' : style === 'bright' ? 'Bright' : style === 'satellite' ? 'Satellite' : 'Black & White'}
                    </button>
                  ))}
                </div>
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
                      <div className={`p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto ${
                        isLight ? 'scrollbar-light' : 'scrollbar-dark'
                      }`}>
                        {/* Listing Type */}
                        <div>
                          <label className={`text-xs sm:text-sm mb-2 block font-medium ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                            Listing Type
                          </label>
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

                        {/* Beds/Baths */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                              Min Beds
                            </label>
                            <input
                              type="text"
                              placeholder="Any"
                              value={filters.beds}
                              onChange={(e) => setFilters({ ...filters, beds: e.target.value })}
                              className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                isLight
                                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                  : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                              }`}
                            />
                          </div>
                          <div>
                            <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                              Min Baths
                            </label>
                            <input
                              type="text"
                              placeholder="Any"
                              value={filters.baths}
                              onChange={(e) => setFilters({ ...filters, baths: e.target.value })}
                              className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                isLight
                                  ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                  : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
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
