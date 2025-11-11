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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLUListElement | null>(null);
  


  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const load = async () => {
      if (query.length < 2) return setResults([]);

      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.results || []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Search failed:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(load, 300);
    return () => clearTimeout(delay);
  }, [query]);

  // Debug: Log results
  useEffect(() => {
    if (results.length > 0) {
      console.log("📦 Search Results:");
      results.forEach((r, idx) => {
        if (r.type === "listing") {
          console.log(`🔹 Listing [${idx}]`, r);
        } else {
          console.log(`🌐 Geocode [${idx}]`, r);
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
    console.log("📌 Selected search result:", result);

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
                placeholder="Search by address, city, or neighborhood..."
                className="w-full pl-10 md:pl-11 pr-3 py-2 md:py-2.5 text-sm md:text-base text-white bg-transparent placeholder-gray-400 focus:outline-none"
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
                          console.warn("🚫 Image failed to load for:", r.slug);
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
