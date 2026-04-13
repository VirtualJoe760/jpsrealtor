'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '@/app/contexts/ThemeContext';

// Fix Leaflet icon issue in Next.js
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import markerRetina from 'leaflet/dist/images/marker-icon-2x.png';

const PinIcon = L.icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerRetina.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface PinDropMapProps {
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  onChange: (location: { lat: number; lng: number; address?: string }) => void;
  height?: string;
  searchPlaceholder?: string;
}

/**
 * Manages the marker + circle imperatively so React doesn't fight Leaflet's DOM.
 * This avoids the "removeChild" crash when radius or position changes.
 */
function MapContent({
  lat,
  lng,
  radiusMiles,
  onMapClick,
  isLight,
}: {
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  onMapClick: (lat: number, lng: number) => void;
  isLight: boolean;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Handle map clicks
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  // Update marker + circle when lat/lng/radius change
  useEffect(() => {
    if (lat && lng) {
      const pos = L.latLng(lat, lng);

      // Marker
      if (markerRef.current) {
        markerRef.current.setLatLng(pos);
      } else {
        markerRef.current = L.marker(pos, { icon: PinIcon }).addTo(map);
      }

      // Circle
      const radiusMeters = (radiusMiles || 0) * 1609.34;
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
      } else if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }

      // Fly to the pin
      map.flyTo(pos, 13, { duration: 0.8 });
    } else {
      // No pin — remove marker and circle
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (circleRef.current) {
        map.removeLayer(circleRef.current);
        circleRef.current = null;
      }
    }
  }, [lat, lng, map, isLight]);

  // Update circle radius without re-creating it
  useEffect(() => {
    if (circleRef.current && radiusMiles) {
      circleRef.current.setRadius(radiusMiles * 1609.34);
    }
  }, [radiusMiles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) map.removeLayer(markerRef.current);
      if (circleRef.current) map.removeLayer(circleRef.current);
    };
  }, [map]);

  return null;
}

interface SearchResult {
  display_name: string;
  lat: number;
  lng: number;
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

      {/* Map — MapContainer mounts once, MapContent handles updates imperatively */}
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={defaultCenter}
          zoom={10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url={tileUrl}
          />
          <MapContent
            lat={lat}
            lng={lng}
            radiusMiles={radiusMiles}
            onMapClick={handleMapClick}
            isLight={isLight}
          />
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
