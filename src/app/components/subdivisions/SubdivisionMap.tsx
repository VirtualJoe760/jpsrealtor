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

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#2563eb";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.color = "white";
      el.style.fontSize = "12px";
      el.style.fontWeight = "bold";

      // Format price for display
      const priceLabel =
        listing.listPrice && listing.listPrice >= 1000000
          ? `$${(listing.listPrice / 1000000).toFixed(1)}M`
          : listing.listPrice && listing.listPrice >= 1000
          ? `$${Math.round(listing.listPrice / 1000)}k`
          : "";

      // Popup content
      const popupContent = `
        <div class="p-2">
          <div class="font-bold text-blue-600 mb-1">
            ${listing.listPrice ? `$${listing.listPrice.toLocaleString()}` : "N/A"}
          </div>
          <div class="text-sm text-gray-700 mb-1">${listing.address || "Address not available"}</div>
          ${
            listing.bedroomsTotal || listing.bathroomsTotalDecimal
              ? `<div class="text-xs text-gray-600">
                  ${listing.bedroomsTotal ? `${listing.bedroomsTotal} bed` : ""}
                  ${listing.bathroomsTotalDecimal ? `${listing.bathroomsTotalDecimal} bath` : ""}
                </div>`
              : ""
          }
        </div>
      `;

      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: false,
      }).setHTML(popupContent);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([listing.longitude, listing.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      // Click handler
      el.addEventListener("click", () => {
        if (onListingClick) {
          onListingClick(listing);
        }
      });

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
