"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import type { MapListing, Filters } from "@/types/types";
import type { IListing } from "@/models/listings";
import MapView, { MapViewHandles } from "@/app/components/mls/map/MapView";
import MapSearchBar from "./search/MapSearchBar";
import FiltersPanel from "./search/FiltersPannel";
import ActiveFilters from "./search/ActiveFilters";
import ListingBottomPanel from "@/app/components/mls/map/ListingBottomPanel";
import FavoritesPannel from "@/app/components/mls/map/FavoritesPannel";
import DislikedResetDialog from "@/app/components/mls/map/DislikedResetDialog";
import { useListings } from "@/app/utils/map/useListings";
import { useSwipeHistory } from "@/app/utils/map/useSwipeHistory";
import { useSmartSwipeQueue } from "@/app/utils/map/useSmartSwipeQueue";

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

  const [isSidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  const [isFiltersOpen, setFiltersOpen] = useState(false);
  const [isSatelliteView, setIsSatelliteView] = useState(false); // 🛰️ Satellite toggle
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);
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
  const [selectionLocked, setSelectionLocked] = useState(false); // 🔒
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

  const { allListings, visibleListings, loadListings } = useListings();

  // Swipe history and smart queue
  const swipeHistory = useSwipeHistory();
  const [dislikedListings, setDislikedListings] = useState<string[]>(swipeHistory.getDislikedKeys());

  // Update disliked listings when they change
  useEffect(() => {
    setDislikedListings(swipeHistory.getDislikedKeys());
  }, [swipeHistory.getDislikedKeys().length]);

  // Get exclude keys - swipeQueue will use a ref internally to avoid infinite loops
  const excludeKeys = [
    ...swipeHistory.getViewedKeys(),
    ...dislikedListings
  ];

  const swipeQueue = useSmartSwipeQueue({ excludeKeys });
  const [showDislikedResetDialog, setShowDislikedResetDialog] = useState(false);

  const selectedListing = useMemo(() => {
    if (visibleIndex === null || visibleIndex < 0 || visibleIndex >= visibleListings.length) {
      return null;
    }
    return visibleListings[visibleIndex];
  }, [visibleIndex, visibleListings]);

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
    return !isNaN(val) ? val : 11;
  }, [searchParams]);

  // Initial load
  useEffect(() => {
    const initialBounds = {
      north: initialLat + 0.1,
      south: initialLat - 0.1,
      east: initialLng + 0.1,
      west: initialLng - 0.1,
      zoom: initialZoom,
    };
    loadListings(initialBounds, filters);
  }, [initialLat, initialLng, filters, loadListings, initialZoom]);

  // Prefetch full listings
  useEffect(() => {
    const prefetchListings = async () => {
      const slugsToFetch = visibleListings
        .slice(0, 5)
        .map((listing) => listing.slugAddress ?? listing.slug)
        .filter(
          (slug): slug is string =>
            !!slug && !listingCache.current.has(slug) && !fetchingRef.current.has(slug)
        );

      for (const slug of slugsToFetch) {
        fetchingRef.current.add(slug);
        try {
          const res = await fetch(`/api/mls-listings/${slug}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          if (json?.listing && json.listing.listingKey) {
            listingCache.current.set(slug, json.listing);
          } else {
          }
        } catch (err) {
          console.error(`❌ Error prefetching listing ${slug}:`, err);
        } finally {
          fetchingRef.current.delete(slug);
        }
      }
    };

    prefetchListings();
  }, [visibleListings]);

  // Clear stale cache
  useEffect(() => {
    const validSlugs = new Set(visibleListings.map((l) => l.slugAddress ?? l.slug));
    for (const slug of listingCache.current.keys()) {
      if (!validSlugs.has(slug)) {
        listingCache.current.delete(slug);
      }
    }
  }, [visibleListings]);

  // Close filters when selecting a listing
  useEffect(() => {
    if (selectedListing && isSidebarOpen && isFiltersOpen) {
      setFiltersOpen(false);
    }
  }, [selectedListing, isSidebarOpen, isFiltersOpen]);

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

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (next && selectedListing && isFiltersOpen) setFiltersOpen(false);
      return next;
    });
  };

  const toggleFilters = () => {
    setFiltersOpen((prev) => {
      const next = !prev;
      if (next && selectedListing && isSidebarOpen) setSidebarOpen(false);
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
        // For boolean/undefined filters, set to undefined
        (newFilters as any)[filterKey] = undefined;
      } else {
        // For string filters, set to empty string
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

  // Restore selected listing from URL on mount or when listings change
  useEffect(() => {
    const selectedSlug = searchParams.get("selected");
    if (!selectedSlug) return;

    // Don't restore if we already have this listing selected
    if (selectedSlugRef.current === selectedSlug && selectedFullListing) {
      return;
    }

    // Wait for listings to be available
    if (allListings.length === 0) return;

    // Find the listing in either visibleListings or allListings
    const listing = visibleListings.find(
      (l) => (l.slugAddress || l.slug) === selectedSlug
    ) || allListings.find(
      (l) => (l.slugAddress || l.slug) === selectedSlug
    );

    if (listing) {
      const index = visibleListings.findIndex((l) => l._id === listing._id);
      if (index !== -1) {
        setVisibleIndex(index);
      }
      setSelectionLocked(true);
      selectedSlugRef.current = selectedSlug;
      fetchFullListing(selectedSlug);
    }
  }, [searchParams, allListings, visibleListings, selectedFullListing, fetchFullListing]);

  const handleListingSelect = (listing: MapListing) => {
    if (!listing.slugAddress) return;

    const index = visibleListings.findIndex((l) => l._id === listing._id);
    if (index === -1) return;

    const slug = listing.slugAddress ?? listing.slug;

    // If selecting the same listing, do nothing
    if (slug === selectedSlugRef.current && selectedFullListing) {
      return;
    }

    setVisibleIndex(index);
    setSelectionLocked(true); // 🔒 lock

    // Fetch new listing data
    if (slug) {
      selectedSlugRef.current = slug;
      fetchFullListing(slug);
    }

    // Update URL without triggering navigation
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", listing.slugAddress!);
    if (listing.latitude && listing.longitude) {
      params.set("lat", listing.latitude.toFixed(6));
      params.set("lng", listing.longitude.toFixed(6));
    }

    // Use replace instead of push to avoid adding to history
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleCloseListing = () => {
    setVisibleIndex(null);
    setSelectedFullListing(null);
    selectedSlugRef.current = null;
    setSelectionLocked(false); // 🔓 unlock
    swipeHistory.clearViewed(); // Clear session history when panel closes
    swipeQueue.clear(); // Clear the queue
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const advanceToNextListing = async () => {

    // Try to get next listing from smart queue first
    const nextListing = swipeQueue.getNext();

    if (nextListing) {
      const nextSlug = nextListing.slugAddress ?? nextListing.slug;
      if (!nextSlug) {
        handleCloseListing();
        return;
      }


      // Mark as viewed
      swipeHistory.markAsViewed(nextListing.listingKey);

      // Find in visibleListings for index
      const nextIndex = visibleListings.findIndex((l) => l._id === nextListing._id);
      if (nextIndex !== -1) {
        setVisibleIndex(nextIndex);
      } else {
      }

      selectedSlugRef.current = nextSlug;
      await fetchFullListing(nextSlug);
      return;
    }


    // Fallback to original sequential logic if queue is empty
    if (visibleIndex !== null && visibleIndex < visibleListings.length - 1) {
      const nextIndex = visibleIndex + 1;
      const next = visibleListings[nextIndex];
      if (!next) {
        handleCloseListing();
        return;
      }
      const nextSlug = next.slugAddress ?? next.slug;
      if (!nextSlug) {
        handleCloseListing();
        return;
      }


      // Mark as viewed
      swipeHistory.markAsViewed(next.listingKey);

      setVisibleIndex(nextIndex);
      selectedSlugRef.current = nextSlug;
      await fetchFullListing(nextSlug);
    } else {
      handleCloseListing();
    }
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
    swipeHistory.removeFromDislikes(listing.listingKey);
    setDislikedListings(swipeHistory.getDislikedKeys());
  };

  const handleClearDislikes = () => {
    swipeHistory.resetDislikes();
    setDislikedListings([]);
  };

  // Convert disliked listing keys to MapListing objects
  const dislikedListingsData = useMemo(() => {
    return allListings.filter((listing) =>
      dislikedListings.includes(listing.listingKey)
    );
  }, [allListings, dislikedListings]);

  // Bounds → listings change (don't auto-select first listing)
  useEffect(() => {
    if (!selectionLocked) {
      // Don't auto-select - let user click a marker
      setVisibleIndex(null);
    } else {
      if (
        selectedListing &&
        !visibleListings.some((l) => l._id === selectedListing._id)
      ) {
      }
    }
  }, [visibleListings, selectionLocked, selectedListing]);

  // Initialize swipe queue when a listing is selected
  useEffect(() => {
    if (selectedListing && selectedFullListing) {

      // Mark current listing as viewed
      swipeHistory.markAsViewed(selectedListing.listingKey);

      // Initialize queue with similar listings
      swipeQueue.initializeQueue(selectedListing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListing?.listingKey, selectedFullListing?.listingKey]);

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
      loadListings(bounds, filters);
    }, 300);
  };

  return (
    <>
      {/* Minimal iOS Safari fixes */}
      <style jsx global>{`
        .map-container {
          position: fixed;
          top: 128px;
          bottom: 0;
          left: 0;
          right: 0;
          overflow: hidden;
        }

        /* Let MapLibre handle canvas positioning naturally */
        .maplibregl-map {
          width: 100%;
          height: 100%;
        }
      `}</style>

      <MapSearchBar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onSearch={(lat, lng) => mapRef.current?.flyToCity(lat, lng)}
        onToggleFilters={toggleFilters}
        onToggleSatellite={() => setIsSatelliteView(prev => !prev)}
        isSatelliteView={isSatelliteView}
        allListings={allListings}
      />

      {/* Active Filters Display */}
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
            listings={allListings}
            centerLat={initialLat}
            centerLng={initialLng}
            zoom={initialZoom}
            onSelectListing={handleListingSelect}
            selectedListing={selectedListing}
            onBoundsChange={handleBoundsChange}
            panelOpen={Boolean(selectedListing && selectedFullListing)}
            isSatelliteView={isSatelliteView}
          />
        </div>

        <FavoritesPannel
          visibleListings={visibleListings}
          favorites={likedListings}
          dislikedListings={dislikedListingsData}
          isSidebarOpen={isSidebarOpen}
          selectedListing={selectedListing}
          onClose={() => setSidebarOpen(false)}
          onSelectListing={handleListingSelect}
          onRemoveFavorite={handleRemoveFavorite}
          onClearFavorites={handleClearFavorites}
          onRemoveDislike={handleRemoveDislike}
          onClearDislikes={handleClearDislikes}
        />
      </div>

      {selectedListing && selectedFullListing && (
        <ListingBottomPanel
          key={selectedFullListing.listingKey}
          listing={selectedListing}
          fullListing={selectedFullListing}
          onClose={handleCloseListing}
          isDisliked={dislikedListings.includes(selectedListing.listingKey)}
          dislikedTimestamp={swipeHistory.getDislikedTimestamp(selectedListing.listingKey)}
          onRemoveDislike={() => {
            swipeHistory.removeFromDislikes(selectedListing.listingKey);
            setDislikedListings(swipeHistory.getDislikedKeys());
          }}
          onSwipeLeft={() => {
            // Mark as disliked
            swipeHistory.markAsDisliked(selectedListing.listingKey);
            setDislikedListings(swipeHistory.getDislikedKeys());

            // Remove from favorites if present
            const currentSlug = selectedListing.slugAddress ?? selectedListing.slug;
            if (
              likedListings.some(
                (fav) => (fav.slugAddress ?? fav.slug) === currentSlug
              )
            ) {
              setLikedListings((prev) =>
                prev.filter(
                  (fav) => (fav.slugAddress ?? fav.slug) !== currentSlug
                )
              );
            }

            // Check if user has 100+ dislikes
            const dislikedCount = swipeHistory.getDislikedCount();
            if (dislikedCount >= 100) {
              setShowDislikedResetDialog(true);
            }

            advanceToNextListing();
          }}
          onSwipeRight={() => {
            // Add to favorites
            const currentSlug = selectedListing.slugAddress ?? selectedListing.slug;
            if (
              !likedListings.some(
                (fav) => (fav.slugAddress ?? fav.slug) === currentSlug
              )
            ) {
              const full = allListings.find(
                (l) => (l.slugAddress ?? l.slug) === currentSlug
              );
              setLikedListings((prev) =>
                full ? [...prev, full] : [...prev, selectedListing]
              );
            }

            advanceToNextListing();
          }}
          isSidebarOpen={isSidebarOpen}
          isFiltersOpen={isFiltersOpen}
        />
      )}

      {/* Disliked Reset Dialog */}
      <DislikedResetDialog
        isOpen={showDislikedResetDialog}
        dislikedCount={swipeHistory.getDislikedCount()}
        onReset={() => {
          swipeHistory.resetDislikes();
          setShowDislikedResetDialog(false);
        }}
        onClose={() => setShowDislikedResetDialog(false)}
      />
    </>
  );
}
