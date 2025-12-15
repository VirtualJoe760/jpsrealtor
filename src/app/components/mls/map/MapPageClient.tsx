"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Satellite, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import type { MapListing, Filters } from "@/types/types";
import type { IUnifiedListing } from "@/models/unified-listing";
import MapView, { MapViewHandles } from "@/app/components/mls/map/MapView";
import FiltersPanel from "./search/FiltersPannel";
import ActiveFilters from "./search/ActiveFilters";
import UnifiedListingBottomPanel from "@/app/components/mls/map/ListingBottomPanel";
import FavoritesPannel from "@/app/components/mls/map/FavoritesPannel";
import SwipeCompletionModal from "@/app/components/mls/map/SwipeCompletionModal";
import { useMLSContext } from "@/app/components/mls/MLSProvider";
import { useSwipeQueue } from "@/app/utils/map/useSwipeQueue";
import { useTheme } from "@/app/contexts/ThemeContext";
import useFavorites from "@/app/utils/map/useFavorites";
import {
  parseFiltersFromURL,
  serializeFiltersToURL,
  removeFilterFromURL,
  clearFiltersFromURL,
  updateMapPositionInURL,
  updateSelectedListingInURL,
  clearSelectedListingFromURL,
  parseMapPositionFromURL
} from "@/app/utils/map/url-sync";
import { boundsToKey, createBoundsFromCenter } from "@/app/utils/map/bounds";

const defaultFilterState: Filters = {
  // Listing Type (default to 'sale' for residential properties)
  listingType: "sale",

  // Price
  minPrice: "",
  maxPrice: "",

  // Beds/Baths
  beds: "",
  baths: "",

  // Square Footage
  minSqft: "",
  maxSqft: "",

  // Lot Size
  minLotSize: "",
  maxLotSize: "",

  // Year Built
  minYear: "",
  maxYear: "",

  // Property Type
  propertyType: "",
  propertySubType: "",

  // Garage
  minGarages: "",

  // HOA
  hoa: "",

  // Land Type
  landType: "",

  // Location
  city: "",
  subdivision: "",
};

export default function MapPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mapRef = useRef<MapViewHandles>(null);
  const selectedSlugRef = useRef<string | null>(null);
  const listingCache = useRef<Map<string, IUnifiedListing>>(new Map());
  const fetchingRef = useRef<Set<string>>(new Set());
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [isSidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  const [isFiltersOpen, setFiltersOpen] = useState(false);
  const [isSatelliteView, setIsSatelliteView] = useState(false);

  // Debug: Log theme state
  console.log('🎨 MapPageClient RENDER - currentTheme:', currentTheme);
  console.log('🎨 MapPageClient RENDER - isLight:', isLight);
  console.log('🎨 MapPageClient RENDER - isSatelliteView:', isSatelliteView);
  console.log('🎨 MapPageClient RENDER - Calculated mapStyle:', isSatelliteView ? 'satellite' : (isLight ? 'bright' : 'dark'));

  useEffect(() => {
    console.log('🎨 MapPageClient useEffect - Theme:', currentTheme, '| isLight:', isLight, '| Map style will be:', isSatelliteView ? 'satellite' : (isLight ? 'bright' : 'dark'));
  }, [currentTheme, isLight, isSatelliteView]);

  const [selectedFullListing, setSelectedFullListing] = useState<IUnifiedListing | null>(null);

  // Initialize filters from URL params or defaults
  const [filters, setFilters] = useState<Filters>(() => {
    if (typeof window === "undefined") return defaultFilterState;

    const params = new URLSearchParams(window.location.search);
    return parseFiltersFromURL(params, defaultFilterState);
  });

  const [isLoadingListing, setIsLoadingListing] = useState(false);
  const [dislikedListings, setDislikedListings] = useState<any[]>([]);
  const [isInSwipeSession, setIsInSwipeSession] = useState(false);

  // Use favorites hook for liked listings management
  const { favorites: likedListings, addFavorite, removeFavorite, clearFavorites } = useFavorites();

  // Use server clusters hook for cluster/count data only
  // Get markers from MLSProvider context (single source of truth)
  const { markers, totalCount, loadListings } = useMLSContext();

  // Swipe queue system
  const swipeQueue = useSwipeQueue();
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Parse initial map position from URL
  const { lat: initialLat, lng: initialLng, zoom: initialZoom } = useMemo(() => {
    return parseMapPositionFromURL(searchParams, {
      lat: 33.72,
      lng: -116.37,
      zoom: 7 // Start at zoom 7 to show all counties
    });
  }, [searchParams]);

  // Initial load - load markers (clusters/counts) instead of full listings
  useEffect(() => {
    console.log('[MapPageClient] Initial load - creating bounds from center');
    const initialBounds = createBoundsFromCenter(
      { lat: initialLat, lng: initialLng },
      initialZoom
    );
    loadListings(initialBounds, filters);
  }, [initialLat, initialLng, filters, loadListings, initialZoom]);

  // Close filters when selecting a listing
  useEffect(() => {
    if (selectedFullListing && isSidebarOpen && isFiltersOpen) {
      console.log('[MapPageClient] Listing selected - closing filters panel');
      setFiltersOpen(false);
    }
  }, [selectedFullListing, isSidebarOpen, isFiltersOpen]);

  // Fetch disliked listings from API
  useEffect(() => {
    async function fetchDislikedListings() {
      if (!swipeQueue.isReady) return;

      try {
        const response = await fetch("/api/swipes/user");
        if (!response.ok) {
          console.error("Failed to fetch swipe data");
          return;
        }

        const data = await response.json();
        const disliked = data.dislikedListings || [];

        console.log(`📋 Fetched ${disliked.length} disliked listings from API`);

        // Map to format expected by FavoritesPannel
        const dislikedData = disliked.map((item: any) => ({
          ...item.listingData,
          listingKey: item.listingKey,
          listingId: item.listingData?.listingId || item.listingKey,
          _id: item.listingData?._id || item._id,
          swipedAt: item.swipedAt,
          expiresAt: item.expiresAt,
        })).filter((item: any) => item && Object.keys(item).length > 4);

        console.log(`✅ Processed ${dislikedData.length} disliked listings with data`);
        setDislikedListings(dislikedData);
      } catch (error) {
        console.error("Error fetching disliked listings:", error);
      }
    }

    fetchDislikedListings();
  }, [swipeQueue.isReady]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (next && selectedFullListing && isFiltersOpen) setFiltersOpen(false);
      return next;
    });
  };

  const toggleFilters = () => {
    setFiltersOpen((prev) => {
      const next = !prev;
      if (next && selectedFullListing && isSidebarOpen) setSidebarOpen(false);
      return next;
    });
  };

  const mapPaddingClass = useMemo(() => {
    return isSidebarOpen ? "lg:right-[25%] lg:left-0" : "lg:left-0 lg:right-0";
  }, [isSidebarOpen]);

  const handleApplyFilters = (newFilters: Filters) => {
    console.log('[MapPageClient] Applying filters');
    setFilters(newFilters);
    setFiltersOpen(false);

    // Persist filters to URL using utility
    const params = serializeFiltersToURL(newFilters, searchParams);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleRemoveFilter = (filterKey: keyof Filters) => {
    console.log(`[MapPageClient] Removing filter: ${filterKey}`);
    setFilters((prev) => {
      const newFilters = { ...prev };

      // Reset the specific filter to its default value
      if (typeof newFilters[filterKey] === "boolean" || newFilters[filterKey] === undefined) {
        (newFilters as any)[filterKey] = undefined;
      } else {
        (newFilters as any)[filterKey] = "";
      }

      // Remove from URL using utility
      const params = removeFilterFromURL(filterKey, searchParams);
      router.replace(`?${params.toString()}`, { scroll: false });

      return newFilters;
    });
  };

  const handleClearAllFilters = () => {
    console.log('[MapPageClient] Clearing all filters');
    setFilters(defaultFilterState);

    // Clear all filter params from URL using utility
    const params = clearFiltersFromURL(searchParams);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const fetchFullListing = useCallback(async (slug: string) => {
    if (!slug) return;
    if (fetchingRef.current.has(slug)) return;

    // Check cache first
    if (listingCache.current.has(slug)) {
      const cached = listingCache.current.get(slug)!;
      if (cached.listingKey) {
        setSelectedFullListing(cached);
        setIsLoadingListing(false);
        return;
      }
      listingCache.current.delete(slug);
    }

    setIsLoadingListing(true);
    fetchingRef.current.add(slug);
    try {
      const res = await fetch(`/api/mls-listings/${slug}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.listing && json.listing.listingKey) {
        listingCache.current.set(slug, json.listing);
        setSelectedFullListing(json.listing);
      } else {
        setSelectedFullListing(null);
      }
    } catch (err) {
      console.error("❌ Error fetching full listing:", err);
      setSelectedFullListing(null);
    } finally {
      fetchingRef.current.delete(slug);
      setIsLoadingListing(false);
    }
  }, []);

  // Restore selected listing from URL on mount
  useEffect(() => {
    const selectedSlug = searchParams.get("selected");
    if (!selectedSlug || isInSwipeSession || selectedSlugRef.current === selectedSlug) return;

    selectedSlugRef.current = selectedSlug;
    fetchFullListing(selectedSlug);
  }, [searchParams, fetchFullListing, isInSwipeSession]);

  const handleListingSelect = (listing: MapListing) => {
    if (!listing.slugAddress) return;

    const slug = listing.slugAddress ?? listing.slug;

    // If selecting the same listing and we have the full listing, ignore
    if (slug === selectedSlugRef.current && selectedFullListing) {
      console.log("⏭️ Same listing already selected - ignoring click");
      return;
    }

    // Auto-close sidebar on tablets in portrait mode
    if (typeof window !== "undefined") {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTabletPortrait = width >= 768 && width < 1024 && height > width;

      if (isTabletPortrait && isSidebarOpen) {
        console.log("📱 Tablet portrait detected - closing sidebar");
        setSidebarOpen(false);
      }
    }

    console.log("📍 Selecting listing:", slug);
    setIsInSwipeSession(true);

    // Initialize swipe queue for this listing
    console.log("🎬 User clicked marker - initializing queue");
    swipeQueue.initializeQueue(listing);

    // Fetch listing data
    if (slug) {
      selectedSlugRef.current = slug;
      fetchFullListing(slug);
    }

    // Update URL using utility
    const params = updateSelectedListingInURL(
      listing.slugAddress!,
      listing.latitude && listing.longitude
        ? { latitude: listing.latitude, longitude: listing.longitude }
        : undefined,
      searchParams
    );

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseListing = () => {
    console.log('[MapPageClient] Closing listing and resetting session');
    swipeQueue.flushSwipes();
    setSelectedFullListing(null);
    selectedSlugRef.current = null;
    setIsInSwipeSession(false);
    swipeQueue.reset();
    setShowCompletionModal(false);

    // Clear selected listing from URL using utility
    const params = clearSelectedListingFromURL(searchParams);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const advanceToNextListing = async () => {
    console.log("\n🔍 === ADVANCE TO NEXT LISTING ===");
    console.log("🔍 Current listing:", selectedFullListing?.unparsedAddress);
    console.log("🔍 Current listingKey:", selectedFullListing?.listingKey);
    console.log("🔍 Queue length:", swipeQueue.queueLength);
    console.log("🔍 Is exhausted:", swipeQueue.isExhausted);

    const { listing: nextListing, reason } = swipeQueue.getNext();

    console.log("🔍 getNext() returned:", nextListing ? `${nextListing.slug} (${reason})` : "null");

    if (nextListing) {
      console.log(`🎯 Next listing found${reason ? ` (${reason})` : ''}`);
      console.log(`🎯 Next listingKey: ${nextListing.listingKey}`);
      console.log(`🎯 Next slug: ${nextListing.slugAddress ?? nextListing.slug}`);

      const nextSlug = nextListing.slugAddress ?? nextListing.slug;
      if (!nextSlug) {
        console.warn("⚠️ Next listing has no slug - closing panel");
        handleCloseListing();
        return;
      }

      selectedSlugRef.current = nextSlug;

      // Check cache for instant loading
      if (listingCache.current.has(nextSlug)) {
        const cached = listingCache.current.get(nextSlug)!;
        if (cached.listingKey) {
          console.log(`⚡ Using cached data for ${nextSlug}`);
          setSelectedFullListing(cached);
          setIsLoadingListing(false);
        }
      } else {
        console.log(`🔄 Fetching full listing data for ${nextSlug}`);
        fetchFullListing(nextSlug);
      }

      // Update URL using utility
      const params = updateSelectedListingInURL(
        nextSlug,
        nextListing.latitude && nextListing.longitude
          ? { latitude: nextListing.latitude, longitude: nextListing.longitude }
          : undefined,
        searchParams
      );
      router.replace(`?${params.toString()}`, { scroll: false });

      return;
    }

    // Queue exhausted
    console.log("⚠️ No next listing available");
    if (swipeQueue.isExhausted) {
      console.log("🏁 Queue marked as exhausted - showing completion modal");
      handleCloseListing();
      setShowCompletionModal(true);
      return;
    }

    console.log("⏳ Queue loading or in unexpected state - closing panel");
    handleCloseListing();
  };

  // Use removeFavorite from useFavorites hook
  const handleRemoveFavorite = removeFavorite;

  // Use clearFavorites from useFavorites hook
  const handleClearFavorites = clearFavorites;

  const handleRemoveDislike = (listing: MapListing) => {
    console.log("Remove dislike:", listing.listingKey);
  };

  const handleClearDislikes = () => {
    console.log("Clear all dislikes");
  };

  const dislikedListingsData = dislikedListings;

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsRef = useRef<string | null>(null);

  const handleBoundsChange = (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  }) => {
    // Use bounds utility for comparison
    const key = boundsToKey(bounds);
    if (key === lastBoundsRef.current) {
      console.log('[MapPageClient] Bounds unchanged - skipping load');
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      console.log('[MapPageClient] Bounds changed - loading listings');
      lastBoundsRef.current = key;
      loadListings(bounds, filters);

      // Update URL with current map position using utility
      const params = updateMapPositionInURL(bounds, searchParams);
      router.replace(`?${params.toString()}`, { scroll: false });
    }, 300);
  };

  return (
    <>
      <style jsx global>{`
        .map-container {
          position: fixed;
          top: 128px;
          bottom: 0;
          left: 0;
          right: 0;
          overflow: hidden;
        }

        .maplibregl-map {
          width: 100%;
          height: 100%;
        }
      `}</style>

      <ActiveFilters
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
        isFiltersOpen={isFiltersOpen}
      />

      {isFiltersOpen && (
        <FiltersPanel
          defaultFilters={filters}
          isOpen={isFiltersOpen}
          onClose={() => setFiltersOpen(false)}
          onApply={handleApplyFilters}
        />
      )}

      <div className="map-container flex font-[Raleway]">
        <div className={`absolute top-0 bottom-0 w-full h-full ${mapPaddingClass} z-10`}>
          <MapView
            ref={mapRef}
            markers={markers}
            listings={[]}
            centerLat={initialLat}
            centerLng={initialLng}
            zoom={initialZoom}
            onSelectListing={handleListingSelect}
            selectedListing={null}
            onBoundsChange={handleBoundsChange}
            panelOpen={Boolean(selectedFullListing)}
            mapStyle={isSatelliteView ? 'satellite' : (isLight ? 'bright' : 'dark')}
          />
        </div>

        <FavoritesPannel
          visibleListings={[]}
          favorites={likedListings}
          dislikedListings={dislikedListingsData}
          isSidebarOpen={isSidebarOpen}
          selectedListing={null}
          onClose={() => setSidebarOpen(false)}
          onSelectListing={handleListingSelect}
          onRemoveFavorite={handleRemoveFavorite}
          onClearFavorites={handleClearFavorites}
          onRemoveDislike={handleRemoveDislike}
          onClearDislikes={handleClearDislikes}
        />
      </div>

      {selectedFullListing && (
        <UnifiedListingBottomPanel
          key={selectedFullListing.listingKey}
          listing={selectedFullListing as unknown as MapListing}
          fullListing={selectedFullListing}
          onClose={handleCloseListing}
          onViewFullListing={() => {
            swipeQueue.flushSwipes();
          }}
          isDisliked={swipeQueue.isExcluded(selectedFullListing.listingKey)}
          dislikedTimestamp={null}
          onRemoveDislike={() => {}}
          onSwipeLeft={() => {
            if (!swipeQueue.isReady) {
              console.warn("⚠️ Swipe system not ready");
              return;
            }

            swipeQueue.markAsDisliked(selectedFullListing.listingKey, selectedFullListing);
            console.log(`👎 Disliked: ${selectedFullListing.listingKey}`);

            // Add to disliked state
            if (!dislikedListings.some(d => d.listingKey === selectedFullListing.listingKey)) {
              setDislikedListings(prev => [
                ...prev,
                {
                  ...selectedFullListing,
                  swipedAt: new Date().toISOString(),
                  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                } as any
              ]);
            }

            // Remove from favorites using hook
            const currentSlug = selectedFullListing.slugAddress ?? selectedFullListing.slug;
            if (likedListings.some(fav => (fav.slugAddress ?? fav.slug) === currentSlug)) {
              removeFavorite(selectedFullListing as unknown as MapListing);
            }

            advanceToNextListing();
          }}
          onSwipeRight={() => {
            if (!swipeQueue.isReady) {
              console.warn("⚠️ Swipe system not ready");
              return;
            }

            swipeQueue.markAsLiked(selectedFullListing.listingKey, selectedFullListing);
            console.log(`❤️ Liked: ${selectedFullListing.listingKey}`);

            // Add to liked state using hook
            const currentSlug = selectedFullListing.slugAddress ?? selectedFullListing.slug;
            if (!likedListings.some(fav => (fav.slugAddress ?? fav.slug) === currentSlug)) {
              addFavorite(selectedFullListing as unknown as MapListing);
            }

            advanceToNextListing();
          }}
          isSidebarOpen={isSidebarOpen}
        />
      )}

      <SwipeCompletionModal
        isOpen={showCompletionModal}
        favoritesCount={likedListings.length}
        onClose={() => setShowCompletionModal(false)}
      />

      {/* Filters Button */}
      <button
        onClick={toggleFilters}
        className={`fixed top-20 right-4 z-40 w-14 h-14 rounded-2xl backdrop-blur-xl border flex items-center justify-center active:scale-95 transition-all shadow-2xl ${
          isFiltersOpen
            ? (isLight
              ? 'bg-blue-500 border-blue-600 text-white'
              : 'bg-emerald-500 border-emerald-400 text-black')
            : (isLight
              ? 'bg-white/90 border-gray-300 text-blue-600 hover:bg-blue-50 shadow-gray-300/20'
              : 'bg-gray-800/90 border-gray-600 text-emerald-400 hover:bg-gray-700/90 shadow-emerald-500/20')
        }`}
        aria-label={isFiltersOpen ? "Close Filters" : "Open Filters"}
        title="Filters"
      >
        <SlidersHorizontal className="w-6 h-6" strokeWidth={2.5} />
      </button>

      {/* Mobile Skin Toggle */}
      <button
        onClick={() => setIsSatelliteView(prev => !prev)}
        className={`md:hidden fixed bottom-24 left-4 z-40 w-14 h-14 rounded-2xl backdrop-blur-xl border flex items-center justify-center active:scale-95 transition-all shadow-2xl ${
          isLight
            ? 'bg-gradient-to-br from-blue-400/30 to-emerald-400/30 border-blue-500/40 hover:from-blue-500/40 hover:to-emerald-500/40 hover:border-blue-600/50 shadow-blue-400/20'
            : 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 hover:from-emerald-500/30 hover:to-cyan-500/30 hover:border-emerald-500/50 shadow-emerald-500/20'
        }`}
        aria-label={isSatelliteView ? "Switch to Map View" : "Switch to Satellite View"}
        title={isSatelliteView ? "Map View" : "Satellite View"}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {isSatelliteView ? (
          <MapIcon className={`w-7 h-7 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} strokeWidth={2.5} />
        ) : (
          <Satellite className={`w-7 h-7 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} strokeWidth={2.5} />
        )}
      </button>
    </>
  );
}
