// src/app/components/chat/MapView.tsx
// Simple map placeholder for chat (you'll build this properly later)

"use client";

import React from "react";
import { MapPin } from "lucide-react";

export interface MapLocation {
  latitude: number;
  longitude: number;
  label?: string;
}

interface MapViewProps {
  locations: MapLocation[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

export default function MapView({ locations, center, zoom = 10 }: MapViewProps) {
  // Placeholder - you'll replace this with actual map implementation
  const defaultCenter = center || { lat: 33.8303, lng: -116.5453 }; // Palm Springs

  return (
    <div className="my-3 bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
        <p className="text-sm font-semibold text-white">Map View</p>
        <p className="text-xs text-gray-400">{locations.length} locations</p>
      </div>

      {/* Placeholder map area */}
      <div className="relative h-64 bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto mb-2 text-blue-400" />
          <p className="text-sm text-gray-400">Map view coming soon</p>
          <p className="text-xs text-gray-500 mt-1">
            Showing {locations.length} {locations.length === 1 ? "property" : "properties"}
          </p>
        </div>

        {/* You'll integrate your actual map library here later (MapLibre, etc.) */}
      </div>

      {/* Location list */}
      <div className="p-3 space-y-2 max-h-32 overflow-y-auto">
        {locations.slice(0, 5).map((location, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="truncate">
              {location.label || `Location ${index + 1}`}
            </span>
          </div>
        ))}
        {locations.length > 5 && (
          <p className="text-xs text-gray-500 italic">
            +{locations.length - 5} more locations
          </p>
        )}
      </div>
    </div>
  );
}
