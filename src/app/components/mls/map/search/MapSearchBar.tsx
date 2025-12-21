"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Settings2, Search, Satellite, Map as MapIcon } from "lucide-react";
import type { MapListing } from "@/types/types";

type Props = {
  isOpen: boolean;
  onToggle: () => void;
  onSearch?: (lat: number, lng: number) => void;
  onToggleFilters: () => void;
  onToggleSatellite: () => void;
  isSatelliteView: boolean;
  allListings: MapListing[];
};

type ListingResult = {
  type: "listing";
  label: string;
  slug: string;
  photo?: string;
  listPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  latitude?: number;
  longitude?: number;
};

type CityResult = {
  label: string;
  latitude: number;
  longitude: number;
  type: "geocode";
};

type SearchResult = ListingResult | CityResult;

export default function MapSearchBar({
  isOpen,
  onToggle,
  onSearch,
  onToggleFilters,
  onToggleSatellite,
  isSatelliteView,
  allListings,
}: Props) {
  console.error('🔴🔴🔴 [MLS MapSearchBar] COMPONENT MOUNTED - THIS IS AN ERROR LOG!');

  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLUListElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingEnterRef = useRef<((results: SearchResult[]) => void) | null>(null);


  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Shared autocomplete fetch function
  const fetchAutocomplete = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return [];
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      const fetchedResults = json.results || [];
      setResults(fetchedResults);
      setShowDropdown(true);

      // If Enter key is waiting for results, notify it
      if (pendingEnterRef.current) {
        pendingEnterRef.current(fetchedResults);
        pendingEnterRef.current = null;
      }

      return fetchedResults;
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
      if (pendingEnterRef.current) {
        pendingEnterRef.current([]);
        pendingEnterRef.current = null;
      }
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autocomplete
    timeoutRef.current = setTimeout(() => {
      fetchAutocomplete(query);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  // Debug: Log results
  useEffect(() => {
    if (results.length > 0) {
      results.forEach((r, idx) => {
        if (r.type === "listing") {
        } else {
        }
      });
    }
  }, [results]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {

    setQuery("");
    setResults([]);
    setShowDropdown(false);

    if (result.type === "listing") {
      router.push(`/mls-listings/${result.slug}`, { scroll: true });
    } else if (result.type === "geocode") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("lat", result.latitude.toFixed(6));
      params.set("lng", result.longitude.toFixed(6));
      params.set("zoom", "12");
      router.push(`?${params.toString()}`, { scroll: false });

      // If provided, trigger map flyTo manually
      if (onSearch) {
        onSearch(result.latitude, result.longitude);
      }

      // Dispatch location insights request to ChatWidget
      // This triggers AI to provide a location snapshot (2-3 paragraph overview)
      const event = new CustomEvent('requestLocationInsights', {
        detail: {
          locationName: result.label,
          locationType: 'city', // geocode results are typically cities
          city: result.label,
          state: 'CA' // TODO: Extract from result if available
        }
      });
      window.dispatchEvent(event);
      console.log('📍 [MapSearchBar] Dispatched requestLocationInsights for:', result.label);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Use actual input value instead of state (state might be stale when typing fast)
    const searchValue = e.currentTarget.value.trim();

    if (e.key === "Enter" && searchValue.length > 0) {
      e.preventDefault();

      // If we have results already, use the first geocode result
      const firstGeocodeResult = results.find(r => r.type === "geocode");
      if (firstGeocodeResult && firstGeocodeResult.type === "geocode") {
        console.log('📍 [MapSearchBar] Enter pressed - using cached result:', firstGeocodeResult.label);
        handleSelect(firstGeocodeResult);
        return;
      }

      // No cached results - trigger autocomplete immediately and wait for results
      console.log('📍 [MapSearchBar] Enter pressed - waiting for autocomplete to complete for:', searchValue);

      // Clear the existing timeout and fetch immediately
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // If already loading, wait for current request to complete
      if (loading) {
        console.log('📍 [MapSearchBar] Autocomplete already in progress, waiting...');
        // Set up a promise that resolves when autocomplete completes
        const autocompleteResults = await new Promise<SearchResult[]>((resolve) => {
          pendingEnterRef.current = resolve;
        });

        const geocodeResult = autocompleteResults.find((r: SearchResult) => r.type === "geocode");
        if (geocodeResult && geocodeResult.type === "geocode") {
          console.log('📍 [MapSearchBar] Enter pressed - geocode found after waiting:', geocodeResult.label);
          handleSelect(geocodeResult);
        } else {
          console.log('⚠️ [MapSearchBar] Enter pressed - no geocode result found for:', searchValue);
        }
      } else {
        // Not loading, fetch immediately
        console.log('📍 [MapSearchBar] Fetching autocomplete immediately...');
        const autocompleteResults = await fetchAutocomplete(searchValue);

        const geocodeResult = autocompleteResults.find((r: SearchResult) => r.type === "geocode");
        if (geocodeResult && geocodeResult.type === "geocode") {
          console.log('📍 [MapSearchBar] Enter pressed - geocode found:', geocodeResult.label);
          handleSelect(geocodeResult);
        } else {
          console.log('⚠️ [MapSearchBar] Enter pressed - no geocode result found for:', searchValue);
        }
      }
    }
  };

  return (
    <>
      <div className="fixed top-16 z-30 w-full px-2 md:px-4 py-3 bg-zinc-950 text-white shadow-lg border-b border-zinc-800">
        <div className="flex items-center justify-between gap-2 md:gap-4">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            {/* Filters Toggle Button */}
            <button
              onClick={onToggleFilters}
              aria-label="Toggle Filters"
              className="flex-shrink-0 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <SlidersHorizontal className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
            </button>

            {/* Satellite Toggle Button */}
            <button
              onClick={onToggleSatellite}
              aria-label={isSatelliteView ? "Switch to Map View" : "Switch to Satellite View"}
              className="flex-shrink-0 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              title={isSatelliteView ? "Map View" : "Satellite View"}
            >
              {isSatelliteView ? (
                <MapIcon className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
              ) : (
                <Satellite className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
              )}
            </button>
          </div>

          {/* Search Bar - CENTER */}
          <div className="relative flex-1 max-w-[600px] mx-auto">
            <div className="relative flex items-center bg-zinc-900 border-2 border-zinc-700 rounded-lg hover:border-emerald-500 focus-within:border-emerald-500 transition-colors">
              <Search className="absolute left-3 w-4 h-4 md:w-5 md:h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search by address, city, or neighborhood..."
                className="w-full pl-10 md:pl-11 pr-3 py-2 md:py-2.5 text-base text-white bg-transparent placeholder-gray-400 focus:outline-none"
                style={{ fontSize: '16px' }}
              />
            </div>

            {showDropdown && results.length > 0 && (
            <ul
              ref={dropdownRef}
              className="absolute top-10 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:w-[700px] bg-zinc-900 border border-zinc-700 max-h-96 overflow-y-auto z-50 shadow-2xl"
            >
              {results.map((r, idx) => (
                <li
                  key={idx}
                  onMouseDown={() => handleSelect(r)} // Use onMouseDown for better UX
                  className="flex items-center gap-4 px-4 py-4 text-lg text-white hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-b-0"
                >
                  {r.type === "listing" ? (
                    <>
                      <img
                        src={r.photo || "/images/no-photo.png"}
                        alt="thumbnail"
                        className="w-20 h-20 object-cover flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/images/no-photo.png";
                        }}
                      />
                      <div className="flex flex-col justify-center overflow-hidden">
                        <span className="font-semibold text-lg truncate">
                          {r.label}
                        </span>
                        <span className="text-sm text-zinc-400">
                          {r.listPrice
                            ? `$${r.listPrice.toLocaleString()}`
                            : "No price"}{" "}
                          • {r.bedrooms ?? 0} Bed • {r.bathrooms ?? 0} Bath •{" "}
                          {r.sqft?.toLocaleString() ?? "0"} SqFt
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-semibold">{r.label}</span>
                      <span className="text-xs text-zinc-400">(City)</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          </div>

          {/* Favorites/Settings Toggle Button - FAR RIGHT */}
          <button
            onClick={onToggle}
            aria-label="Toggle Sidebar"
            className="flex-shrink-0 p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Settings2 className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
          </button>
        </div>
      </div>
    </>
  );
}
