"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { MapListing, Filters } from "@/types/types";
import MapView, { MapViewHandles } from "@/app/components/mls/map/MapView";
import MapSearchBar from "./search/MapSearchBar";
import FiltersPanel from "./search/FiltersPannel";
import ListingBottomPanel from "@/app/components/mls/map/ListingBottomPanel";

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

  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024; // open only on desktop (lg: 1024px+)
    }
    return false; // SSR fallback (closed by default)
  });

  const [isFiltersOpen, setFiltersOpen] = useState(false);
  const [allListings, setAllListings] = useState<MapListing[]>([]);
  const [visibleListings, setVisibleListings] = useState<MapListing[]>([]);
  const [selectedListing, setSelectedListing] = useState<MapListing | null>(
    null
  );
  const [filters, setFilters] = useState<Filters>(defaultFilterState);

  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const zoom = parseFloat(searchParams.get("zoom") || "");

  const centerLat = !isNaN(lat) ? lat : undefined;
  const centerLng = !isNaN(lng) ? lng : undefined;
  const zoomLevel = !isNaN(zoom) ? zoom : undefined;

  const touchStartX = useRef<number | null>(null);
  const isBottomPanelOpen = !!selectedListing;

  useEffect(() => {
    if (isBottomPanelOpen && isSidebarOpen && isFiltersOpen) {
      setFiltersOpen(false);
    }
  }, [isBottomPanelOpen, isSidebarOpen, isFiltersOpen]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      if (next && isBottomPanelOpen && isFiltersOpen) setFiltersOpen(false);
      return next;
    });
  };

  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches?.[0];
    if (touch) touchStartX.current = touch.clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches?.[0];
    if (touchStartX.current !== null && touch) {
      const deltaX = touch.clientX - touchStartX.current;
      if (deltaX > 75) setSidebarOpen(false);
    }
    touchStartX.current = null;
  };

  const handleApplyFilters = (newFilters: Filters) => {
    setFilters(newFilters);
    setFiltersOpen(false);
  };

  const handleListingSelect = (listing: MapListing) => {
    setSelectedListing({ ...listing });
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", listing.slug!);
    if (listing.latitude && listing.longitude) {
      params.set("lat", listing.latitude.toFixed(6));
      params.set("lng", listing.longitude.toFixed(6));
    }
    const url = `?${params.toString()}`;
    router.push(url, { scroll: false });
  };

  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected && allListings.length) {
      const listing = allListings.find((l) => l.slug === selected);
      if (listing) setSelectedListing({ ...listing });
    }
  }, [searchParams, allListings]);

  useEffect(() => {
    const shouldLockScroll = isSidebarOpen || isFiltersOpen;
    document.body.style.overflow = shouldLockScroll ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isSidebarOpen, isFiltersOpen]);

  const handleCloseListing = () => {
    setSelectedListing(null);
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

  return (
    <>
      <div className="relative z-35">
        <MapSearchBar
          isOpen={true}
          onToggle={toggleSidebar}
          onSearch={(lat: number, lng: number) => {
            mapRef.current?.flyToCity(lat, lng);
          }}
          onToggleFilters={toggleFilters}
          allListings={allListings}
        />

        {/* Info bars only visible on sm+ screens */}
        <div className="hidden sm:flex absolute top-[70px] left-0 right-0 z-40 px-4 space-x-2 items-center">
          {/* Listings Count */}
          <div className="bg-emerald-500 text-black text-xs font-semibold rounded-md px-3 py-1 shadow text-center">
            Listings: {allListings.length}
          </div>

          {/* Active Filters */}
          <div className="bg-zinc-800 text-white text-xs font-medium rounded-md px-3 py-1 shadow border border-zinc-700 text-center">
            Active Filters:{" "}
            {Object.entries(filters)
              .filter(([_, v]) => v !== "" && v !== undefined)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ") || "None"}
          </div>
        </div>
      </div>

      {isFiltersOpen && (
        <FiltersPanel
          defaultFilters={filters}
          isOpen={isFiltersOpen}
          onClose={() => setFiltersOpen(false)}
          onApply={handleApplyFilters}
        />
      )}

      <div className="flex h-[calc(100vh-64px)] relative font-[Raleway] overflow-hidden overscroll-none">
        <div
          className={`absolute top-0 bottom-0 w-full h-full ${mapPaddingClass}`}
        >
          <MapView
            ref={mapRef}
            listings={allListings}
            setVisibleListings={setVisibleListings}
            centerLat={centerLat}
            centerLng={centerLng}
            zoom={zoomLevel}
            onSelectListing={handleListingSelect}
            selectedListing={selectedListing}
            onBoundsChange={(bounds) => debouncedLoadListings(bounds, filters)}
          />

          {selectedListing && (
            <div className="fixed bottom-0 left-0 w-full z-40 transition-all duration-500 transform translate-y-0 opacity-100">
              <ListingBottomPanel
                listing={selectedListing}
                onClose={handleCloseListing}
                isSidebarOpen={isSidebarOpen}
                isFiltersOpen={isFiltersOpen}
              />
            </div>
          )}
        </div>

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`fixed top-[64px] right-0 h-[calc(100vh-64px)] w-[100%] sm:w-[100%] md:w-[60%] lg:w-[25%] 2xl:w-[15%]
          bg-zinc-950 text-white transform transition-transform duration-300 z-40
          ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}
          border-l border-zinc-800 overflow-y-auto px-4 py-6 pt-6 overscroll-contain`}
        >
          <div className="flex justify-end mb-2">
            <button
              onClick={toggleSidebar}
              aria-label="Close Sidebar"
              className="hover:text-emerald-400 transition"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          <h2 className="text-lg font-semibold mb-6 pt-4 text-emerald-400 tracking-wide">
            Properties in View
          </h2>

          <ul className="space-y-5">
            {visibleListings.map((listing) => (
              <li key={listing._id}>
                <Link
                  href={`/mls-listings/${listing.slugAddress || listing.slug}`}
                  className="group flex flex-col bg-zinc-900 rounded-xl overflow-hidden shadow-sm border border-zinc-800 hover:border-emerald-500 transition-all duration-200"
                >
                  <img
                    src={listing.primaryPhotoUrl}
                    alt={listing.address}
                    className="w-full h-40 object-cover group-hover:opacity-90 transition duration-200"
                  />
                  <div className="p-4 space-y-2">
                    <p className="text-lg font-semibold text-white group-hover:text-emerald-400 transition">
                      ${listing.listPrice.toLocaleString()}
                    </p>
                    <p className="text-sm text-zinc-300">
                      {listing.unparsedAddress}
                    </p>
                    <div className="text-xs text-zinc-400 flex flex-wrap gap-2">
                      {listing.bedsTotal ? (
                        <span>{listing.bedsTotal} Bed</span>
                      ) : null}
                      {listing.bathroomsTotalInteger !== undefined ? (
                        <span>{listing.bathroomsTotalInteger} Bath</span>
                      ) : null}
                      {listing.livingArea && (
                        <span>{listing.livingArea.toLocaleString()} SqFt</span>
                      )}
                      {listing.lotSizeSqft && (
                        <span>
                          {Math.round(listing.lotSizeSqft).toLocaleString()} Lot
                        </span>
                      )}
                      {listing.pool && <span>🏊 Pool</span>}
                      {listing.spa && <span>🧖 Spa</span>}
                    </div>

                    {listing.publicRemarks && (
                      <p className="text-xs text-zinc-400 mt-2 line-clamp-3">
                        {listing.publicRemarks}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
