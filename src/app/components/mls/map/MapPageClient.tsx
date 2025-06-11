"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import type { MapListing, Filters } from "@/types/types";
import MapView, { MapViewHandles } from "@/app/components/mls/map/MapView";
import MapSearchBar from "./search/MapSearchBar";
import FiltersPanel from "./search/FiltersPannel";
import ListingBottomPanel from "@/app/components/mls/map/ListingBottomPanel";
import FavoritesPannel from "@/app/components/mls/map/FavoritesPannel";

function debounce<T extends (...args: any[]) => void>(fn: T, delay = 500): T {
  let timer: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

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

  const [isSidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false
  );
  const [isFiltersOpen, setFiltersOpen] = useState(false);
  const [allListings, setAllListings] = useState<MapListing[]>([]);
  const [visibleListings, setVisibleListings] = useState<MapListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<MapListing | null>(
    null
  );
  const [filters, setFilters] = useState<Filters>(defaultFilterState);
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);
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

  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const zoom = parseFloat(searchParams.get("zoom") || "");

  const centerLat = !isNaN(lat) ? lat : undefined;
  const centerLng = !isNaN(lng) ? lng : undefined;
  const zoomLevel = !isNaN(zoom) ? zoom : undefined;

  const isBottomPanelOpen = !!selectedListing;

  useEffect(() => {
    if (isBottomPanelOpen && isSidebarOpen && isFiltersOpen) {
      setFiltersOpen(false);
    }
  }, [isBottomPanelOpen, isSidebarOpen, isFiltersOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("likedListings", JSON.stringify(likedListings));
      } catch (e) {
        console.error("Failed to save favorites:", e);
      }
    }
  }, [likedListings]);



  // Save favorites to cookies on change
  useEffect(() => {
    Cookies.set("favorites", JSON.stringify(likedListings), { expires: 7 });
  }, [likedListings]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (next && isBottomPanelOpen && isFiltersOpen) setFiltersOpen(false);
      return next;
    });
  };

  const toggleFilters = () => {
    setFiltersOpen((prev) => {
      const next = !prev;
      if (next && isBottomPanelOpen && isSidebarOpen) setSidebarOpen(false);
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

  const handleListingSelect = (listing: MapListing) => {
    const index = visibleListings.findIndex((l) => l._id === listing._id);
    if (index !== -1) setVisibleIndex(index);
    setSelectedListing({ ...listing });

    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", listing.slug!);
    if (listing.latitude && listing.longitude) {
      params.set("lat", listing.latitude.toFixed(6));
      params.set("lng", listing.longitude.toFixed(6));
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected && allListings.length) {
      const listing = allListings.find((l) => l.slug === selected);
      if (listing) {
        setSelectedListing({ ...listing });
        const index = visibleListings.findIndex((l) => l._id === listing._id);
        if (index !== -1) setVisibleIndex(index);
      }
    }
  }, [searchParams, allListings, visibleListings]);

  const handleCloseListing = () => {
    setSelectedListing(null);
    setVisibleIndex(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  async function loadListings(bounds: any, activeFilters: Filters) {
    try {
      const query = new URLSearchParams();
      Object.entries(bounds).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.set(key, value.toString());
        }
      });

      if (activeFilters.minPrice)
        query.set(
          "minPrice",
          (parseInt(activeFilters.minPrice) * 1000).toString()
        );
      if (activeFilters.maxPrice)
        query.set(
          "maxPrice",
          (parseInt(activeFilters.maxPrice) * 1000).toString()
        );
      if (activeFilters.beds) query.set("beds", activeFilters.beds);
      if (activeFilters.baths) query.set("baths", activeFilters.baths);
      if (activeFilters.propertyType)
        query.set("propertySubType", activeFilters.propertyType);
      if (activeFilters.poolYn !== undefined)
        query.set("pool", String(activeFilters.poolYn));
      if (activeFilters.spaYn !== undefined)
        query.set("spa", String(activeFilters.spaYn));
      if (activeFilters.hoa) query.set("hoa", activeFilters.hoa);
      if (activeFilters.associationYN !== undefined)
        query.set("hasHOA", String(activeFilters.associationYN));

      query.set("propertyType", "A");

      const res = await fetch(`/api/mls-listings?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      const data = await res.json();
      setAllListings(data.listings || []);
    } catch (err) {
      console.error("❌ Error loading listings:", err);
    }
  }

  const debouncedLoadListings = useMemo(
    () => debounce(loadListings, 600),
    [filters]
  );

  const advanceToNextListing = () => {
    if (visibleIndex !== null && visibleIndex < visibleListings.length - 1) {
      const nextIndex = visibleIndex + 1;
      const next = visibleListings[nextIndex];
      const currentSlug = selectedListing?.slugAddress ?? selectedListing?.slug;
      const nextSlug = next?.slugAddress ?? next?.slug;

      if (nextSlug && nextSlug !== currentSlug) {
        setVisibleIndex(nextIndex);
        fetch(`/api/mls-listings/${nextSlug}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.listing) {
              setSelectedListing(data.listing);
            } else {
              console.error("❌ Failed to load next listing");
            }
          });
      }
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
          className={`absolute top-0 bottom-0 w-full h-full ${mapPaddingClass}`}
        >
          <MapView
            ref={mapRef}
            listings={allListings}
            setVisibleListings={(listings) => {
              const filtered = listings.filter(
                (l) => l.slug && l.latitude && l.longitude
              );
              setVisibleListings(filtered);
            }}
            centerLat={centerLat}
            centerLng={centerLng}
            zoom={zoomLevel}
            onSelectListing={handleListingSelect}
            selectedListing={selectedListing}
            onBoundsChange={(bounds) => debouncedLoadListings(bounds, filters)}
          />

          {selectedListing && (
            <ListingBottomPanel
              key={selectedListing.slugAddress ?? selectedListing.slug}
              listing={selectedListing}
              onClose={handleCloseListing}
              onSwipeLeft={() => {
                const currentSlug =
                  selectedListing.slugAddress ?? selectedListing.slug;

                const isFavorite = likedListings.some(
                  (fav) => (fav.slugAddress ?? fav.slug) === currentSlug
                );

                if (isFavorite) {
                  setLikedListings((prev) =>
                    prev.filter(
                      (fav) => (fav.slugAddress ?? fav.slug) !== currentSlug
                    )
                  );
                }

                advanceToNextListing();
              }}
              onSwipeRight={() => {
                const currentSlug =
                  selectedListing.slugAddress ?? selectedListing.slug;

                const alreadyFavorite = likedListings.some(
                  (fav) => (fav.slugAddress ?? fav.slug) === currentSlug
                );

                if (!alreadyFavorite && selectedListing) {
                  setLikedListings((prev) => {
                    const full = allListings.find(
                      (l) => (l.slugAddress ?? l.slug) === currentSlug
                    );
                    return full ? [...prev, full] : [...prev, selectedListing];
                  });
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
