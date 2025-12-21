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
  console.log('🌟🌟🌟 [MapSearchBar] COMPONENT MOUNTED!');

  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const { showMapAtLocation } = useMapControl();

  console.log('🔍 [MapSearchBar] Component rendered');

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isSelectionRef = useRef(false); // Track if query was set from selection

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
    // Skip autocomplete if query was set from a selection
    if (isSelectionRef.current) {
      isSelectionRef.current = false;
      return;
    }

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

          console.log('📋 [MapSearchBar] Setting suggestions:', transformed);
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
    }, 150);

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

  const handleSuggestionClick = async (suggestion: AutocompleteSuggestion) => {
    console.log('🗺️ [MapSearchBar] Suggestion clicked:', suggestion);

    // Mark as selection to prevent autocomplete from triggering
    isSelectionRef.current = true;

    setQuery(suggestion.name);
    setShowSuggestions(false);
    onSearch(suggestion.name);

    // If we have coordinates, call flyover API
    // Check for valid non-zero coordinates
    const hasValidCoords = suggestion.lat && suggestion.lng &&
                          suggestion.lat !== 0 && suggestion.lng !== 0;

    if (hasValidCoords) {
      console.log('🗺️ [MapSearchBar] Has coordinates, calling flyover API:', suggestion.name);

      try {
        const response = await fetch('/api/map/flyover', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: suggestion.name,
            type: suggestion.type,
            lat: suggestion.lat,
            lng: suggestion.lng,
            city: suggestion.city,
            state: suggestion.state,
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log('🗺️ [MapSearchBar] Flyover API success:', data.flyover);

          // Trigger map flyover animation using useMapControl hook
          showMapAtLocation(data.flyover.lat, data.flyover.lng, data.flyover.zoom);

          // Send location to AI for market insights
          console.log('🚀🚀🚀 [MapSearchBar] DISPATCHING requestLocationInsights EVENT', {
            locationName: suggestion.name,
            locationType: suggestion.type,
            city: suggestion.city,
            state: suggestion.state || 'CA',
          });

          window.dispatchEvent(new CustomEvent('requestLocationInsights', {
            detail: {
              locationName: suggestion.name,
              locationType: suggestion.type,
              city: suggestion.city,
              state: suggestion.state || 'CA',
            }
          }));

          console.log('✅ [MapSearchBar] Event dispatched!');
        } else {
          console.error('🗺️ [MapSearchBar] Flyover API error:', data.error);
        }
      } catch (error) {
        console.error('🗺️ [MapSearchBar] Failed to call flyover API:', error);
        // Fallback: still try to show map at location
        const zoomLevel = suggestion.type === 'subdivision' ? 13 :
                         suggestion.type === 'city' ? 11 :
                         suggestion.type === 'county' ? 9 : 12;
        showMapAtLocation(suggestion.lat, suggestion.lng, zoomLevel);
      }
    } else {
      console.warn('🗺️ [MapSearchBar] No valid coordinates, attempting geocoding fallback:', suggestion);

      // Fallback: Call dedicated geocoding API
      try {
        const geocodeQuery = suggestion.city
          ? `${suggestion.name}, ${suggestion.city}, CA`
          : `${suggestion.name}, CA`;

        console.log('🌍 [MapSearchBar] Geocoding query:', geocodeQuery);

        const geocodeResponse = await fetch(`/api/geocode?q=${encodeURIComponent(geocodeQuery)}`);
        const geocodeData = await geocodeResponse.json();

        if (geocodeData.success && geocodeData.result) {
          console.log('🌍 [MapSearchBar] Geocoding success:', geocodeData.result);

          const zoomLevel = suggestion.type === 'subdivision' ? 13 :
                           suggestion.type === 'city' ? 11 :
                           suggestion.type === 'county' ? 9 : 12;

          showMapAtLocation(geocodeData.result.latitude, geocodeData.result.longitude, zoomLevel);

          // Send location to AI for market insights
          console.log('🚀🚀🚀 [MapSearchBar] DISPATCHING requestLocationInsights EVENT', {
            locationName: suggestion.name,
            locationType: suggestion.type,
            city: suggestion.city || geocodeData.result.city,
            state: suggestion.state || 'CA',
          });

          window.dispatchEvent(new CustomEvent('requestLocationInsights', {
            detail: {
              locationName: suggestion.name,
              locationType: suggestion.type,
              city: suggestion.city || geocodeData.result.city,
              state: suggestion.state || 'CA',
            }
          }));

          console.log('✅ [MapSearchBar] Event dispatched!');
        } else {
          console.error('🌍 [MapSearchBar] Geocoding failed:', geocodeData.error);
        }
      } catch (error) {
        console.error('🌍 [MapSearchBar] Geocoding error:', error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      // If there are suggestions visible, select the first one
      if (showSuggestions && suggestions.length > 0) {
        console.log('🔍 [MapSearchBar] Enter pressed - selecting first suggestion:', suggestions[0].name);
        handleSuggestionClick(suggestions[0]);
      } else {
        // No suggestions, just do a basic search
        handleSearch(query);
      }
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
            className={`absolute bottom-full mb-2 left-0 right-0 rounded-xl shadow-2xl overflow-hidden pointer-events-auto ${
              isLight ? "bg-white border border-gray-300" : "bg-neutral-800 border border-neutral-700"
            }`}
            style={{ zIndex: 9999 }}
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onMouseDown={(e) => {
                  console.log('🖱️ [MapSearchBar] MOUSE DOWN EVENT!', suggestion.name);
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🖱️ [MapSearchBar] About to call handleSuggestionClick');
                  handleSuggestionClick(suggestion);
                }}
                onClick={(e) => {
                  console.log('🖱️ [MapSearchBar] CLICK EVENT ALSO FIRED!', suggestion.name);
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
