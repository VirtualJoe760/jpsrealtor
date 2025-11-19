"use client";

import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MLSProvider } from "@/app/components/mls/MLSProvider";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
import dynamicImport from "next/dynamic";
import { useEffect, useState, useCallback } from "react";
import { MapPin, Loader2, Heart, List, Map as MapIcon, Satellite, Globe } from "lucide-react";
import type { MapListing } from "@/types/types";

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

  useEffect(() => {
    setMounted(true);
    console.log("🗺️ Map page mounted, preloaded:", isPreloaded, "listings:", visibleListings.length);

    // Load listings if not preloaded yet
    if (!isPreloaded && !isLoading) {
      console.log("🚀 Loading MLS listings for map...");
      loadListings(DEFAULT_BOUNDS, filters);
    }

    // Force map to resize after mount
    const timer = setTimeout(() => {
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
                className="absolute top-4 right-4 z-40 bg-black/80 backdrop-blur-lg px-4 py-2 rounded-full border border-neutral-700 hover:border-emerald-500 transition-all flex items-center gap-2"
              >
                <Heart className={`w-5 h-5 ${likedListings.length > 0 ? 'text-red-500 fill-red-500' : 'text-neutral-300'}`} />
                <span className="text-sm text-white font-medium">{likedListings.length}</span>
                <List className="w-4 h-4 text-neutral-300" />
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

          {/* Map Style Toggle - Bottom Left */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => {
              const styles: Array<'toner' | 'dark' | 'satellite' | 'bright'> = ['toner', 'dark', 'satellite', 'bright'];
              const currentIndex = styles.indexOf(mapStyle || 'toner');
              const nextIndex = (currentIndex + 1) % styles.length;
              const nextStyle = styles[nextIndex] as 'toner' | 'dark' | 'satellite' | 'bright';
              if (setMapStyle) {
                setMapStyle(nextStyle);
              }
            }}
            className="absolute bottom-4 left-4 z-40 bg-black/80 backdrop-blur-lg px-4 py-2 rounded-lg border border-neutral-700 hover:border-emerald-500 transition-all flex items-center gap-2 group"
            title={
              mapStyle === 'toner' ? "Switch to Dark Matter" :
              mapStyle === 'dark' ? "Switch to Satellite" :
              mapStyle === 'satellite' ? "Switch to Bright Mode" :
              "Switch to Black & White"
            }
          >
            {mapStyle === 'toner' ? (
              <>
                <MapIcon className="w-5 h-5 text-neutral-300 group-hover:text-emerald-400 transition-colors" />
                <span className="text-sm text-white font-medium">Black & White</span>
              </>
            ) : mapStyle === 'dark' ? (
              <>
                <MapIcon className="w-5 h-5 text-neutral-300 group-hover:text-emerald-400 transition-colors" />
                <span className="text-sm text-white font-medium">Dark Matter</span>
              </>
            ) : mapStyle === 'satellite' ? (
              <>
                <Satellite className="w-5 h-5 text-neutral-300 group-hover:text-emerald-400 transition-colors" />
                <span className="text-sm text-white font-medium">Satellite</span>
              </>
            ) : (
              <>
                <Globe className="w-5 h-5 text-neutral-300 group-hover:text-emerald-400 transition-colors" />
                <span className="text-sm text-white font-medium">Bright</span>
              </>
            )}
          </motion.button>
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
