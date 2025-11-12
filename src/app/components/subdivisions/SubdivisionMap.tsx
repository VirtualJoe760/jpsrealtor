"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Listing {
  listingId: string;
  latitude?: number;
  longitude?: number;
  listPrice?: number;
  address?: string;
  bedroomsTotal?: number;
  bathroomsTotalDecimal?: number;
  primaryPhotoUrl?: string;
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
}

export default function SubdivisionMap({
  subdivisionSlug,
  subdivision,
  onListingClick,
  height = "400px",
}: SubdivisionMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch listings for this subdivision
  useEffect(() => {
    async function fetchListings() {
      try {
        const response = await fetch(`/api/subdivisions/${subdivisionSlug}/listings?limit=50`);
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
    const center: [number, number] = subdivision.coordinates
      ? [subdivision.coordinates.longitude, subdivision.coordinates.latitude]
      : listings.length > 0 && listings[0].longitude && listings[0].latitude
      ? [listings[0].longitude, listings[0].latitude]
      : [-116.5453, 33.8303]; // Default: Palm Springs

    // Use CartoDB basemap (free, no API key required)
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      center,
      zoom: 13,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when listings change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Filter listings with valid coordinates
    const validListings = listings.filter(
      (l) => l.latitude && l.longitude
    );

    if (validListings.length === 0) return;

    // Add markers for each listing
    validListings.forEach((listing) => {
      if (!listing.latitude || !listing.longitude) return;

      // Create custom blue dot marker
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.width = "20px";
      el.style.height = "20px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#2563eb";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";

      // Build slug for navigation
      const listingSlug = listing.slug || "";

      // Enhanced popup content with photo and clickable link - smaller size
      const popupContent = `
        <a href="/mls-listings/${listingSlug}" class="block hover:opacity-90 transition-opacity rounded-lg overflow-hidden shadow-lg bg-white border border-gray-200">
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
                listing.bedroomsTotal !== undefined || listing.bathroomsTotalDecimal !== undefined
                  ? `<div class="flex gap-2.5 text-xs text-gray-600">
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
        maxZoom: 15,
      });
    } else if (validListings.length === 1) {
      const listing = validListings[0];
      if (listing.longitude && listing.latitude) {
        map.current.flyTo({
          center: [listing.longitude, listing.latitude],
          zoom: 14,
        });
      }
    }
  }, [listings, mapLoaded, onListingClick]);

  return (
    <div className="relative">
      <div
        ref={mapContainer}
        style={{ width: "100%", height }}
        className="rounded-lg overflow-hidden shadow-md"
      />
      {(!mapLoaded || loading) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">
              {loading ? "Loading listings..." : "Loading map..."}
            </p>
          </div>
        </div>
      )}
      {mapLoaded && !loading && listings.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80">
          <p className="text-gray-600">No listings to display on map</p>
        </div>
      )}
    </div>
  );
}
