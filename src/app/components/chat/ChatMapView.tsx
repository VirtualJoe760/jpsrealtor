// src/app/components/chat/ChatMapView.tsx
// Simplified map view for displaying chat search results

"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Map, { Marker } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapListing } from "@/types/types";
import { Home, MapPin } from "lucide-react";
import Image from "next/image";
import { useTheme } from "@/app/contexts/ThemeContext";

interface ChatMapViewProps {
  listings: any[]; // Chat listings format
  onSelectListing?: (listing: any) => void;
  searchFilters?: {
    city?: string;
    subdivision?: string;
    propertyType?: string;
    minPrice?: number;
    maxPrice?: number;
    minBeds?: number;
    maxBeds?: number;
  };
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
    return "bg-cyan-400 text-black border-2 border-white scale-110 z-[100] ring-1 ring-black shadow-lg";
  }
  if (hovered) {
    return "bg-emerald-400 text-black scale-105 z-[60] border-2 border-white shadow-md";
  }
  return "bg-emerald-600 text-white scale-100 z-30 border border-emerald-700 shadow-sm";
}

// Try multiple env variable names for MapTiler key
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY ||
                     process.env.NEXT_PUBLIC_MAPTILER_API_KEY ||
                     "";

// Moved inside component for theme-awareness

export default function ChatMapView({ listings, onSelectListing, searchFilters }: ChatMapViewProps) {
  const router = useRouter();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Log map configuration
  // Theme-aware map style
  const MAPTILER_STYLE = isLight
    ? "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" // Light style
    : "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"; // Dark style

  console.log('🗺️ ChatMapView config:', {
    hasMaptilerKey: !!MAPTILER_KEY,
    styleUrl: MAPTILER_STYLE,
    listingsCount: listings.length,
    theme: currentTheme,
    isLight
  });

  // Calculate map center from listings
  const mapListings = listings.map(toMapListing);
  let validListings = mapListings.filter(l => l.latitude && l.longitude);

  console.log('🗺️ ChatMapView listings debug:', {
    totalListings: listings.length,
    validListings: validListings.length,
    first5Listings: listings.slice(0, 5).map(l => ({
      id: l.id,
      address: l.address,
      lat: l.latitude,
      lng: l.longitude,
      coords: l.coordinates
    })),
    first5Mapped: mapListings.slice(0, 5).map(m => ({
      id: m.listingId,
      lat: m.latitude,
      lng: m.longitude
    }))
  });

  if (validListings.length === 0) {
    return (
      <div className={`w-full h-[200px] md:h-[250px] xl:h-[300px] 2xl:h-[400px] rounded-lg flex items-center justify-center border ${
        isLight
          ? 'bg-gray-100 border-gray-300'
          : 'bg-neutral-800 border-neutral-700'
      }`}>
        <div className="text-center p-4">
          <p className={`mb-2 ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>Map data unavailable</p>
          <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-neutral-500'}`}>{listings.length} properties found but location coordinates are missing</p>
        </div>
      </div>
    );
  }

  // Filter out outliers to focus on main cluster (Southern California region)
  // Calculate median to be resistant to outliers
  const lats = validListings.map(l => l.latitude).sort((a, b) => a - b);
  const lngs = validListings.map(l => l.longitude).sort((a, b) => a - b);

  const medianLat = lats[Math.floor(lats.length / 2)];
  const medianLng = lngs[Math.floor(lngs.length / 2)];

  // Define Southern California bounds (approximate)
  // Latitude: 32.5 to 35.5 (San Diego to Central Coast)
  // Longitude: -114.0 to -118.5 (Arizona border to coast)
  const SOCAL_BOUNDS = {
    minLat: 32.5,
    maxLat: 35.5,
    minLng: -119.0,
    maxLng: -114.0
  };

  // Filter listings to only include those in Southern California region
  const clusteredListings = validListings.filter(l =>
    l.latitude >= SOCAL_BOUNDS.minLat &&
    l.latitude <= SOCAL_BOUNDS.maxLat &&
    l.longitude >= SOCAL_BOUNDS.minLng &&
    l.longitude <= SOCAL_BOUNDS.maxLng
  );

  // If we filtered out too many (>50%), use all valid listings (might be a different region)
  // Otherwise use the clustered listings
  const filteredListings = clusteredListings.length > validListings.length * 0.5
    ? clusteredListings
    : validListings;

  console.log('🗺️ Outlier filtering:', {
    originalCount: validListings.length,
    afterFiltering: filteredListings.length,
    outliers: validListings.length - filteredListings.length,
    medianCoords: { lat: medianLat, lng: medianLng }
  });

  // Use filtered listings for bounds calculation
  validListings = filteredListings;

  // Calculate bounds to fit clustered listings
  const clusterLats = validListings.map(l => l.latitude);
  const clusterLngs = validListings.map(l => l.longitude);

  const bounds = {
    north: Math.max(...clusterLats),
    south: Math.min(...clusterLats),
    east: Math.max(...clusterLngs),
    west: Math.min(...clusterLngs)
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

    // Zoom to street-level view (zoom 16-17) centered on the clicked marker
    if (mapRef.current && mapListing.latitude && mapListing.longitude) {
      mapRef.current.flyTo({
        center: [mapListing.longitude, mapListing.latitude],
        zoom: 16,
        duration: 1000, // Smooth 1-second animation
      });
    }
  }, [onSelectListing]);

  const handleOpenInMapView = useCallback(() => {
    // Build URL params from search filters
    const params = new URLSearchParams();

    if (searchFilters?.city) {
      params.set('city', searchFilters.city);
    }
    if (searchFilters?.subdivision) {
      params.set('subdivision', searchFilters.subdivision);
    }
    if (searchFilters?.propertyType) {
      params.set('propertyType', searchFilters.propertyType);
    }
    if (searchFilters?.minPrice) {
      params.set('minPrice', searchFilters.minPrice.toString());
    }
    if (searchFilters?.maxPrice) {
      params.set('maxPrice', searchFilters.maxPrice.toString());
    }
    if (searchFilters?.minBeds) {
      params.set('minBeds', searchFilters.minBeds.toString());
    }
    if (searchFilters?.maxBeds) {
      params.set('maxBeds', searchFilters.maxBeds.toString());
    }

    // Add bounds to zoom to the subdivision
    if (validListings.length > 0) {
      params.set('bounds', JSON.stringify(paddedBounds));
    }

    const queryString = params.toString();
    const url = queryString ? `/map?${queryString}` : '/map';

    console.log('🗺️ Navigating to map view:', url);
    router.push(url);
  }, [searchFilters, validListings.length, paddedBounds, router]);

  return (
    <div className={`relative w-full h-[250px] md:h-[300px] xl:h-[350px] 2xl:h-[450px] rounded-lg overflow-hidden border ${
      isLight ? 'border-gray-300' : 'border-neutral-700'
    }`}>
      {mapError && (
        <div className={`absolute inset-0 flex items-center justify-center z-50 ${
          isLight ? 'bg-white/90' : 'bg-neutral-900/90'
        }`}>
          <p className="text-red-500">Map Error: {mapError}</p>
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
                    <div className={`rounded-lg shadow-2xl p-2 w-48 ${
                      isLight
                        ? 'bg-white border border-gray-300'
                        : 'bg-neutral-900 border border-neutral-700'
                    }`}>
                      {/* Image */}
                      <div className={`relative w-full h-24 mb-2 rounded overflow-hidden ${
                        isLight ? 'bg-gray-200' : 'bg-neutral-800'
                      }`}>
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
                            <Home className={`w-8 h-8 ${isLight ? 'text-gray-400' : 'text-neutral-600'}`} />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div>
                        <p className={`text-lg font-bold mb-1 ${
                          isLight ? 'text-blue-600' : 'text-emerald-400'
                        }`}>
                          ${listing.price?.toLocaleString()}
                        </p>
                        <p className={`text-xs truncate mb-1 ${
                          isLight ? 'text-gray-700' : 'text-neutral-300'
                        }`}>
                          {listing.address}
                        </p>
                        <p className={`text-xs ${
                          isLight ? 'text-gray-600' : 'text-neutral-400'
                        }`}>
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

      {/* Open in Map View Button */}
      <div className="absolute bottom-4 left-4">
        <button
          onClick={handleOpenInMapView}
          className={`flex items-center gap-2 font-semibold px-3 md:px-4 py-2 md:py-2.5 rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 text-sm md:text-base ${
            isLight
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          <MapPin className="w-4 h-4 md:w-5 md:h-5" />
          <span>Open in Map View</span>
        </button>
      </div>
    </div>
  );
}
