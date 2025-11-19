// src/app/components/chat/ChatMapView.tsx
// Simplified map view for displaying chat search results

"use client";

import { useState, useRef, useCallback } from "react";
import Map, { Marker } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapListing } from "@/types/types";
import { Home } from "lucide-react";
import Image from "next/image";

interface ChatMapViewProps {
  listings: any[]; // Chat listings format
  onSelectListing?: (listing: any) => void;
}

// Convert chat listing format to MapListing format
function toMapListing(listing: any): MapListing {
  return {
    _id: listing._id || listing.id || "",
    listingId: listing.id || "",
    listingKey: listing.id || "",
    latitude: listing.latitude || 0,
    longitude: listing.longitude || 0,
    listPrice: listing.price || 0,
    address: listing.address || "",
    primaryPhotoUrl: listing.image || "",
    bedsTotal: listing.beds || 0,
    bathroomsTotalInteger: listing.baths || 0,
    livingArea: listing.sqft || 0,
    city: listing.city || "",
    unparsedAddress: listing.address || "",
    subdivisionName: listing.subdivision,
    propertyType: "A", // Default to residential
    mlsSource: "GPS",
    slugAddress: listing.slug || listing.slugAddress || "",
  };
}

function formatPrice(price?: number): string {
  if (!price) return "—";
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}k`;
  return `$${price}`;
}

function getMarkerColors(hovered?: boolean, selected?: boolean) {
  if (selected) {
    return "bg-cyan-400 text-black border-2 border-white scale-125 z-[100] ring-2 ring-black shadow-lg";
  }
  if (hovered) {
    return "bg-emerald-400 text-black scale-110 z-40 border-2 border-white shadow-md";
  }
  return "bg-emerald-600 text-white scale-100 z-30 border border-emerald-700 shadow-sm";
}

// Try multiple env variable names for MapTiler key
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ||
                     process.env.NEXT_PUBLIC_MAPTILER_API_KEY ||
                     "";

const MAPTILER_STYLE = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"; // Better fallback with actual tiles

export default function ChatMapView({ listings, onSelectListing }: ChatMapViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  // Log map configuration
  console.log('🗺️ ChatMapView config:', {
    hasMaptilerKey: !!MAPTILER_KEY,
    styleUrl: MAPTILER_STYLE,
    listingsCount: listings.length
  });

  // Calculate map center from listings
  const mapListings = listings.map(toMapListing);
  const validListings = mapListings.filter(l => l.latitude && l.longitude);

  if (validListings.length === 0) {
    return (
      <div className="w-full h-[400px] bg-neutral-800 rounded-lg flex items-center justify-center">
        <p className="text-neutral-400">No location data available for these listings</p>
      </div>
    );
  }

  // Calculate bounds to fit all listings
  const lats = validListings.map(l => l.latitude);
  const lngs = validListings.map(l => l.longitude);

  const bounds = {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };

  // Add 10% padding so markers aren't on the edge
  const latPadding = (bounds.north - bounds.south) * 0.15 || 0.01; // Fallback for single point
  const lngPadding = (bounds.east - bounds.west) * 0.15 || 0.01;

  const paddedBounds = {
    north: bounds.north + latPadding,
    south: bounds.south - latPadding,
    east: bounds.east + lngPadding,
    west: bounds.west - lngPadding
  };

  // Calculate center from bounds
  const centerLat = (paddedBounds.north + paddedBounds.south) / 2;
  const centerLng = (paddedBounds.east + paddedBounds.west) / 2;

  // Calculate zoom level to fit bounds
  // This is approximate - MapLibre will adjust on fitBounds
  const latDiff = paddedBounds.north - paddedBounds.south;
  const lngDiff = paddedBounds.east - paddedBounds.west;
  const maxDiff = Math.max(latDiff, lngDiff);

  // Zoom formula: smaller diff = higher zoom
  let zoom = 12;
  if (maxDiff < 0.01) zoom = 15;
  else if (maxDiff < 0.05) zoom = 13;
  else if (maxDiff < 0.1) zoom = 12;
  else if (maxDiff < 0.5) zoom = 10;
  else if (maxDiff < 1) zoom = 9;
  else zoom = 8;

  const handleMarkerClick = useCallback((listing: any, mapListing: MapListing) => {
    setSelectedListing(listing);
    if (onSelectListing) {
      onSelectListing(listing);
    }
  }, [onSelectListing]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-neutral-700">
      {mapError && (
        <div className="absolute inset-0 bg-neutral-900/90 flex items-center justify-center z-50">
          <p className="text-red-400">Map Error: {mapError}</p>
        </div>
      )}
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: centerLat,
          longitude: centerLng,
          zoom: zoom,
        }}
        mapStyle={MAPTILER_STYLE}
        mapLib={import("maplibre-gl")}
        style={{ width: "100%", height: "100%" }}
        onError={(e) => {
          console.error('🗺️ Map error:', e);
          setMapError(e.error?.message || 'Failed to load map');
        }}
        onLoad={() => {
          console.log('🗺️ Map loaded successfully with bounds:', {
            bounds: paddedBounds,
            zoom,
            center: { lat: centerLat, lng: centerLng }
          });
        }}
      >
        {/* Render markers for each listing */}
        {listings.map((listing, index) => {
          const mapListing = toMapListing(listing);
          if (!mapListing.latitude || !mapListing.longitude) return null;

          const isHovered = hoveredId === listing.id;
          const isSelected = selectedListing?.id === listing.id;

          return (
            <Marker
              key={listing.id || index}
              latitude={mapListing.latitude}
              longitude={mapListing.longitude}
              anchor="bottom"
            >
              <div
                className="relative cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredId(listing.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleMarkerClick(listing, mapListing)}
              >
                {/* Price marker */}
                <div
                  className={`
                    px-2 py-1 rounded-md text-xs font-bold whitespace-nowrap
                    transition-all duration-200 cursor-pointer
                    ${getMarkerColors(isHovered, isSelected)}
                  `}
                >
                  {formatPrice(listing.price)}
                </div>

                {/* Hover preview card */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[200] pointer-events-none">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-lg shadow-2xl p-2 w-48">
                      {/* Image */}
                      <div className="relative w-full h-24 mb-2 rounded overflow-hidden bg-neutral-800">
                        {listing.image ? (
                          <Image
                            src={listing.image}
                            alt={listing.address || "Property"}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Home className="w-8 h-8 text-neutral-600" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="text-white">
                        <p className="text-lg font-bold text-emerald-400 mb-1">
                          ${listing.price?.toLocaleString()}
                        </p>
                        <p className="text-xs text-neutral-300 truncate mb-1">
                          {listing.address}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {listing.beds}bd • {listing.baths}ba • {listing.sqft?.toLocaleString()} sqft
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-neutral-900/90 backdrop-blur-sm border border-neutral-700 rounded-lg p-3 text-xs">
        <p className="text-white font-semibold mb-1">
          {listings.length} {listings.length === 1 ? "Property" : "Properties"}
        </p>
        <p className="text-neutral-400">
          Hover over markers to preview
        </p>
      </div>
    </div>
  );
}
