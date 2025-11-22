"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@/app/contexts/ThemeContext";

interface Listing {
  listingId: string;
  slug?: string;
  latitude?: number;
  longitude?: number;
  listPrice?: number;
  address?: string;
  bedroomsTotal?: number;
  bathroomsTotalDecimal?: number;
  primaryPhotoUrl?: string;
  propertyType?: string;
  propertySubType?: string;
}

interface Subdivision {
  name: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface SubdivisionMapProps {
  subdivisionSlug: string;
  subdivision: Subdivision;
  onListingClick?: (listing: Listing) => void;
  height?: string;
  propertyTypeFilter?: "all" | "sale" | "rental";
}

export default function SubdivisionMap({
  subdivisionSlug,
  subdivision,
  onListingClick,
  height = "400px",
  propertyTypeFilter: externalPropertyTypeFilter,
}: SubdivisionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<"all" | "sale" | "rental">(externalPropertyTypeFilter || "all");
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [mapTheme, setMapTheme] = useState<"dark" | "light">(isLight ? "light" : "dark");

  // Fetch listings for this subdivision
  useEffect(() => {
    async function fetchListings() {
      try {
        const response = await fetch(`/api/subdivisions/${subdivisionSlug}/listings?limit=100`);
        if (response.ok) {
          const data = await response.json();
          setListings(data.listings || []);
        }
      } catch (error) {
        console.error("Error fetching listings for map:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [subdivisionSlug]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Default center (use subdivision coordinates or first listing)
    let center: [number, number];
    if (subdivision.coordinates) {
      center = [subdivision.coordinates.longitude, subdivision.coordinates.latitude];
    } else if (listings.length > 0 && listings[0]?.longitude && listings[0]?.latitude) {
      center = [listings[0].longitude, listings[0].latitude];
    } else {
      center = [-116.5453, 33.8303]; // Default: Palm Springs
    }

    // Use CartoDB basemap (free, no API key required) - adapt to theme
    const mapStyle = mapTheme === "dark"
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center,
      zoom: 13,
      minZoom: 8,  // Prevent zooming out too far (protects against data errors)
      maxZoom: 18, // Prevent zooming in too close
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapTheme]);

  // Update map style when theme changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const mapStyle = mapTheme === "dark"
      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

    map.current.setStyle(mapStyle);
  }, [mapTheme, mapLoaded]);

  // Update markers when listings change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Helper function to determine if listing is a rental
    // PropertyType codes: A = Residential (Sale), B = Residential Lease (Rental), C = Multi-Family
    const isRental = (listing: Listing) => {
      return listing.propertyType === "B";
    };

    // Filter listings with valid coordinates
    let validListings = listings.filter(
      (l) => l.latitude && l.longitude
    );

    // Apply property type filter
    if (propertyTypeFilter === "sale") {
      validListings = validListings.filter(l => !isRental(l));
    } else if (propertyTypeFilter === "rental") {
      validListings = validListings.filter(l => isRental(l));
    }

    if (validListings.length === 0) return;

    // Add markers for each listing
    validListings.forEach((listing) => {
      if (!listing.latitude || !listing.longitude) return;

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
      const listingSlug = listing.slug || "";

      // Enhanced popup content with photo and clickable link - smaller size - DARK MODE
      const popupContent = `
        <a href="/mls-listings/${listingSlug}" class="block hover:opacity-90 transition-opacity rounded-lg overflow-hidden shadow-lg bg-gray-900 border border-gray-700">
          <div class="w-[220px]">
            ${
              listing.primaryPhotoUrl
                ? `<div class="relative h-32">
                    <img
                      src="${listing.primaryPhotoUrl}"
                      alt="Property"
                      class="w-full h-full object-cover"
                    />
                  </div>`
                : `<div class="relative h-32 bg-gray-800 flex items-center justify-center">
                    <svg class="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>`
            }
            <div class="px-2.5 py-2.5">
              <div class="text-lg font-bold text-blue-400 mb-1.5">
                ${listing.listPrice ? `$${listing.listPrice.toLocaleString()}` : "Price N/A"}
              </div>
              <div class="text-xs text-gray-300 mb-1.5 font-medium leading-tight">
                ${listing.address || "Address not available"}
              </div>
              ${
                listing.bedroomsTotal !== undefined || listing.bathroomsTotalDecimal !== undefined
                  ? `<div class="flex gap-2.5 text-xs text-gray-400">
                      ${
                        listing.bedroomsTotal !== undefined && listing.bedroomsTotal !== null
                          ? `<div class="flex items-center gap-1">
                              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                              </svg>
                              <span>${listing.bedroomsTotal}bd</span>
                            </div>`
                          : ""
                      }
                      ${
                        listing.bathroomsTotalDecimal !== undefined && listing.bathroomsTotalDecimal !== null
                          ? `<div class="flex items-center gap-1">
                              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5.586l-2.293-2.293A1 1 0 0014.586 7H14z"/>
                              </svg>
                              <span>${listing.bathroomsTotalDecimal}ba</span>
                            </div>`
                          : ""
                      }
                    </div>`
                  : ""
              }
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
        const popupEl = document.querySelector('.maplibregl-popup-content');
        const closeBtn = document.querySelector('.maplibregl-popup-close-button');

        if (popupEl) {
          (popupEl as HTMLElement).style.padding = '0';
          (popupEl as HTMLElement).style.borderRadius = '0.5rem';
          (popupEl as HTMLElement).style.overflow = 'hidden';
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
        .setLngLat([listing.longitude, listing.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    if (validListings.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      validListings.forEach((listing) => {
        if (listing.longitude && listing.latitude) {
          bounds.extend([listing.longitude, listing.latitude]);
        }
      });
      map.current.fitBounds(bounds, {
        padding: 50,
        minZoom: 8,  // Prevent zooming out beyond this level
        maxZoom: 15,
      });
    } else if (validListings.length === 1) {
      const listing = validListings[0];
      if (listing && listing.longitude && listing.latitude) {
        map.current.flyTo({
          center: [listing.longitude, listing.latitude],
          zoom: 14,
        });
      }
    }
  }, [listings, mapLoaded, onListingClick, propertyTypeFilter]);

  return (
    <div className="space-y-4">
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
            onClick={() => setMapTheme("light")}
            className={`px-3 py-2.5 text-sm font-semibold transition-all flex items-center justify-center ${
              mapTheme === "light"
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
            onClick={() => setMapTheme("dark")}
            className={`px-3 py-2.5 text-sm font-semibold transition-all flex items-center justify-center ${
              mapTheme === "dark"
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
        {(!mapLoaded || loading) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 rounded-lg">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
              <p className="text-sm text-gray-300">
                {loading ? "Loading listings..." : "Loading map..."}
              </p>
            </div>
          </div>
        )}

        {/* No Listings State */}
        {mapLoaded && !loading && listings.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
            <p className="text-gray-300">No listings to display on map</p>
          </div>
        )}
      </div>
    </div>
  );
}
