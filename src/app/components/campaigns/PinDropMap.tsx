'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '@/app/contexts/ThemeContext';

// Leaflet marker icons via CDN (avoids Next.js static import issues with dynamic imports)
const PinIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface PinDropMapProps {
  /** Initial radius in miles (updates handled internally via parent re-render are safe since map doesn't remount) */
  radiusMiles?: number;
  /** Called when user clicks the map or selects a search result */
  onChange: (location: { lat: number; lng: number; address?: string }) => void;
  height?: string;
  searchPlaceholder?: string;
}

/**
 * Imperative map content — manages marker + circle via Leaflet API directly.
 * Never causes React to touch Leaflet's DOM nodes.
 */
function MapContent({
  onLocationChange,
  radiusMilesRef,
  isLight,
}: {
  onLocationChange: (lat: number, lng: number, address?: string) => void;
  radiusMilesRef: React.MutableRefObject<number>;
  isLight: boolean;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const placePin = useCallback((lat: number, lng: number) => {
    const pos = L.latLng(lat, lng);

    // Marker
    if (markerRef.current) {
      markerRef.current.setLatLng(pos);
    } else {
      markerRef.current = L.marker(pos, { icon: PinIcon }).addTo(map);
    }

    // Circle
    const radiusMeters = radiusMilesRef.current * 1609.34;
    if (radiusMeters > 0) {
      if (circleRef.current) {
        circleRef.current.setLatLng(pos);
        circleRef.current.setRadius(radiusMeters);
      } else {
        circleRef.current = L.circle(pos, {
          radius: radiusMeters,
          color: isLight ? '#3b82f6' : '#10b981',
          fillColor: isLight ? '#3b82f6' : '#10b981',
          fillOpacity: 0.1,
          weight: 2,
        }).addTo(map);
      }
    }

    map.flyTo(pos, 13, { duration: 0.8 });
  }, [map, isLight, radiusMilesRef]);

  // Handle map clicks — reverse geocode then place pin
  // Right-click to drop pin (prevents accidental drops while panning)
  useMapEvents({
    contextmenu(e) {
      const { lat, lng } = e.latlng;
      placePin(lat, lng);

      // Reverse geocode in background
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
        { headers: { 'User-Agent': 'jpsrealtor.com' } }
      )
        .then((res) => res.json())
        .then((data) => {
          onLocationChange(lat, lng, data.display_name || undefined);
        })
        .catch(() => {
          onLocationChange(lat, lng);
        });
    },
  });

  // Expose placePin so parent can call it (for search results)
  useEffect(() => {
    (map as any)._pinDropPlacePin = placePin;
  }, [map, placePin]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) { try { map.removeLayer(markerRef.current); } catch {} }
      if (circleRef.current) { try { map.removeLayer(circleRef.current); } catch {} }
    };
  }, [map]);

  return null;
}

/**
 * Updates circle radius without touching the marker or causing remounts.
 */
function RadiusUpdater({ radiusMiles }: { radiusMiles: number }) {
  const map = useMap();

  useEffect(() => {
    // Find our circle layer and update its radius
    map.eachLayer((layer) => {
      if (layer instanceof L.Circle) {
        layer.setRadius(radiusMiles * 1609.34);
      }
    });
  }, [radiusMiles, map]);

  return null;
}

interface SearchResult {
  display_name: string;
  lat: number;
  lng: number;
}

function PinDropMapInner({
  radiusMiles = 10,
  onChange,
  height = '300px',
  searchPlaceholder = 'Search address or neighborhood...',
}: PinDropMapProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Internal pin state (not passed to parent — avoids re-render loop)
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const radiusMilesRef = useRef(radiusMiles);

  // Keep ref in sync
  radiusMilesRef.current = radiusMiles;

  // Stable callback ref to avoid re-renders
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleLocationChange = useCallback((lat: number, lng: number, address?: string) => {
    setPinLocation({ lat, lng, address });
    onChangeRef.current({ lat, lng, address });
  }, []);

  // Handle search result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    setSearchQuery(result.display_name);
    setShowResults(false);

    // Place pin via the map's imperative API
    if (mapRef.current) {
      const placePin = (mapRef.current as any)._pinDropPlacePin;
      if (placePin) {
        placePin(result.lat, result.lng);
      }
    }
    handleLocationChange(result.lat, result.lng, result.display_name);
  }, [handleLocationChange]);

  // Debounced search
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geo/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results) {
          setSearchResults(
            data.results.map((r: any) => ({
              display_name: [r.street, r.city, r.state, r.zip].filter(Boolean).join(', '),
              lat: r.lat,
              lng: r.lng,
            }))
          );
          setShowResults(true);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // Close results on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const tileUrl = isLight
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  // Default center: Coachella Valley
  const defaultCenter: [number, number] = [33.7225, -116.3738];

  return (
    <div className="space-y-2">
      {/* Search Bar */}
      <div className="relative" ref={resultsRef}>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder={searchPlaceholder}
            className={`w-full px-3 py-2 pr-10 rounded-lg border ${
              isLight
                ? 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                : 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
            }`}
          />
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
        </div>

        {showResults && searchResults.length > 0 && (
          <div
            className={`absolute z-[1000] w-full mt-1 rounded-lg shadow-lg max-h-48 overflow-y-auto ${
              isLight ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-600'
            }`}
          >
            {searchResults.map((result, i) => (
              <button
                key={i}
                onClick={() => handleResultSelect(result)}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  isLight
                    ? 'hover:bg-blue-50 text-gray-700'
                    : 'hover:bg-gray-700 text-gray-300'
                } ${i > 0 ? (isLight ? 'border-t border-gray-100' : 'border-t border-gray-700') : ''}`}
              >
                {result.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={defaultCenter}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url={tileUrl}
          />
          <MapContent
            onLocationChange={handleLocationChange}
            radiusMilesRef={radiusMilesRef}
            isLight={isLight}
          />
          <RadiusUpdater radiusMiles={radiusMiles} />
        </MapContainer>
      </div>

      {/* Info line */}
      {pinLocation && (
        <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          {pinLocation.lat.toFixed(6)}, {pinLocation.lng.toFixed(6)} — {radiusMiles} mile radius
          {pinLocation.address && (
            <span className={`block ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
              {pinLocation.address}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

// Memoize to prevent parent re-renders from remounting the map
const PinDropMap = memo(PinDropMapInner);
export default PinDropMap;
