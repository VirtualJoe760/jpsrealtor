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
  const [filters, setFilters] = useState<Filters>(defaultFilterState);
  const [selectionLocked, setSelectionLocked] = useState(false); // 🔒
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
            console.log(`✅ Prefetched listing ${slug}`);
          } else {
            console.warn(`⚠️ No valid listing for slug ${slug}`);
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
        console.log(`🗑️ Cleared stale cache for ${slug}`);
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

      return newFilters;
    });
  };

  const handleClearAllFilters = () => {
    setFilters(defaultFilterState);
  };

  const fetchFullListing = useCallback(async (slug: string) => {
    if (!slug) return;
    if (fetchingRef.current.has(slug)) return;

    if (listingCache.current.has(slug)) {
      const cached = listingCache.current.get(slug)!;
      if (cached.listingKey) {
        setSelectedFullListing(cached);
        return;
      }
      listingCache.current.delete(slug);
    }

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
    }
  }, []);

  const handleListingSelect = (listing: MapListing) => {
    if (!listing.slugAddress) return;

    const index = visibleListings.findIndex((l) => l._id === listing._id);
    if (index === -1) return;

    setVisibleIndex(index);
    setSelectionLocked(true); // 🔒 lock

    const slug = listing.slugAddress ?? listing.slug;
    if (slug && slug !== selectedSlugRef.current) {
      selectedSlugRef.current = slug;
      fetchFullListing(slug);
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", listing.slugAddress!);
    if (listing.latitude && listing.longitude) {
      params.set("lat", listing.latitude.toFixed(6));
      params.set("lng", listing.longitude.toFixed(6));
    }
    router.push(`?${params.toString()}`, { scroll: false });
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
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const advanceToNextListing = async () => {
    console.log("🎬 advanceToNextListing called");
    console.log("📊 Queue size:", swipeQueue.queueLength);

    // Try to get next listing from smart queue first
    const nextListing = swipeQueue.getNext();
    console.log("🎯 Next from queue:", nextListing ? `${nextListing.slugAddress || nextListing.slug}` : "null");

    if (nextListing) {
      const nextSlug = nextListing.slugAddress ?? nextListing.slug;
      if (!nextSlug) {
        console.log("❌ No slug for next listing, closing");
        handleCloseListing();
        return;
      }

      console.log("✅ Using listing from queue:", nextSlug);

      // Mark as viewed
      swipeHistory.markAsViewed(nextListing.listingKey);

      // Find in visibleListings for index
      const nextIndex = visibleListings.findIndex((l) => l._id === nextListing._id);
      if (nextIndex !== -1) {
        setVisibleIndex(nextIndex);
        console.log("📍 Found in visibleListings at index:", nextIndex);
      } else {
        console.log("⚠️ Listing not in visibleListings, keeping current index");
      }

      selectedSlugRef.current = nextSlug;
      await fetchFullListing(nextSlug);
      return;
    }

    console.log("⚠️ Queue empty, falling back to sequential");

    // Fallback to original sequential logic if queue is empty
    if (visibleIndex !== null && visibleIndex < visibleListings.length - 1) {
      const nextIndex = visibleIndex + 1;
      const next = visibleListings[nextIndex];
      if (!next) {
        console.log("❌ No next listing in visibleListings, closing");
        handleCloseListing();
        return;
      }
      const nextSlug = next.slugAddress ?? next.slug;
      if (!nextSlug) {
        console.log("❌ No slug for fallback listing, closing");
        handleCloseListing();
        return;
      }

      console.log("📝 Using sequential listing:", nextSlug);

      // Mark as viewed
      swipeHistory.markAsViewed(next.listingKey);

      setVisibleIndex(nextIndex);
      selectedSlugRef.current = nextSlug;
      await fetchFullListing(nextSlug);
    } else {
      console.log("❌ No more listings, closing panel");
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
        console.log("ℹ️ Locked selection not in visibleListings, keeping panel");
      }
    }
  }, [visibleListings, selectionLocked, selectedListing]);

  // Initialize swipe queue when a listing is selected
  useEffect(() => {
    if (selectedListing && selectedFullListing) {
      console.log("🎬 Initializing swipe queue for:", selectedListing.slugAddress || selectedListing.slug);
      console.log("🏘️ Subdivision:", selectedListing.subdivisionName);
      console.log("🏠 Property Type:", selectedListing.propertyType);

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
