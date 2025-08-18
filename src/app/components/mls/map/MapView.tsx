// src/components/MapView.tsx
"use client";

import {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import Map, { Marker, ViewState } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapListing } from "@/types/types";

export interface MapViewHandles {
  flyToCity: (lat: number, lng: number, zoom?: number) => void;
}

interface MapViewProps {
  listings: MapListing[]; // This now contains clustered or filtered tile data
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  onSelectListing: (listing: MapListing) => void;
  selectedListing?: MapListing | null;
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  }) => void;
  onSelectListingByIndex?: (index: number) => void;
}

function formatPrice(price?: number): string {
  if (!price) return "—";
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}k`;
  return `$${price}`;
}

const MapView = forwardRef<MapViewHandles, MapViewProps>(function MapView(
  {
    listings,
    centerLat,
    centerLng,
    zoom,
    onSelectListing,
    selectedListing,
    onBoundsChange,
    onSelectListingByIndex,
  },
  ref
) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const lastSelectedIdRef = useRef<string | null>(null);

  const hydratedInitialViewState: ViewState = {
    latitude: centerLat ?? 33.72,
    longitude: centerLng ?? -116.37,
    zoom: zoom ?? 11,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  const handleMoveEnd = () => {
    const map = mapRef.current?.getMap();
    if (map && map.isStyleLoaded() && onBoundsChange) {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
        zoom: Math.floor(zoom),
      });
    }
  };

  const handleMarkerClick = (listing: MapListing) => {
    if (lastSelectedIdRef.current === listing._id) return;
    lastSelectedIdRef.current = listing._id;
    onSelectListing(listing);

    if (onSelectListingByIndex) {
      const index = listings.findIndex((l) => l._id === listing._id);
      onSelectListingByIndex(index >= 0 ? index : 0);
    }
  };

  useImperativeHandle(ref, () => ({
    flyToCity(lat: number, lng: number, zoomLevel = 12) {
      const map = mapRef.current?.getMap();
      if (!map) return;
      map.easeTo({
        center: [lng, lat],
        zoom: zoomLevel,
        duration: 1000,
        offset: [0, -250],
      });
    },
  }));

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        initialViewState={hydratedInitialViewState}
        onMoveEnd={handleMoveEnd}
      >
        {listings.map((listing, i) => {
          if (!listing.longitude || !listing.latitude) return null;
          return (
            <Marker
              key={listing._id || i}
              longitude={listing.longitude}
              latitude={listing.latitude}
              anchor="bottom"
              onClick={() => handleMarkerClick(listing)}
            >
              <div
                onMouseEnter={() => setHoveredId(listing._id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`rounded-md px-2 py-1 text-xs font-[Raleway] font-semibold transition-all duration-200 min-w-[40px] min-h-[20px]
                  ${
                    selectedListing?._id === listing._id
                      ? "bg-cyan-400 text-black border-2 border-white scale-125 z-[100] ring-2 ring-white"
                      : hoveredId === listing._id
                      ? "bg-emerald-400 text-black scale-105 z-40"
                      : "bg-emerald-600 text-white scale-100 z-30"
                  }`}
              >
                {formatPrice(listing.listPrice)}
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
});

export default MapView;
