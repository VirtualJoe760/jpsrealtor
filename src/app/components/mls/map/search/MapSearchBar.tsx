"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, Settings2 } from "lucide-react";
import type { MapListing } from "@/types/types";

type Props = {
  isOpen: boolean;
  onToggle: () => void;
  onSearch?: (lat: number, lng: number) => void;
  onToggleFilters: () => void;
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
      <div className="fixed top-16 z-40 w-full px-4 py-2 bg-zinc-950 text-white flex items-center justify-between shadow-sm border-b border-zinc-800 md:border-none">
        <button onClick={onToggleFilters} aria-label="Toggle Filters">
          <SlidersHorizontal className="w-6 h-6" />
        </button>

        <div className="relative flex-1 mx-2 max-w-[500px]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Address or cities in California..."
            className="w-full px-2 py-2 text-start text-white bg-transparent border-b border-emerald-500 placeholder-gray-400 focus:outline-none focus:ring-0 caret-transparent custom-caret"
          />

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

        <button onClick={onToggle} aria-label="Toggle Sidebar">
          <Settings2 className="w-6 h-6" />
        </button>
      </div>

      <style jsx global>{`
        .custom-caret {
          position: relative;
        }

        .custom-caret::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 0.5ch;
          transform: translateY(-50%);
          width: 3px;
          height: 1.25em;
          background-color: #10b981; /* emerald-500 */
          animation: blinkCaret 1.2s infinite;
          pointer-events: none;
        }

        @keyframes blinkCaret {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}
