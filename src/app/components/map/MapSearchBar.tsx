"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Settings } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { useMapControl } from "@/app/hooks/useMapControl";

interface MapSearchBarProps {
  onSearch: (query: string) => void;
  onSettingsClick?: () => void;
  className?: string;
}

interface AutocompleteSuggestion {
  type: 'city' | 'subdivision' | 'county' | 'address';
  name: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
}

/**
 * MapSearchBar Component
 *
 * Dedicated search bar for map functionality:
 * - Shows autocomplete suggestions for cities, subdivisions, counties
 * - Navigates map to searched location (via URL bounds)
 * - Sends location context to AI for stats/insights
 * - No dual-purpose behavior - purely for map control
 */
export default function MapSearchBar({
  onSearch,
  onSettingsClick,
  className = "",
}: MapSearchBarProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const { showMapAtLocation } = useMapControl();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Click-outside detection to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        console.log('🖱️ [MapSearchBar] Click outside detected, closing dropdown');
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Debounce autocomplete requests
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);

        // Check if response is OK before parsing
        if (!response.ok) {
          console.error("Search API error:", response.status, response.statusText);
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }

        const data = await response.json();

        // Transform results to autocomplete suggestions format
        if (data.results && Array.isArray(data.results)) {
          const transformed = data.results
            .filter((r: any) => r.type !== 'ask_ai') // Filter out "Ask AI" option for map search
            .slice(0, 4) // Limit to 4 suggestions max
            .map((r: any) => ({
              type: r.type,
              name: r.label,
              city: r.city,
              state: r.state,
              lat: r.latitude,
              lng: r.longitude,
            }));

          setSuggestions(transformed);
          setShowSuggestions(transformed.length > 0);
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSearch = (searchQuery: string) => {
    setShowSuggestions(false);
    setQuery(searchQuery);
    onSearch(searchQuery);
  };

  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    console.log('🗺️ [MapSearchBar] Suggestion clicked:', suggestion);

    setQuery(suggestion.name);
    setShowSuggestions(false);
    onSearch(suggestion.name);

    // If we have coordinates, fly map to location
    if (suggestion.lat && suggestion.lng) {
      console.log('🗺️ [MapSearchBar] Has coordinates, flying to:', suggestion.name, { lat: suggestion.lat, lng: suggestion.lng });

      // Determine zoom level based on type
      const zoomLevel = suggestion.type === 'subdivision' ? 13 :
                       suggestion.type === 'city' ? 11 :
                       suggestion.type === 'county' ? 9 : 12;

      console.log('🗺️ [MapSearchBar] Calling showMapAtLocation with zoom:', zoomLevel);

      // Trigger map flyover animation using useMapControl hook
      showMapAtLocation(suggestion.lat, suggestion.lng, zoomLevel);
    } else {
      console.warn('🗺️ [MapSearchBar] No coordinates found for suggestion:', suggestion);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`fixed bottom-[92px] sm:bottom-4 left-4 right-4 z-50 md:left-1/2 md:-translate-x-1/2 md:max-w-3xl ${className}`}>
      <div className="relative">
        <div
          className={`relative rounded-2xl backdrop-blur-md shadow-2xl ${
            isLight ? "bg-white/90 border border-gray-300" : "bg-neutral-800/90 border border-neutral-700/50"
          }`}
          style={{
            backdropFilter: "blur(20px) saturate(150%)",
            WebkitBackdropFilter: "blur(20px) saturate(150%)",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              console.log('🎯 [MapSearchBar] Input focused');
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Search cities, neighborhoods, addresses..."
            autoComplete="off"
            className={`w-full px-6 py-4 pr-24 bg-transparent outline-none rounded-2xl text-base font-medium tracking-[-0.01em] ${
              isLight ? "text-gray-900 placeholder-gray-400" : "text-white placeholder-neutral-400"
            }`}
            style={{ fontSize: '16px' }} // Prevent iOS zoom on focus
          />

          {/* Settings Button */}
          {onSettingsClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSettingsClick();
              }}
              className={`absolute right-14 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                isLight
                  ? "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  : "text-neutral-500 hover:text-emerald-400 hover:bg-emerald-500/10"
              }`}
              aria-label="Map Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {/* Search Icon */}
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl ${
            isLight ? "text-gray-400" : "text-neutral-500"
          }`}>
            <Search className="w-5 h-5" />
          </div>
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            className={`absolute bottom-full mb-2 left-0 right-0 rounded-xl shadow-2xl overflow-hidden z-50 pointer-events-auto ${
              isLight ? "bg-white border border-gray-300" : "bg-neutral-800 border border-neutral-700"
            }`}
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onMouseDown={() => {
                  console.log('🖱️ [MapSearchBar] MOUSE DOWN - Handling suggestion click:', suggestion.name);
                  handleSuggestionClick(suggestion);
                }}
                className={`w-full px-6 py-3 text-left transition-colors cursor-pointer ${
                  isLight
                    ? "hover:bg-blue-50 text-gray-900"
                    : "hover:bg-neutral-700 text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`text-xs font-semibold uppercase ${
                    isLight ? "text-blue-600" : "text-emerald-400"
                  }`}>
                    {suggestion.type}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{suggestion.name}</div>
                    {suggestion.city && (
                      <div className={`text-sm ${isLight ? "text-gray-500" : "text-neutral-400"}`}>
                        {suggestion.city}{suggestion.state && `, ${suggestion.state}`}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
