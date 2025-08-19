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
  const fetchingRef = useRef<Set<string>>(new Set()); // Track ongoing fetches

  const [isSidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  const [isFiltersOpen, setFiltersOpen] = useState(false);
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);
  const [selectedFullListing, setSelectedFullListing] = useState<IListing | null>(null);
  const [filters, setFilters] = useState<Filters>(defaultFilterState);
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

  const { allListings, visibleListings, setVisibleListings, loadListings } =
    useListings();

  const selectedListing = useMemo(() => {
    if (visibleIndex === null || visibleIndex >= visibleListings.length) return null;
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

  // Prefetch full listings for visible listings
  useEffect(() => {
    const prefetchListings = async () => {
      const slugsToFetch = visibleListings
        .slice(0, 5) // Reduced to 5 for performance
        .map((listing) => listing.slugAddress ?? listing.slug)
        .filter((slug): slug is string => !!slug && !listingCache.current.has(slug) && !fetchingRef.current.has(slug));

      for (const slug of slugsToFetch) {
        fetchingRef.current.add(slug);
        try {
          const res = await fetch(`/api/mls-listings/${slug}`);
          const json = await res.json();
          if (json?.listing) {
            listingCache.current.set(slug, json.listing);
            console.log(`Prefetched listing ${slug}`);
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

  useEffect(() => {
    if (selectedListing && isSidebarOpen && isFiltersOpen) {
      setFiltersOpen(false);
    }
  }, [selectedListing, isSidebarOpen, isFiltersOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("likedListings", JSON.stringify(likedListings));
      } catch (e) {
        console.error("Failed to save favorites:", e);
      }
    }
  }, [likedListings]);

  useEffect(() => {
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
    if (listingCache.current.has(slug)) {
      console.log(`Cache hit for listing ${slug}`);
      setSelectedFullListing(listingCache.current.get(slug)!);
      return;
    }

    if (fetchingRef.current.has(slug)) {
      console.log(`Fetch already in progress for ${slug}`);
      return;
    }

    fetchingRef.current.add(slug);
    try {
      console.log(`Fetching listing ${slug}`);
      const res = await fetch(`/api/mls-listings/${slug}`);
      const json = await res.json();
      if (json?.listing) {
        listingCache.current.set(slug, json.listing);
        setSelectedFullListing(json.listing);
      } else {
        console.error(`No listing found for slug ${slug}`);
      }
    } catch (err) {
      console.error("❌ Error fetching full listing:", err);
    } finally {
      fetchingRef.current.delete(slug);
    }
  }, []);

  const handleListingSelect = (listing: MapListing) => {
    const index = visibleListings.findIndex((l) => l._id === listing._id);
    if (index !== -1) setVisibleIndex(index);

    const slug = listing.slugAddress ?? listing.slug;
    const currentSlug = selectedListing?.slugAddress ?? selectedListing?.slug;
    if (slug && slug !== currentSlug) {
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
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const advanceToNextListing = () => {
    if (visibleIndex !== null && visibleIndex < visibleListings.length - 1) {
      const nextIndex = visibleIndex + 1;
      const next = visibleListings[nextIndex];
      const nextSlug = next?.slugAddress ?? next?.slug;
      if (!nextSlug) return;

      setVisibleIndex(nextIndex);
      selectedSlugRef.current = nextSlug;
      fetchFullListing(nextSlug);
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

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastBoundsRef = useRef<string | null>(null);

  const handleBoundsChange = (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  }) => {
    const key = `${bounds.north.toFixed(6)}-${bounds.south.toFixed(6)}-${bounds.east.toFixed(6)}-${bounds.west.toFixed(6)}-${bounds.zoom.toFixed(2)}`;
    if (key === lastBoundsRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastBoundsRef.current = key;
      console.log("Bounds changed:", bounds);
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
        <div className={`absolute top-0 bottom-0 w-full h-full ${mapPaddingClass} z-1`}>
          <MapView
            ref={mapRef}
            listings={allListings}
            centerLat={initialLat}
            centerLng={initialLng}
            zoom={initialZoom}
            onSelectListing={handleListingSelect}
            selectedListing={selectedListing}
            onBoundsChange={handleBoundsChange}
            onSelectListingByIndex={(index) => setVisibleIndex(index)}
          />

          {selectedSlugRef.current && selectedListing && selectedFullListing && (
            <ListingBottomPanel
              key={selectedSlugRef.current}
              listing={selectedListing}
              fullListing={selectedFullListing}
              onClose={handleCloseListing}
              onSwipeLeft={() => {
                const currentSlug = selectedListing.slugAddress ?? selectedListing.slug;
                if (likedListings.some((fav) => (fav.slugAddress ?? fav.slug) === currentSlug)) {
                  setLikedListings((prev) =>
                    prev.filter((fav) => (fav.slugAddress ?? fav.slug) !== currentSlug)
                  );
                }
                advanceToNextListing();
              }}
              onSwipeRight={() => {
                const currentSlug = selectedListing.slugAddress ?? selectedListing.slug;
                if (!likedListings.some((fav) => (fav.slugAddress ?? fav.slug) === currentSlug)) {
                  const full = allListings.find((l) => (l.slugAddress ?? l.slug) === currentSlug);
                  setLikedListings((prev) => (full ? [...prev, full] : [...prev, selectedListing]));
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
