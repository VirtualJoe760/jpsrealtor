"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { ChatProvider } from "@/app/components/chat/ChatProvider";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
import { useTheme } from "@/app/contexts/ThemeContext";
import ChatWidget from "@/app/components/chat/ChatWidget";
import MapLayer from "@/app/components/MapLayer";
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";
import { useMapControl } from "@/app/hooks/useMapControl";
import { Map, Satellite, Globe, SlidersHorizontal, ChevronUp, ChevronDown } from "lucide-react";
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
    removeDislike,
    clearDislikes,
    mapStyle,
    setMapStyle,
    filters,
    setFilters,
    loadListings,
  } = useMLSContext();

  const [favoritesPannelOpen, setFavoritesPannelOpen] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Import theme context
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Listen for map controls toggle event from ChatWidget
  useEffect(() => {
    const handleToggleControls = () => {
      setControlsExpanded(prev => !prev);
    };

    window.addEventListener('toggleMapControls', handleToggleControls);
    return () => window.removeEventListener('toggleMapControls', handleToggleControls);
  }, []);

  const handleToggleMap = () => {
    if (isMapVisible) {
      hideMap();
    } else {
      // Show map centered on Palm Desert
      showMapAtLocation(33.8303, -116.5453, 12);
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
    <div className="relative min-h-screen overflow-hidden">
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

      {/* Map/Chat Toggle Button - Top Right */}
      <button
        onClick={handleToggleMap}
        className={`fixed top-4 right-4 z-30 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
          isLight
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : "bg-purple-600 hover:bg-purple-700 text-white"
        }`}
        aria-label={isMapVisible ? "Show Chat" : "Show Map"}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isMapVisible ? (
            // Chat icon when map is visible (go back to chat)
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          ) : (
            // Map icon when chat is visible (show map)
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          )}
        </svg>
      </button>

      {/* Favorites Button - Top Right (when map is visible and has favorites) */}
      {isMapVisible && likedListings.length > 0 && (
        <button
          onClick={() => setFavoritesPannelOpen(true)}
          className={`fixed top-4 right-20 z-30 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110 ${
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
            onSwipeLeft={() => {}} // TODO: Implement swipe functionality
            onSwipeRight={() => {}} // TODO: Implement swipe functionality
            isLiked={likedListings.some(l => l.listingKey === selectedFullListing.listingKey)}
            isDisliked={dislikedListings.some(l => l.listingKey === selectedFullListing.listingKey)}
            onLike={() => {}} // TODO: Add like handler
            onDislike={() => {}} // TODO: Add dislike handler
            onRemoveLike={removeFavorite}
            onRemoveDislike={removeDislike}
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
