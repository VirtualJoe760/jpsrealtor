'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet icon issue in Next.js
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  iconRetinaUrl: iconRetina.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Create custom icon for subject property (blue)
const SubjectPropertyIcon = L.icon({
  iconUrl: icon.src,
  iconRetinaUrl: iconRetina.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'subject-property-marker'
});

// Create custom icon for comparables (green)
const ComparableIcon = L.icon({
  iconUrl: icon.src,
  iconRetinaUrl: iconRetina.src,
  shadowUrl: iconShadow.src,
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33],
  className: 'comparable-marker'
});

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  comparables?: {
    latitude: number;
    longitude: number;
    address: string;
    closePrice: number;
  }[];
  height?: string; // Default: '300px'
  isLight: boolean;
}

// Component to auto-fit map bounds
function AutoFitBounds({
  center,
  comparables
}: {
  center: [number, number];
  comparables?: PropertyMapProps['comparables'];
}) {
  const map = useMap();

  useEffect(() => {
    if (comparables && comparables.length > 0) {
      // Create bounds that include subject property and all comparables
      const bounds = L.latLngBounds([center]);

      comparables.forEach(comp => {
        bounds.extend([comp.latitude, comp.longitude]);
      });

      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      // Just center on property with default zoom
      map.setView(center, 15);
    }
  }, [center, comparables, map]);

  return null;
}

export default function PropertyMap({
  latitude,
  longitude,
  address,
  comparables,
  height = '300px',
  isLight
}: PropertyMapProps) {
  const [isClient, setIsClient] = useState(false);

  // Only render map on client side to avoid SSR issues with Leaflet
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Validate coordinates
  if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border ${
          isLight
            ? 'bg-gray-50 border-gray-200 text-gray-500'
            : 'bg-gray-800 border-gray-700 text-gray-400'
        }`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <svg
            className="mx-auto h-12 w-12 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-sm">Map unavailable</p>
          <p className="text-xs mt-1">Missing location coordinates</p>
        </div>
      </div>
    );
  }

  // Don't render map until client-side
  if (!isClient) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border ${
          isLight
            ? 'bg-gray-50 border-gray-200 text-gray-500'
            : 'bg-gray-800 border-gray-700 text-gray-400'
        }`}
        style={{ height }}
      >
        <div className="text-center p-4">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  const center: [number, number] = [latitude, longitude];

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height, width: '100%' }}
        className="z-0"
      >
        {/* OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Subject property marker */}
        <Marker position={center} icon={SubjectPropertyIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold mb-1">Subject Property</p>
              {address && <p className="text-gray-600">{address}</p>}
              <p className="text-xs text-gray-500 mt-1">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Comparable sales markers */}
        {comparables &&
          comparables.map((comp, index) => (
            <Marker
              key={index}
              position={[comp.latitude, comp.longitude]}
              icon={ComparableIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold mb-1">Comparable Sale</p>
                  <p className="text-gray-600 mb-1">{comp.address}</p>
                  <p className="text-green-600 font-semibold">
                    ${comp.closePrice.toLocaleString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Auto-fit bounds to show all markers */}
        <AutoFitBounds center={center} comparables={comparables} />
      </MapContainer>

      {/* Custom CSS for marker colors */}
      <style jsx global>{`
        .subject-property-marker {
          filter: hue-rotate(200deg) saturate(150%);
        }

        .comparable-marker {
          filter: hue-rotate(90deg) saturate(120%);
        }

        .leaflet-container {
          background: ${isLight ? '#f9fafb' : '#1f2937'};
        }
      `}</style>
    </div>
  );
}
