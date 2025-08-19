"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import type { MapListing, Filters } from "@/types/types";
import type { IListing } from "@/models/listings";
import MapView, { MapViewHandles } from "@/app/components/mls/map/MapView";
import MapSearchBar from "./search/MapSearchBar";
import FiltersPanel from "./search/FiltersPannel";
import ListingBottomPanel from "@/app/components/mls/map/ListingBottomPanel";
import FavoritesPannel from "@/app/components/mls/map/FavoritesPannel";
import { useListings } from "@/app/utils/map/useListings";

const defaultFilterState: Filters = {
  minPrice: "",
  maxPrice: "",
  beds: "",
  baths: "",
  propertyType: "",
  hoa: "",
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
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const advanceToNextListing = () => {
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
      setVisibleIndex(nextIndex);
      selectedSlugRef.current = nextSlug;
      fetchFullListing(nextSlug);
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

  // Bounds → listings change
  useEffect(() => {
    if (!selectionLocked) {
      if (visibleListings.length > 0) {
        setVisibleIndex(0);
      } else {
        setVisibleIndex(null);
      }
    } else {
      if (
        selectedListing &&
        !visibleListings.some((l) => l._id === selectedListing._id)
      ) {
        console.log("ℹ️ Locked selection not in visibleListings, keeping panel");
      }
    }
  }, [visibleListings, selectionLocked, selectedListing]);

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
      <MapSearchBar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onSearch={(lat, lng) => mapRef.current?.flyToCity(lat, lng)}
        onToggleFilters={toggleFilters}
        allListings={allListings}
      />

      {isFiltersOpen && (
        <FiltersPanel
          defaultFilters={filters}
          isOpen={isFiltersOpen}
          onClose={() => setFiltersOpen(false)}
          onApply={handleApplyFilters}
        />
      )}

      <div className="flex h-[calc(100vh-64px)] relative font-[Raleway]">
        <div
          className={`absolute top-0 bottom-0 w-full h-full ${mapPaddingClass} z-1`}
        >
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
          />

          {selectedListing && selectedFullListing && (
            <ListingBottomPanel
              key={selectedFullListing.listingKey}
              listing={selectedListing}
              fullListing={selectedFullListing}
              onClose={handleCloseListing}
              onSwipeLeft={() => {
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
                advanceToNextListing();
              }}
              onSwipeRight={() => {
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
        </div>

        <FavoritesPannel
          visibleListings={visibleListings}
          favorites={likedListings}
          isSidebarOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectListing={handleListingSelect}
          onRemoveFavorite={handleRemoveFavorite}
          onClearFavorites={handleClearFavorites}
        />
      </div>
    </>
  );
}
