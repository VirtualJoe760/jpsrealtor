"use client";

import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
import dynamicImport from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Loader2, Heart, List, Map as MapIcon, Satellite, Globe, SlidersHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import type { MapListing, Filters } from "@/types/types";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import LoadingGlobe from "@/app/components/LoadingGlobe";

// Dynamic imports for map components (client-side only)
const MapView = dynamicImport(
  () => import("@/app/components/mls/map/MapView"),
  { ssr: false }
);

const ListingBottomPanel = dynamicImport(
  () => import("@/app/components/mls/map/ListingBottomPanel"),
  { ssr: false }
);

const FavoritesPannel = dynamicImport(
  () => import("@/app/components/mls/map/FavoritesPannel"),
  { ssr: false }
);

// Default bounds - show entire California state with all regions visible
// Will be overridden by URL params when coming from chat/search
const DEFAULT_BOUNDS = {
  north: 42.0,
  south: 32.5,
  east: -114.0,
  west: -124.5,
  zoom: 4.8,
};

function MapPageContent() {
  const {
    visibleListings,
    markers,
    selectedListing,
    selectedFullListing,
    isLoading,
    isLoadingViewport,
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
    removeDislike,
    clearDislikes,
    swipeQueue,
    totalCount,
  } = useMLSContext();

  const { currentTheme } = useTheme();
  const { bgPrimary, textPrimary, cardBg } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [favoritesPannelOpen, setFavoritesPannelOpen] = useState(false);
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Detect mobile for initial zoom
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use mobile-specific zoom
  const [mapBounds, setMapBounds] = useState({
    ...DEFAULT_BOUNDS,
    zoom: isMobile ? 4 : 4.8
  });

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
        setMapBounds(parsedBounds); // Store the parsed bounds for map centering
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
    async (bounds: {north: number, south: number, east: number, west: number, zoom: number}) => {
      console.log("🗺️ Map bounds changed:", bounds);
      // Load new listings with current filters (merge mode = true to keep existing listings)
      // The useListings hook handles caching and deduplication internally
      await loadListings(bounds, filters, true);

      // Update URL with current map position for browser history and sharing
      const params = new URLSearchParams(searchParams.toString());
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLng = (bounds.east + bounds.west) / 2;

      params.set("lat", centerLat.toFixed(6));
      params.set("lng", centerLng.toFixed(6));
      params.set("zoom", bounds.zoom.toString());

      console.log("🔗 Updating URL to:", `/map?${params.toString()}`);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [filters, loadListings, router, searchParams]
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

  // Swipe to close controls panel on mobile
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;
    const isDownSwipe = distance < -minSwipeDistance;

    // Swipe down to close
    if (isDownSwipe) {
      setControlsExpanded(false);
    }
  };

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
      <div className={`h-screen w-screen flex items-center justify-center ${bgPrimary}`}>
        <LoadingGlobe message="Loading map..." size={140} />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-black" data-page="map">
      {isLoading && !isPreloaded && markers.length === 0 ? (
        // Initial loading state - only show on first load before any data
        <div className={`h-full w-full flex items-center justify-center ${bgPrimary}`}>
          <LoadingGlobe message="Loading listings..." size={140} />
        </div>
      ) : (
        // Always show map once initial data loads - never show "no properties" fallback
        // The map can handle empty states gracefully without blocking the entire UI
        <>
          <MapView
            listings={visibleListings}
            markers={markers}
            centerLat={(mapBounds.north + mapBounds.south) / 2}
            centerLng={(mapBounds.east + mapBounds.west) / 2}
            zoom={mapBounds.zoom || 5.5}
            onSelectListing={handleSelectListing}
            selectedListing={selectedListing}
            onBoundsChange={handleBoundsChange}
            panelOpen={!!selectedListing}
            mapStyle={mapStyle}
          />

          {/* Favorites Toggle Button - Top Right, aligned with hamburger menu */}
          <AnimatePresence>
            {!favoritesPannelOpen && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={() => setFavoritesPannelOpen(true)}
                className={`fixed top-4 right-4 z-[60] rounded-xl flex items-center justify-center transition-all active:scale-95 touch-manipulation md:w-auto md:px-4 md:py-2 md:gap-2 w-16 h-16 md:h-auto md:backdrop-blur-xl md:shadow-lg ${
                  isLight
                    ? 'md:bg-white/90 md:hover:bg-white'
                    : 'md:bg-black/85 md:hover:bg-black/90'
                }`}
              >
                <Heart className={`w-6 h-6 ${likedListings.length > 0 ? 'text-red-500 fill-red-500' : isLight ? 'text-gray-600' : 'text-emerald-400'}`} />
                <span className={`hidden md:inline text-base font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>{likedListings.length}</span>
                <List className={`hidden md:inline w-5 h-5 ${isLight ? 'text-gray-600' : 'text-emerald-400'}`} />
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
            onRemoveDislike={removeDislike}
            onClearDislikes={clearDislikes}
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
            <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 backdrop-blur-lg px-4 py-2 rounded-full ${
              isLight
                ? 'bg-white/95 border border-gray-300'
                : 'bg-black/80 border border-neutral-700'
            }`}>
              <div className="flex items-center gap-2">
                <Loader2 className={`w-4 h-4 animate-spin ${
                  isLight ? 'text-blue-500' : 'text-emerald-500'
                }`} />
                <span className={`text-sm ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>
                  Loading details...
                </span>
              </div>
            </div>
          )}

          {/* Map Controls - Mobile: Below info panel with swipeable tab, Desktop: Bottom left */}
          <div className="fixed top-[88px] left-0 right-0 sm:absolute sm:top-auto sm:bottom-4 sm:left-4 sm:right-auto z-40 sm:w-80 pointer-events-none">
            {/* Always show the toggle button at the top */}
            {!controlsExpanded && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onClick={() => setControlsExpanded(true)}
                className={`mx-auto sm:mx-0 sm:w-full sm:backdrop-blur-xl border-b border-x sm:border rounded-b-xl sm:rounded-lg px-4 py-2.5 sm:py-2.5 transition-all flex items-center justify-center gap-2 touch-manipulation shadow-lg pointer-events-auto ${
                  isLight
                    ? 'bg-white/95 border-gray-300 hover:bg-blue-50 hover:border-blue-500 active:bg-blue-100 sm:bg-white/95'
                    : 'bg-black/90 border-neutral-800 hover:bg-neutral-900 hover:border-emerald-500 active:bg-neutral-800 sm:bg-black/95'
                }`}
                style={{ width: 'fit-content' }}
              >
                {mapStyle === 'dark' ? (
                  <MapIcon className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                ) : mapStyle === 'bright' ? (
                  <Globe className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                ) : mapStyle === 'satellite' ? (
                  <Satellite className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                ) : (
                  <MapIcon className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
                )}
                <span className={`text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Map Controls</span>
                <ChevronDown className={`w-4 h-4 ml-1 sm:ml-auto ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
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
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className={`backdrop-blur-xl sm:rounded-lg border-b sm:border overflow-hidden max-h-[80vh] overflow-y-auto shadow-2xl pointer-events-auto ${
                  isLight
                    ? 'bg-white/95 border-gray-300'
                    : 'bg-black/95 border-neutral-800'
                }`}
              >
                {/* Drag Handle & Close Button - Mobile Only */}
                <div
                  className={`sm:hidden pt-2 pb-1 flex justify-between items-center px-4 ${
                    isLight ? 'bg-white/95' : 'bg-black/95'
                  }`}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <div className="w-8"></div>
                  <div className={`w-12 h-1 rounded-full ${isLight ? 'bg-gray-400' : 'bg-neutral-600'}`}></div>
                  <button
                    onClick={() => setControlsExpanded(false)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                      isLight ? 'hover:bg-gray-200 active:bg-gray-300' : 'hover:bg-neutral-800 active:bg-neutral-700'
                    }`}
                  >
                    <ChevronUp className={`w-5 h-5 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`} />
                  </button>
                </div>

                  {/* Map Style Options */}
                  <div className={`p-3 sm:p-4 border-b ${isLight ? 'border-gray-200' : 'border-neutral-700'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs sm:text-sm font-medium ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>MAP STYLE</span>
                      {/* Desktop-only collapse button */}
                      <button
                        onClick={() => setControlsExpanded(false)}
                        className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                          isLight
                            ? 'hover:bg-gray-200 text-gray-600'
                            : 'hover:bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                        <span className="text-xs">Collapse</span>
                      </button>
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

                            {/* Square Footage */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                                  Min Sqft
                                </label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.minSqft}
                                  onChange={(e) => setFilters({ ...filters, minSqft: e.target.value })}
                                  className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                    isLight
                                      ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                      : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                                  }`}
                                />
                              </div>
                              <div>
                                <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                                  Max Sqft
                                </label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.maxSqft}
                                  onChange={(e) => setFilters({ ...filters, maxSqft: e.target.value })}
                                  className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                    isLight
                                      ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                      : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Lot Size */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                                  Min Lot (sqft)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.minLotSize}
                                  onChange={(e) => setFilters({ ...filters, minLotSize: e.target.value })}
                                  className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                    isLight
                                      ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                      : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                                  }`}
                                />
                              </div>
                              <div>
                                <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                                  Max Lot (sqft)
                                </label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.maxLotSize}
                                  onChange={(e) => setFilters({ ...filters, maxLotSize: e.target.value })}
                                  className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                    isLight
                                      ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                      : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Year Built */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                                  Built After
                                </label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.minYear}
                                  onChange={(e) => setFilters({ ...filters, minYear: e.target.value })}
                                  className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                    isLight
                                      ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                      : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                                  }`}
                                />
                              </div>
                              <div>
                                <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                                  Built Before
                                </label>
                                <input
                                  type="text"
                                  placeholder="Any"
                                  value={filters.maxYear}
                                  onChange={(e) => setFilters({ ...filters, maxYear: e.target.value })}
                                  className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                    isLight
                                      ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                      : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Amenities Section */}
                            <div className={`border-t pt-3 ${isLight ? 'border-gray-200' : 'border-neutral-700'}`}>
                              <label className={`text-xs sm:text-sm mb-2 block font-medium ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                                Amenities
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <label className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                  isLight ? 'hover:bg-gray-100' : 'hover:bg-neutral-800'
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={filters.poolYn === true}
                                    onChange={(e) => setFilters({ ...filters, poolYn: e.target.checked ? true : undefined })}
                                    className="w-4 h-4"
                                  />
                                  <span className={`text-xs sm:text-sm ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>Pool</span>
                                </label>
                                <label className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                  isLight ? 'hover:bg-gray-100' : 'hover:bg-neutral-800'
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={filters.spaYn === true}
                                    onChange={(e) => setFilters({ ...filters, spaYn: e.target.checked ? true : undefined })}
                                    className="w-4 h-4"
                                  />
                                  <span className={`text-xs sm:text-sm ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>Spa</span>
                                </label>
                                <label className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                  isLight ? 'hover:bg-gray-100' : 'hover:bg-neutral-800'
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={filters.viewYn === true}
                                    onChange={(e) => setFilters({ ...filters, viewYn: e.target.checked ? true : undefined })}
                                    className="w-4 h-4"
                                  />
                                  <span className={`text-xs sm:text-sm ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>View</span>
                                </label>
                                <label className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                  isLight ? 'hover:bg-gray-100' : 'hover:bg-neutral-800'
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={filters.gatedCommunity === true}
                                    onChange={(e) => setFilters({ ...filters, gatedCommunity: e.target.checked ? true : undefined })}
                                    className="w-4 h-4"
                                  />
                                  <span className={`text-xs sm:text-sm ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>Gated</span>
                                </label>
                                <label className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                  isLight ? 'hover:bg-gray-100' : 'hover:bg-neutral-800'
                                }`}>
                                  <input
                                    type="checkbox"
                                    checked={filters.seniorCommunity === true}
                                    onChange={(e) => setFilters({ ...filters, seniorCommunity: e.target.checked ? true : undefined })}
                                    className="w-4 h-4"
                                  />
                                  <span className={`text-xs sm:text-sm ${isLight ? 'text-gray-700' : 'text-neutral-300'}`}>55+</span>
                                </label>
                              </div>
                            </div>

                            {/* Garage */}
                            <div>
                              <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                                Min Garage Spaces
                              </label>
                              <select
                                value={filters.minGarages}
                                onChange={(e) => setFilters({ ...filters, minGarages: e.target.value })}
                                className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                  isLight
                                    ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                    : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                                }`}
                              >
                                <option value="">Any</option>
                                <option value="1">1+</option>
                                <option value="2">2+</option>
                                <option value="3">3+</option>
                                <option value="4">4+</option>
                              </select>
                            </div>

                            {/* HOA */}
                            <div>
                              <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                                Max HOA Fee ($/mo)
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

                            {/* Land Type */}
                            <div>
                              <label className={`text-xs sm:text-sm mb-1.5 block ${isLight ? 'text-gray-700' : 'text-neutral-400'}`}>
                                Land Type
                              </label>
                              <select
                                value={filters.landType}
                                onChange={(e) => setFilters({ ...filters, landType: e.target.value })}
                                className={`w-full border rounded px-3 py-2 sm:py-1.5 text-xs sm:text-sm focus:outline-none touch-manipulation ${
                                  isLight
                                    ? 'bg-gray-50 border-gray-300 text-gray-900 focus:border-blue-500'
                                    : 'bg-neutral-800 border-neutral-700 text-white focus:border-emerald-500'
                                }`}
                              >
                                <option value="">Any</option>
                                <option value="Fee Simple">Fee Simple (Owned)</option>
                                <option value="Leasehold">Leasehold (Leased)</option>
                              </select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 pt-2">
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
                              {/* Close Panel Button - Mobile Only */}
                              <button
                                onClick={() => setControlsExpanded(false)}
                                className={`sm:hidden w-full px-3 py-2.5 rounded-md text-xs font-medium transition-colors touch-manipulation ${
                                  isLight
                                    ? 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white'
                                    : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                                }`}
                              >
                                Close Panel
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
