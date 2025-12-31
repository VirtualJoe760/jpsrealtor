"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@/app/contexts/ThemeContext";

interface Listing {
  listingKey: string;
  slugAddress?: string;
  latitude?: number;
  longitude?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  listPrice?: number;
  address?: string;
  beds?: number;
  baths?: number;
  photoUrl?: string;
  propertyType?: string;
  propertySubType?: string;
}

interface CityMapProps {
  cityId: string;
  cityName: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  onListingClick?: (listing: Listing) => void;
  height?: string;
}

export default function CityMap({
  cityId,
  cityName,
  coordinates,
  onListingClick,
  height = "500px",
}: CityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<"all" | "sale" | "rental" | "multifamily" | "land">("sale");
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [mapStyle, setMapStyle] = useState<"dark" | "light">(isLight ? "light" : "dark");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filter states
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minBeds, setMinBeds] = useState<string>("");
  const [maxBeds, setMaxBeds] = useState<string>("");
  const [minBaths, setMinBaths] = useState<string>("");
  const [maxBaths, setMaxBaths] = useState<string>("");

  // Fetch listings for this city - deferred and limited for performance
  useEffect(() => {
    // Defer map listings by 300ms to prioritize page render
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          limit: "100", // Reduced from 200 for faster loading
          propertyType: propertyTypeFilter,
        });

        if (minPrice) params.append("minPrice", minPrice);
        if (maxPrice) params.append("maxPrice", maxPrice);
        if (minBeds) params.append("minBeds", minBeds);
        if (maxBeds) params.append("maxBeds", maxBeds);
        if (minBaths) params.append("minBaths", minBaths);
        if (maxBaths) params.append("maxBaths", maxBaths);

        const response = await fetch(`/api/cities/${cityId}/listings?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setListings(data.listings || []);
        }
      } catch (error) {
        console.error("Error fetching listings for map:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [cityId, propertyTypeFilter, minPrice, maxPrice, minBeds, maxBeds, minBaths, maxBaths]);

  const handleFilterClear = () => {
    setMinPrice("");
    setMaxPrice("");
    setMinBeds("");
    setMaxBeds("");
    setMinBaths("");
    setMaxBaths("");
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Default center (use city coordinates or first listing)
    let center: [number, number];
    if (coordinates) {
      center = [coordinates.longitude, coordinates.latitude];
    } else if (listings.length > 0 && listings[0]?.longitude && listings[0]?.latitude) {
      center = [listings[0].longitude, listings[0].latitude];
    } else {
      center = [-116.5453, 33.8303]; // Default: Palm Springs
    }

    // Use CartoDB basemap - dark mode by default
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle === "dark"
        ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center,
      zoom: 12,
      minZoom: 8,  // Prevent zooming out too far (protects against data errors)
      maxZoom: 18, // Prevent zooming in too close
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [coordinates, listings]);

  // Sync map style with global theme
  useEffect(() => {
    const newMapStyle = isLight ? "light" : "dark";
    if (newMapStyle !== mapStyle) {
      setMapStyle(newMapStyle);
    }
  }, [isLight, mapStyle]);

  // Handle map style changes without recreating the map
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const newStyle = mapStyle === "dark"
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";

    map.current.setStyle(newStyle);
  }, [mapStyle, mapLoaded]);

  // Update markers when listings change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Helper function to determine if listing is a rental
    const isRental = (listing: Listing) => {
      return listing.propertyType === "B";
    };

    // Helper function to get coordinates from listing
    const getCoordinates = (listing: Listing): { lat: number; lng: number } | null => {
      if (listing.coordinates?.latitude && listing.coordinates?.longitude) {
        return { lat: listing.coordinates.latitude, lng: listing.coordinates.longitude };
      }
      if (listing.latitude && listing.longitude) {
        return { lat: listing.latitude, lng: listing.longitude };
      }
      return null;
    };

    // Filter listings with valid coordinates
    const validListings = listings.filter(l => getCoordinates(l) !== null);

    if (validListings.length === 0) return;

    // Add markers for each listing
    validListings.forEach((listing) => {
      const coords = getCoordinates(listing);
      if (!coords) return;

      // Determine marker color based on property type
      const rental = isRental(listing);
      const markerColor = rental ? "#9333ea" : "#10b981"; // purple for rental, green for sale

      // Create custom dot marker
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = markerColor;
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";

      // Build slug for navigation
      const listingSlug = listing.slugAddress || listing.listingKey;

      // Create popup content matching SubdivisionMap style
      const popupContent = `
        <a href="/mls-listings/${listingSlug}" class="block hover:opacity-90 transition-opacity rounded-lg overflow-hidden shadow-lg bg-white">
          <div class="w-[220px]">
            ${
              listing.photoUrl
                ? `<div class="relative h-32">
                    <img
                      src="${listing.photoUrl}"
                      alt="Property"
                      class="w-full h-full object-cover"
                    />
                  </div>`
                : `<div class="relative h-32 bg-gray-200 flex items-center justify-center">
                    <svg class="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>`
            }
            <div class="px-2.5 py-2.5">
              <div class="text-lg font-bold text-blue-600 mb-1.5">
                ${listing.listPrice ? `$${listing.listPrice.toLocaleString()}` : "Price N/A"}
              </div>
              <div class="text-xs text-gray-700 mb-1.5 font-medium leading-tight">
                ${listing.address || "Address not available"}
              </div>
              ${
                (listing.beds ?? listing.bedsTotal ?? listing.bedroomsTotal) !== undefined || (listing.baths ?? listing.bathsTotal ?? listing.bathroomsTotalInteger ?? listing.bathroomsFull) !== undefined
                  ? `<div class="flex gap-2.5 text-xs text-gray-600">
                      ${
                        (listing.beds ?? listing.bedsTotal ?? listing.bedroomsTotal) !== undefined && (listing.beds ?? listing.bedsTotal ?? listing.bedroomsTotal) !== null
                          ? `<div class="flex items-center gap-1">
                              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                              </svg>
                              <span>${listing.beds ?? listing.bedsTotal ?? listing.bedroomsTotal ?? 0}bd</span>
                            </div>`
                          : ""
                      }
                      ${
                        (listing.baths ?? listing.bathsTotal ?? listing.bathroomsTotalInteger ?? listing.bathroomsFull) !== undefined && (listing.baths ?? listing.bathsTotal ?? listing.bathroomsTotalInteger ?? listing.bathroomsFull) !== null
                          ? `<div class="flex items-center gap-1">
                              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5.586l-2.293-2.293A1 1 0 0014.586 7H14z"/>
                              </svg>
                              <span>${listing.baths ?? listing.bathsTotal ?? listing.bathroomsTotalInteger ?? listing.bathroomsFull ?? 0}ba</span>
                            </div>`
                          : ""
                      }
                    </div>`
                  : ""
              }
              ${rental ? '<div class="inline-block bg-purple-600 text-white px-2 py-1 rounded text-xs font-semibold mt-1.5">FOR RENT</div>' : ''}
            </div>
          </div>
        </a>
      `;

      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true,
        maxWidth: "240px",
        className: "listing-popup",
        anchor: "bottom",
      }).setHTML(popupContent);

      // Style close button and popup
      popup.on('open', () => {
        // Get the popup element from the popup instance
        const popupElement = popup.getElement();
        if (!popupElement) return;

        const popupEl = popupElement.querySelector('.maplibregl-popup-content');
        const closeBtn = popupElement.querySelector('.maplibregl-popup-close-button');

        if (popupEl) {
          (popupEl as HTMLElement).style.padding = '0';
          (popupEl as HTMLElement).style.borderRadius = '0.5rem';
          (popupEl as HTMLElement).style.overflow = 'hidden';
          (popupEl as HTMLElement).style.border = 'none';
          (popupEl as HTMLElement).style.boxShadow = 'none';
        }

        if (closeBtn) {
          (closeBtn as HTMLElement).style.position = 'absolute';
          (closeBtn as HTMLElement).style.top = '8px';
          (closeBtn as HTMLElement).style.right = '8px';
          (closeBtn as HTMLElement).style.fontSize = '24px';
          (closeBtn as HTMLElement).style.fontWeight = 'bold';
          (closeBtn as HTMLElement).style.color = 'white';
          (closeBtn as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          (closeBtn as HTMLElement).style.borderRadius = '50%';
          (closeBtn as HTMLElement).style.width = '28px';
          (closeBtn as HTMLElement).style.height = '28px';
          (closeBtn as HTMLElement).style.display = 'flex';
          (closeBtn as HTMLElement).style.alignItems = 'center';
          (closeBtn as HTMLElement).style.justifyContent = 'center';
          (closeBtn as HTMLElement).style.cursor = 'pointer';
          (closeBtn as HTMLElement).style.zIndex = '100';
          (closeBtn as HTMLElement).style.lineHeight = '1';
          (closeBtn as HTMLElement).style.padding = '0';
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);

      // Optional: Handle listing click
      if (onListingClick) {
        el.addEventListener("click", () => {
          onListingClick(listing);
        });
      }
    });

    // Fit map bounds to show all markers
    if (validListings.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      validListings.forEach((listing) => {
        const coords = getCoordinates(listing);
        if (coords) {
          bounds.extend([coords.lng, coords.lat]);
        }
      });
      map.current.fitBounds(bounds, {
        padding: 50,
        minZoom: 8,  // Prevent zooming out beyond this level
        maxZoom: 15,
      });
    } else if (validListings.length === 1 && validListings[0]) {
      const coords = getCoordinates(validListings[0]);
      if (coords) {
        map.current.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 14,
        });
      }
    }
  }, [listings, mapLoaded, onListingClick]);

  return (
    <div className="space-y-4">
      {/* Filter Accordion */}
      <div className={`backdrop-blur-sm rounded-lg overflow-hidden border ${
        isLight
          ? 'bg-white/90 border-gray-300'
          : 'bg-gray-800/70 border-gray-700'
      }`}>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`w-full flex items-center justify-between p-4 transition-colors ${
            isLight
              ? 'hover:bg-gray-100'
              : 'hover:bg-gray-700/70'
          }`}
        >
          <h3 className={`font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>Advanced Filters</h3>
          <svg
            className={`w-5 h-5 transition-transform ${filtersOpen ? 'rotate-180' : ''} ${
              isLight ? 'text-gray-600' : 'text-gray-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {filtersOpen && (
          <div className="p-4 pt-0 space-y-3">
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleFilterClear}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  isLight
                    ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                Clear Filters
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Price */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isLight ? 'text-gray-700' : 'text-gray-400'
                }`}>Min Price</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    isLight
                      ? 'bg-white border border-gray-300 text-gray-900'
                      : 'bg-gray-700 border border-gray-600 text-white'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isLight ? 'text-gray-700' : 'text-gray-400'
                }`}>Max Price</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    isLight
                      ? 'bg-white border border-gray-300 text-gray-900'
                      : 'bg-gray-700 border border-gray-600 text-white'
                  }`}
                />
              </div>
              {/* Beds */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isLight ? 'text-gray-700' : 'text-gray-400'
                }`}>Min Beds</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={minBeds}
                  onChange={(e) => setMinBeds(e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    isLight
                      ? 'bg-white border border-gray-300 text-gray-900'
                      : 'bg-gray-700 border border-gray-600 text-white'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isLight ? 'text-gray-700' : 'text-gray-400'
                }`}>Max Beds</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={maxBeds}
                  onChange={(e) => setMaxBeds(e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    isLight
                      ? 'bg-white border border-gray-300 text-gray-900'
                      : 'bg-gray-700 border border-gray-600 text-white'
                  }`}
                />
              </div>
              {/* Baths */}
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isLight ? 'text-gray-700' : 'text-gray-400'
                }`}>Min Baths</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={minBaths}
                  onChange={(e) => setMinBaths(e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    isLight
                      ? 'bg-white border border-gray-300 text-gray-900'
                      : 'bg-gray-700 border border-gray-600 text-white'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${
                  isLight ? 'text-gray-700' : 'text-gray-400'
                }`}>Max Baths</label>
                <input
                  type="number"
                  placeholder="Any"
                  value={maxBaths}
                  onChange={(e) => setMaxBaths(e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    isLight
                      ? 'bg-white border border-gray-300 text-gray-900'
                      : 'bg-gray-700 border border-gray-600 text-white'
                  }`}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Container with Controls */}
      <div className="relative">
        <div
          ref={mapContainer}
          style={{
            width: "100%",
            height,
            borderRadius: "12px",
            overflow: "hidden",
            touchAction: "pan-x pan-y" // Disable pinch-to-zoom on mobile, allow panning
          }}
          className={`shadow-xl border ${isLight ? 'border-gray-300' : 'border-gray-700'}`}
        />

        {/* Map Style Controls - Right Side (vertically centered) */}
        <div className={`absolute top-1/2 -translate-y-1/2 right-4 z-10 flex flex-col gap-2 backdrop-blur-md rounded-xl border shadow-lg overflow-hidden ${
          isLight
            ? 'bg-white/95 border-gray-300'
            : 'bg-black/85 border-gray-700'
        }`}>
          <button
            onClick={() => setMapStyle("light")}
            className={`px-3 py-2.5 text-sm font-semibold transition-all flex items-center justify-center ${
              mapStyle === "light"
                ? isLight
                  ? "bg-yellow-100 text-gray-900 shadow-md border-b border-yellow-300"
                  : "bg-white text-gray-900 shadow-md"
                : isLight
                  ? "bg-transparent text-gray-700 hover:bg-gray-100"
                  : "bg-transparent text-gray-300 hover:bg-gray-800"
            }`}
            title="Light Map"
          >
            <span className="text-lg">☀️</span>
          </button>
          <button
            onClick={() => setMapStyle("dark")}
            className={`px-3 py-2.5 text-sm font-semibold transition-all flex items-center justify-center ${
              mapStyle === "dark"
                ? isLight
                  ? "bg-gray-800 text-white shadow-md"
                  : "bg-gray-700 text-white shadow-md"
                : isLight
                  ? "bg-transparent text-gray-700 hover:bg-gray-100"
                  : "bg-transparent text-gray-300 hover:bg-gray-800"
            }`}
            title="Dark Map"
          >
            <span className="text-lg">🌙</span>
          </button>
        </div>

        {/* Property Type Filters - Bottom of Map */}
        <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 backdrop-blur-md rounded-xl border shadow-2xl p-2 ${
          isLight
            ? 'bg-white/95 border-gray-300'
            : 'bg-black/85 border-gray-700'
        }`}>
          <button
            onClick={() => setPropertyTypeFilter("sale")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              propertyTypeFilter === "sale"
                ? "bg-emerald-500 text-white shadow-lg"
                : isLight
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            For Sale
          </button>
          <button
            onClick={() => setPropertyTypeFilter("rental")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              propertyTypeFilter === "rental"
                ? "bg-purple-500 text-white shadow-lg"
                : isLight
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            For Rent
          </button>
          <button
            onClick={() => setPropertyTypeFilter("multifamily")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              propertyTypeFilter === "multifamily"
                ? "bg-amber-500 text-white shadow-lg"
                : isLight
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Multifamily
          </button>
          <button
            onClick={() => setPropertyTypeFilter("land")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              propertyTypeFilter === "land"
                ? "bg-green-600 text-white shadow-lg"
                : isLight
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            Land
          </button>
          <button
            onClick={() => setPropertyTypeFilter("all")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
              propertyTypeFilter === "all"
                ? "bg-blue-500 text-white shadow-lg"
                : isLight
                  ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            All
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg">
            <div className="text-white">Loading map...</div>
          </div>
        )}
      </div>

      {/* Listing Count and View All Button */}
      <div className="flex items-center justify-between">
        <div className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-400'}`}>
          Showing {listings.filter(l => {
            const coords = l.coordinates?.latitude && l.coordinates?.longitude ? l.coordinates : (l.latitude && l.longitude ? l : null);
            return coords !== null;
          }).length} {propertyTypeFilter === "all" ? "properties" : propertyTypeFilter === "rental" ? "rentals" : "properties for sale"} in {cityName}
        </div>
        <Link
          href="/mls-listings"
          className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          View All Listings →
        </Link>
      </div>
    </div>
  );
}
