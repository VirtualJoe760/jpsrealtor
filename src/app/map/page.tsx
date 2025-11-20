"use client";

import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
import dynamicImport from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { MapPin, Loader2, Heart, List, Map as MapIcon, Satellite, Globe, SlidersHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import type { MapListing, Filters } from "@/types/types";

// Dynamic imports for map components (client-side only)
const MapView = dynamicImport(
  () => import("@/app/components/mls/map/MapView"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-neutral-400">Loading map...</p>
        </div>
      </div>
    ),
  }
);

const ListingBottomPanel = dynamicImport(
  () => import("@/app/components/mls/map/ListingBottomPanel"),
  { ssr: false }
);

const FavoritesPannel = dynamicImport(
  () => import("@/app/components/mls/map/FavoritesPannel"),
  { ssr: false }
);

// Default bounds for Coachella Valley
const DEFAULT_BOUNDS = {
  north: 33.82,
  south: 33.62,
  east: -116.27,
  west: -116.47,
  zoom: 11,
};

function MapPageContent() {
  const {
    visibleListings,
    selectedListing,
    selectedFullListing,
    isLoading,
    isPreloaded,
    isLoadingListing,
    mapStyle,
    setMapStyle,
    filters,
    setFilters,
    dislikedListings,
    likedListings,
    loadListings,
    selectListing,
    closeListing,
    swipeLeft,
    toggleFavorite,
    removeFavorite,
    clearFavorites,
    swipeQueue,
  } = useMLSContext();

  const [mounted, setMounted] = useState(false);
  const [favoritesPannelOpen, setFavoritesPannelOpen] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log("🗺️ Map page mounted, preloaded:", isPreloaded, "listings:", visibleListings.length);

    // Check URL for bounds parameter from chat map view
    const urlParams = new URLSearchParams(window.location.search);
    const boundsParam = urlParams.get('bounds');

    console.log('🔍 URL search params:', window.location.search);
    console.log('📦 Raw bounds parameter:', boundsParam);

    let initialBounds = DEFAULT_BOUNDS;
    if (boundsParam) {
      try {
        const parsedBounds = JSON.parse(decodeURIComponent(boundsParam));
        initialBounds = parsedBounds;
        console.log("✅ Successfully parsed bounds from URL:", initialBounds);
        console.log("📍 Bounds details - North:", parsedBounds.north, "South:", parsedBounds.south, "East:", parsedBounds.east, "West:", parsedBounds.west, "Zoom:", parsedBounds.zoom);
      } catch (e) {
        console.error("❌ Failed to parse bounds from URL:", e);
        console.error("❌ Raw boundsParam was:", boundsParam);
      }
    } else {
      console.log("ℹ️ No bounds parameter found, using DEFAULT_BOUNDS:", DEFAULT_BOUNDS);
    }

    // Load listings if not preloaded yet
    if (!isPreloaded && !isLoading) {
      console.log("🚀 Loading MLS listings for map with bounds:", initialBounds);
      loadListings(initialBounds, filters);
    } else {
      console.log("ℹ️ Skipping loadListings - preloaded:", isPreloaded, "isLoading:", isLoading);
    }

    // Force map to resize after mount
    const timer = setTimeout(() => {
      console.log("🔄 Dispatching window resize event");
      window.dispatchEvent(new Event('resize'));
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (visibleListings.length > 0) {
      console.log("📍 Displaying", visibleListings.length, "properties on map");
    }
  }, [visibleListings.length]);

  const handleBoundsChange = useCallback(
    (bounds: any) => {
      console.log("🗺️ Map bounds changed:", bounds);
    },
    []
  );

  const handleApplyFilters = useCallback(
    async (newFilters: Filters) => {
      console.log("🎯 Applying filters:", newFilters);
      setFilters(newFilters);
      setFiltersExpanded(false);

      // Reload listings with new filters
      const urlParams = new URLSearchParams(window.location.search);
      const boundsParam = urlParams.get('bounds');

      let bounds = DEFAULT_BOUNDS;
      if (boundsParam) {
        try {
          bounds = JSON.parse(decodeURIComponent(boundsParam));
        } catch (e) {
          console.error("Failed to parse bounds:", e);
        }
      }

      await loadListings(bounds, newFilters);
    },
    [setFilters, loadListings]
  );

  const handleResetFilters = useCallback(() => {
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
  }, [handleApplyFilters]);

  const handleSelectListing = useCallback(
    async (listing: MapListing) => {
      console.log("🏠 User selected listing:", listing.address);
      await selectListing(listing);

      // Initialize swipe queue when a listing is selected
      if (swipeQueue.isReady && !swipeQueue.queueLength) {
        console.log("🎬 Initializing swipe queue for:", listing.address);
        await swipeQueue.initializeQueue(listing);
      }
    },
    [selectListing, swipeQueue]
  );

  const handleCloseListing = useCallback(() => {
    console.log("✖️ Closing listing panel");
    closeListing();
  }, [closeListing]);

  const handleSwipeLeft = useCallback(() => {
    if (!selectedFullListing) return;
    console.log("👈 Swiping left on listing:", selectedFullListing.address);
    swipeLeft(selectedFullListing);

    // Auto-load next listing from swipe queue
    const { listing: nextQueueItem, reason } = swipeQueue.getNext();
    if (nextQueueItem) {
      console.log("🔄 Auto-loading next listing from queue:", nextQueueItem.slug, "Reason:", reason);

      // Try to find in visible listings first
      let nextMapListing = visibleListings.find(
        (l) => l.listingKey === nextQueueItem.listingKey
      );

      // If not in visible listings, create a MapListing from QueueItem
      if (!nextMapListing) {
        console.log("ℹ️ Queue item not in visible listings, creating from queue data");
        nextMapListing = {
          _id: nextQueueItem._id || nextQueueItem.listingKey,
          listingKey: nextQueueItem.listingKey,
          slug: nextQueueItem.slug,
          slugAddress: nextQueueItem.slugAddress || nextQueueItem.slug,
          latitude: nextQueueItem.latitude,
          longitude: nextQueueItem.longitude,
          city: nextQueueItem.city,
          subdivisionName: nextQueueItem.subdivisionName,
          propertyType: nextQueueItem.propertyType,
          propertySubType: nextQueueItem.propertySubType,
        } as MapListing;
      }

      selectListing(nextMapListing);
    } else {
      console.log("📭 No more listings in queue");
      closeListing();
    }
  }, [selectedFullListing, swipeLeft, swipeQueue, selectListing, closeListing, visibleListings]);

  const handleSwipeRight = useCallback(() => {
    if (!selectedListing) return;
    console.log("👉 Swiping right on listing:", selectedListing.address);
    toggleFavorite(selectedListing);

    // Auto-load next listing from swipe queue
    const { listing: nextQueueItem, reason } = swipeQueue.getNext();
    if (nextQueueItem) {
      console.log("🔄 Auto-loading next listing from queue:", nextQueueItem.slug, "Reason:", reason);

      // Try to find in visible listings first
      let nextMapListing = visibleListings.find(
        (l) => l.listingKey === nextQueueItem.listingKey
      );

      // If not in visible listings, create a MapListing from QueueItem
      if (!nextMapListing) {
        console.log("ℹ️ Queue item not in visible listings, creating from queue data");
        nextMapListing = {
          _id: nextQueueItem._id || nextQueueItem.listingKey,
          listingKey: nextQueueItem.listingKey,
          slug: nextQueueItem.slug,
          slugAddress: nextQueueItem.slugAddress || nextQueueItem.slug,
          latitude: nextQueueItem.latitude,
          longitude: nextQueueItem.longitude,
          city: nextQueueItem.city,
          subdivisionName: nextQueueItem.subdivisionName,
          propertyType: nextQueueItem.propertyType,
          propertySubType: nextQueueItem.propertySubType,
        } as MapListing;
      }

      selectListing(nextMapListing);
    } else {
      console.log("📭 No more listings in queue");
      closeListing();
    }
  }, [selectedListing, toggleFavorite, swipeQueue, selectListing, closeListing, visibleListings]);

  // Check if current listing is disliked
  const isDisliked = selectedFullListing
    ? dislikedListings.some((d) => d.listingKey === selectedFullListing.listingKey)
    : false;

  const dislikedTimestamp = isDisliked
    ? dislikedListings.find((d) => d.listingKey === selectedFullListing?.listingKey)?.swipedAt
    : null;

  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-neutral-400">Initializing map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-black" data-page="map">
      {isLoading && visibleListings.length === 0 ? (
        // Loading state
        <div className="h-full w-full flex items-center justify-center bg-black">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            <p className="text-neutral-400">Loading properties...</p>
          </div>
        </div>
      ) : visibleListings.length === 0 ? (
        // Empty state
        <div className="h-full w-full flex items-center justify-center bg-black">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6 text-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-light text-white mb-2">Map View</h2>
              <p className="text-neutral-400 max-w-md">
                No properties found. Adjust your filters or try a different area.
              </p>
            </div>
          </motion.div>
        </div>
      ) : (
        // Map with listings
        <>
          <MapView
            listings={visibleListings}
            centerLat={DEFAULT_BOUNDS.north - 0.1}
            centerLng={DEFAULT_BOUNDS.west + 0.1}
            zoom={DEFAULT_BOUNDS.zoom}
            onSelectListing={handleSelectListing}
            selectedListing={selectedListing}
            onBoundsChange={handleBoundsChange}
            panelOpen={!!selectedListing}
            mapStyle={mapStyle}
          />

          {/* Favorites Toggle Button - Top Right - Hidden when panel is open */}
          <AnimatePresence>
            {!favoritesPannelOpen && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onClick={() => setFavoritesPannelOpen(true)}
                className="absolute top-4 right-4 z-40 bg-black/80 backdrop-blur-lg px-3 sm:px-4 py-2.5 sm:py-2 rounded-full border border-neutral-700 hover:border-emerald-500 active:border-emerald-400 transition-all flex items-center gap-2 touch-manipulation"
              >
                <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${likedListings.length > 0 ? 'text-red-500 fill-red-500' : 'text-neutral-300'}`} />
                <span className="text-sm sm:text-base text-white font-medium">{likedListings.length}</span>
                <List className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-300" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Favorites Panel */}
          <FavoritesPannel
            visibleListings={visibleListings}
            favorites={likedListings}
            dislikedListings={dislikedListings}
            isSidebarOpen={favoritesPannelOpen}
            selectedListing={selectedListing}
            onClose={() => setFavoritesPannelOpen(false)}
            onSelectListing={handleSelectListing}
            onRemoveFavorite={removeFavorite}
            onClearFavorites={clearFavorites}
            onRemoveDislike={(listing) => {
              console.log("Remove dislike for:", listing.address);
            }}
            onClearDislikes={() => {
              console.log("Clear all dislikes");
            }}
          />

          {/* Listing Bottom Panel */}
          <AnimatePresence mode="wait">
            {selectedListing && selectedFullListing && (
              <ListingBottomPanel
                key={selectedFullListing.listingKey}
                listing={selectedListing}
                fullListing={selectedFullListing}
                onClose={handleCloseListing}
                onSwipeLeft={handleSwipeLeft}
                onSwipeRight={handleSwipeRight}
                isSidebarOpen={favoritesPannelOpen}
                isLeftSidebarCollapsed={false}
                isDisliked={isDisliked}
                dislikedTimestamp={dislikedTimestamp ? new Date(dislikedTimestamp).getTime() : null}
              />
            )}
          </AnimatePresence>

          {/* Loading indicator for listing details */}
          {isLoadingListing && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-lg px-4 py-2 rounded-full border border-neutral-700">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                <span className="text-sm text-neutral-300">Loading details...</span>
              </div>
            </div>
          )}

          {/* Map Controls - Mobile: Top swipeable tab, Desktop: Bottom left */}
          <div className="fixed top-0 left-0 right-0 sm:absolute sm:top-auto sm:bottom-4 sm:left-4 sm:right-auto z-40 sm:w-80 pointer-events-none">
            {/* Always show the toggle button at the top */}
            {!controlsExpanded && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => setControlsExpanded(true)}
                className="mx-auto sm:mx-0 sm:w-full bg-black/95 backdrop-blur-xl border-b border-x sm:border border-neutral-800 sm:border-neutral-700 rounded-b-xl sm:rounded-lg px-4 py-2 sm:py-2.5 transition-all hover:bg-neutral-900/95 sm:hover:border-emerald-500 active:bg-neutral-800/95 flex items-center justify-center gap-2 touch-manipulation shadow-lg pointer-events-auto"
                style={{ width: 'fit-content' }}
              >
                {mapStyle === 'dark' ? (
                  <MapIcon className="w-5 h-5 text-emerald-400" />
                ) : mapStyle === 'bright' ? (
                  <Globe className="w-5 h-5 text-emerald-400" />
                ) : mapStyle === 'satellite' ? (
                  <Satellite className="w-5 h-5 text-emerald-400" />
                ) : (
                  <MapIcon className="w-5 h-5 text-emerald-400" />
                )}
                <span className="text-sm font-medium text-white">Map Controls</span>
                <ChevronDown className="w-4 h-4 text-neutral-400 ml-1 sm:ml-auto" />
              </motion.button>
            )}

            {/* Expanded Panel */}
            {controlsExpanded && (
              <motion.div
                initial={{ clipPath: 'inset(0 0 100% 0)' }}
                animate={{ clipPath: 'inset(0 0 0 0)' }}
                exit={{ clipPath: 'inset(0 0 100% 0)' }}
                transition={{
                  type: "spring",
                  damping: 30,
                  stiffness: 300,
                  mass: 0.6
                }}
                className="bg-black/95 backdrop-blur-xl sm:rounded-lg border-b sm:border border-neutral-800 sm:border-neutral-700 overflow-hidden max-h-[80vh] overflow-y-auto shadow-2xl pointer-events-auto"
              >
                {/* Drag Handle & Close Button - Mobile Only */}
                <div className="sm:hidden pt-2 pb-1 flex justify-between items-center px-4 bg-black/95">
                  <div className="w-8"></div>
                  <div className="w-12 h-1 bg-neutral-600 rounded-full"></div>
                  <button
                    onClick={() => setControlsExpanded(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 active:bg-neutral-700 transition-colors"
                  >
                    <ChevronUp className="w-5 h-5 text-neutral-400" />
                  </button>
                </div>

                  {/* Map Style Options */}
                  <div className="p-3 sm:p-4 border-b border-neutral-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm text-neutral-400 font-medium">MAP STYLE</span>
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
                              ? 'bg-emerald-500 text-white'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 active:bg-neutral-600'
                          }`}
                        >
                          {style === 'dark' ? 'Dark Matter' : style === 'bright' ? 'Bright' : style === 'satellite' ? 'Satellite' : 'Black & White'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filters Section */}
                  <div className="border-b border-neutral-700">
                    <button
                      onClick={() => setFiltersExpanded(!filtersExpanded)}
                      className="w-full px-3 sm:px-4 py-3 sm:py-2.5 flex items-center justify-between hover:bg-neutral-800/50 active:bg-neutral-800 transition-colors touch-manipulation"
                    >
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                        <span className="text-xs sm:text-sm text-neutral-300 font-medium">FILTERS</span>
                      </div>
                      {filtersExpanded ? (
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-400" />
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
                          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
                            {/* Listing Type */}
                            <div>
                              <label className="text-xs sm:text-sm text-neutral-400 mb-2 block">Listing Type</label>
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  onClick={() => handleApplyFilters({ ...filters, listingType: "sale" })}
                                  className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation ${
                                    filters.listingType === "sale"
                                      ? "bg-emerald-500 text-white"
                                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600"
                                  }`}
                                >
                                  For Sale
                                </button>
                                <button
                                  onClick={() => handleApplyFilters({ ...filters, listingType: "rent" })}
                                  className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation ${
                                    filters.listingType === "rent"
                                      ? "bg-emerald-500 text-white"
                                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600"
                                  }`}
                                >
                                  For Rent
                                </button>
                                <button
                                  onClick={() => handleApplyFilters({ ...filters, listingType: "multi" })}
                                  className={`px-2 py-2 sm:py-1.5 rounded text-xs sm:text-sm touch-manipulation ${
                                    filters.listingType === "multi"
                                      ? "bg-emerald-500 text-white"
                                      : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 active:bg-neutral-600"
                                  }`}
                                >
                                  Multi-Family
                                </button>
                              </div>
                            </div>

                            {/* Price Range */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs sm:text-sm text-neutral-400 mb-1.5 block">Min Price</label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.minPrice}
                                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none touch-manipulation"
                                />
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm text-neutral-400 mb-1.5 block">Max Price</label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.maxPrice}
                                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none touch-manipulation"
                                />
                              </div>
                            </div>

                            {/* Beds/Baths */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs sm:text-sm text-neutral-400 mb-1.5 block">Min Beds</label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.beds}
                                  onChange={(e) => setFilters({ ...filters, beds: e.target.value })}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none touch-manipulation"
                                />
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm text-neutral-400 mb-1.5 block">Min Baths</label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.baths}
                                  onChange={(e) => setFilters({ ...filters, baths: e.target.value })}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none touch-manipulation"
                                />
                              </div>
                            </div>

                            {/* Square Footage */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs sm:text-sm text-neutral-400 mb-1.5 block">Min Sqft</label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.minSqft}
                                  onChange={(e) => setFilters({ ...filters, minSqft: e.target.value })}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none touch-manipulation"
                                />
                              </div>
                              <div>
                                <label className="text-xs sm:text-sm text-neutral-400 mb-1.5 block">Max Sqft</label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.maxSqft}
                                  onChange={(e) => setFilters({ ...filters, maxSqft: e.target.value })}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm text-white focus:border-emerald-500 focus:outline-none touch-manipulation"
                                />
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleApplyFilters(filters)}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white px-3 py-2.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation"
                              >
                                Apply Filters
                              </button>
                              <button
                                onClick={handleResetFilters}
                                className="px-4 py-2.5 sm:py-2 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-300 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation"
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
          </div>
        </>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
          <p className="text-neutral-400">Loading map...</p>
        </div>
      </div>
    }>
      <MLSProvider>
        <MapPageContent />
      </MLSProvider>
    </Suspense>
  );
}
