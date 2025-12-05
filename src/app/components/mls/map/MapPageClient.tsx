"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { Satellite, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import type { MapListing, Filters } from "@/types/types";
import type { IListing } from "@/models/listings";
import MapView, { MapViewHandles } from "@/app/components/mls/map/MapView";
import FiltersPanel from "./search/FiltersPannel";
import ActiveFilters from "./search/ActiveFilters";
import ListingBottomPanel from "@/app/components/mls/map/ListingBottomPanel";
import FavoritesPannel from "@/app/components/mls/map/FavoritesPannel";
import SwipeCompletionModal from "@/app/components/mls/map/SwipeCompletionModal";
import { useServerClusters } from "@/app/utils/map/useServerClusters";
import { useSwipeQueue } from "@/app/utils/map/useSwipeQueue";
import { useTheme } from "@/app/contexts/ThemeContext";

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
  const listingCache = useRef<Map<string, IListing>>(new Map());
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

  const [selectedFullListing, setSelectedFullListing] = useState<IListing | null>(null);

  // Initialize filters from URL params or defaults
  const [filters, setFilters] = useState<Filters>(() => {
    if (typeof window === "undefined") return defaultFilterState;

    const params = new URLSearchParams(window.location.search);
    const urlFilters: Partial<Filters> = {};

    // Restore filter values from URL
    if (params.get("listingType")) urlFilters.listingType = params.get("listingType")!;
    if (params.get("minPrice")) urlFilters.minPrice = params.get("minPrice")!;
    if (params.get("maxPrice")) urlFilters.maxPrice = params.get("maxPrice")!;
    if (params.get("beds")) urlFilters.beds = params.get("beds")!;
    if (params.get("baths")) urlFilters.baths = params.get("baths")!;
    if (params.get("minSqft")) urlFilters.minSqft = params.get("minSqft")!;
    if (params.get("maxSqft")) urlFilters.maxSqft = params.get("maxSqft")!;
    if (params.get("minLotSize")) urlFilters.minLotSize = params.get("minLotSize")!;
    if (params.get("maxLotSize")) urlFilters.maxLotSize = params.get("maxLotSize")!;
    if (params.get("minYear")) urlFilters.minYear = params.get("minYear")!;
    if (params.get("maxYear")) urlFilters.maxYear = params.get("maxYear")!;
    if (params.get("propertyType")) urlFilters.propertyType = params.get("propertyType")!;
    if (params.get("propertySubType")) urlFilters.propertySubType = params.get("propertySubType")!;
    if (params.get("minGarages")) urlFilters.minGarages = params.get("minGarages")!;
    if (params.get("hoa")) urlFilters.hoa = params.get("hoa")!;
    if (params.get("landType")) urlFilters.landType = params.get("landType")!;
    if (params.get("city")) urlFilters.city = params.get("city")!;
    if (params.get("subdivision")) urlFilters.subdivision = params.get("subdivision")!;

    // Boolean filters
    if (params.get("poolYn") === "true") urlFilters.poolYn = true;
    if (params.get("spaYn") === "true") urlFilters.spaYn = true;
    if (params.get("viewYn") === "true") urlFilters.viewYn = true;
    if (params.get("garageYn") === "true") urlFilters.garageYn = true;
    if (params.get("associationYN") === "true") urlFilters.associationYN = true;
    if (params.get("gatedCommunity") === "true") urlFilters.gatedCommunity = true;
    if (params.get("seniorCommunity") === "true") urlFilters.seniorCommunity = true;

    return Object.keys(urlFilters).length > 0
      ? { ...defaultFilterState, ...urlFilters }
      : defaultFilterState;
  });

  const [isLoadingListing, setIsLoadingListing] = useState(false);
  const [likedListings, setLikedListings] = useState<MapListing[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("likedListings");
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [dislikedListings, setDislikedListings] = useState<any[]>([]);
  const [isInSwipeSession, setIsInSwipeSession] = useState(false);

  // Use server clusters hook for cluster/count data only
  const { markers, totalCount, isLoading, loadMarkers, clearMarkers } = useServerClusters();

  // Swipe queue system
  const swipeQueue = useSwipeQueue();
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const initialLat = useMemo(() => {
    const val = parseFloat(searchParams.get("lat") || "");
    return !isNaN(val) ? val : 33.72;
  }, [searchParams]);

  const initialLng = useMemo(() => {
    const val = parseFloat(searchParams.get("lng") || "");
    return !isNaN(val) ? val : -116.37;
  }, [searchParams]);

  const initialZoom = useMemo(() => {
    const val = parseFloat(searchParams.get("zoom") || "");
    return !isNaN(val) ? val : 7; // Start at zoom 7 to show all counties
  }, [searchParams]);

  // Initial load - load markers (clusters/counts) instead of full listings
  useEffect(() => {
    const initialBounds = {
      north: initialLat + 0.1,
      south: initialLat - 0.1,
      east: initialLng + 0.1,
      west: initialLng - 0.1,
      zoom: initialZoom,
    };
    loadMarkers(initialBounds, filters);
  }, [initialLat, initialLng, filters, loadMarkers, initialZoom]);

  // Close filters when selecting a listing
  useEffect(() => {
    if (selectedFullListing && isSidebarOpen && isFiltersOpen) {
      setFiltersOpen(false);
    }
  }, [selectedFullListing, isSidebarOpen, isFiltersOpen]);

  // Save liked listings
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("likedListings", JSON.stringify(likedListings));
      } catch (e) {
        console.error("❌ Failed to save favorites:", e);
      }
    }
    Cookies.set("favorites", JSON.stringify(likedListings), { expires: 7 });
  }, [likedListings]);

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
    setFilters(newFilters);
    setFiltersOpen(false);

    // Persist filters to URL
    const params = new URLSearchParams(searchParams.toString());

    // Add/update filter params
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === true || (value && value !== "")) {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleRemoveFilter = (filterKey: keyof Filters) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      // Reset the specific filter to its default value
      if (typeof newFilters[filterKey] === "boolean" || newFilters[filterKey] === undefined) {
        (newFilters as any)[filterKey] = undefined;
      } else {
        (newFilters as any)[filterKey] = "";
      }

      // Remove from URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete(filterKey);
      router.replace(`?${params.toString()}`, { scroll: false });

      return newFilters;
    });
  };

  const handleClearAllFilters = () => {
    setFilters(defaultFilterState);

    // Clear all filter params from URL (keep map position and selected listing)
    const params = new URLSearchParams(searchParams.toString());
    const keysToKeep = ["lat", "lng", "zoom", "selected"];

    // Remove all filter keys
    Array.from(params.keys()).forEach(key => {
      if (!keysToKeep.includes(key)) {
        params.delete(key);
      }
    });

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

    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", listing.slugAddress!);
    if (listing.latitude && listing.longitude) {
      params.set("lat", listing.latitude.toFixed(6));
      params.set("lng", listing.longitude.toFixed(6));
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseListing = () => {
    swipeQueue.flushSwipes();
    setSelectedFullListing(null);
    selectedSlugRef.current = null;
    setIsInSwipeSession(false);
    swipeQueue.reset();
    setShowCompletionModal(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const advanceToNextListing = async () => {
    console.log("🔍 === ADVANCE TO NEXT LISTING ===");
    console.log("🔍 Current:", selectedFullListing?.unparsedAddress);

    const { listing: nextListing, reason } = swipeQueue.getNext();

    if (nextListing) {
      console.log(`🎯 Next listing${reason ? ` (${reason})` : ''}`);

      const nextSlug = nextListing.slugAddress ?? nextListing.slug;
      if (!nextSlug) {
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
        fetchFullListing(nextSlug);
      }

      // Update URL
      const params = new URLSearchParams(searchParams.toString());
      params.set("selected", nextSlug);
      if (nextListing.latitude && nextListing.longitude) {
        params.set("lat", nextListing.latitude.toFixed(6));
        params.set("lng", nextListing.longitude.toFixed(6));
      }
      router.replace(`?${params.toString()}`, { scroll: false });

      return;
    }

    // Queue exhausted
    if (swipeQueue.isExhausted) {
      console.log("🏁 Queue exhausted");
      handleCloseListing();
      setShowCompletionModal(true);
      return;
    }

    console.log("⏳ Queue loading...");
    handleCloseListing();
  };

  const handleRemoveFavorite = (listing: MapListing) => {
    const slug = listing.slugAddress ?? listing.slug;
    setLikedListings((prev) =>
      prev.filter((fav) => (fav.slugAddress ?? fav.slug) !== slug)
    );
  };

  const handleClearFavorites = () => {
    setLikedListings([]);
  };

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
    const key = `${bounds.north.toFixed(6)}-${bounds.south.toFixed(
      6
    )}-${bounds.east.toFixed(6)}-${bounds.west.toFixed(6)}-${bounds.zoom.toFixed(
      2
    )}`;
    if (key === lastBoundsRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastBoundsRef.current = key;
      loadMarkers(bounds, filters);

      // Update URL with current map position for browser history and sharing
      const params = new URLSearchParams(searchParams.toString());
      const centerLat = (bounds.north + bounds.south) / 2;
      const centerLng = (bounds.east + bounds.west) / 2;

      params.set('lat', centerLat.toFixed(6));
      params.set('lng', centerLng.toFixed(6));
      params.set('zoom', bounds.zoom.toString());

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
        <ListingBottomPanel
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

            // Remove from favorites
            const currentSlug = selectedFullListing.slugAddress ?? selectedFullListing.slug;
            if (likedListings.some(fav => (fav.slugAddress ?? fav.slug) === currentSlug)) {
              setLikedListings(prev =>
                prev.filter(fav => (fav.slugAddress ?? fav.slug) !== currentSlug)
              );
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

            // Add to liked state
            const currentSlug = selectedFullListing.slugAddress ?? selectedFullListing.slug;
            if (!likedListings.some(fav => (fav.slugAddress ?? fav.slug) === currentSlug)) {
              setLikedListings(prev => [...prev, selectedFullListing as unknown as MapListing]);
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
