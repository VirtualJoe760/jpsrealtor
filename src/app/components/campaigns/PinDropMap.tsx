'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '@/app/contexts/ThemeContext';

// Fix Leaflet icon issue in Next.js
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

const PinIcon = L.icon({
  iconUrl: icon.src,
  iconRetinaUrl: iconRetina.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = PinIcon;

interface PinDropMapProps {
  /** Current lat/lng (controlled) */
  lat?: number;
  lng?: number;
  /** Optional radius in miles to display */
  radiusMiles?: number;
  /** Callback when pin is placed or search result selected */
  onChange: (location: { lat: number; lng: number; address?: string }) => void;
  /** Map height */
  height?: string;
  /** Placeholder text for search */
  searchPlaceholder?: string;
}

/** Inner component to handle map click events */
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Inner component to fly to a location */
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 14, { duration: 1 });
    }
  }, [lat, lng, map]);
  return null;
}

interface SearchResult {
  display_name: string;
  lat: number;
  lng: number;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export default function PinDropMap({
  lat,
  lng,
  radiusMiles,
  onChange,
  height = '300px',
  searchPlaceholder = 'Search address or neighborhood...',
}: PinDropMapProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Default center: Coachella Valley
  const defaultCenter: [number, number] = [33.7225, -116.3738];
  const center: [number, number] = lat && lng ? [lat, lng] : defaultCenter;

  // Convert miles to meters for Leaflet circle
  const radiusMeters = radiusMiles ? radiusMiles * 1609.34 : undefined;

  const handleMapClick = useCallback(
    async (clickLat: number, clickLng: number) => {
      // Reverse geocode to get address
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickLat}&lon=${clickLng}&zoom=16&addressdetails=1`,
          { headers: { 'User-Agent': 'jpsrealtor.com' } }
        );
        const data = await res.json();
        onChange({
          lat: clickLat,
          lng: clickLng,
          address: data.display_name || undefined,
        });
      } catch {
        onChange({ lat: clickLat, lng: clickLng });
      }
    },
    [onChange]
  );

  // Debounced search using existing Nominatim proxy
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
              street: r.street,
              city: r.city,
              state: r.state,
              zip: r.zip,
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

  const handleResultSelect = (result: SearchResult) => {
    onChange({
      lat: result.lat,
      lng: result.lng,
      address: result.display_name,
    });
    setSearchQuery(result.display_name);
    setShowResults(false);
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

        {/* Search Results Dropdown */}
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
          center={center}
          zoom={lat && lng ? 14 : 10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url={tileUrl}
          />
          <MapClickHandler onMapClick={handleMapClick} />
          {lat && lng && <FlyTo lat={lat} lng={lng} />}
          {lat && lng && <Marker position={[lat, lng]} />}
          {lat && lng && radiusMeters && (
            <Circle
              center={[lat, lng]}
              radius={radiusMeters}
              pathOptions={{
                color: isLight ? '#3b82f6' : '#10b981',
                fillColor: isLight ? '#3b82f6' : '#10b981',
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Coordinates display */}
      {lat && lng && (
        <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
          {lat.toFixed(6)}, {lng.toFixed(6)}
          {radiusMiles && ` — ${radiusMiles} mile radius`}
        </p>
      )}
    </div>
  );
}
