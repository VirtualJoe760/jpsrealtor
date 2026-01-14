// ContactMap - Map display with contact location marker
import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Contact } from '../../types';
import { MAP_STYLE, MAPTILER_KEY } from '../../constants';
import { hasCompleteAddress } from '../../utils';

interface ContactMapProps {
  contact: Contact;
}

export function ContactMap({ contact }: ContactMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  const hasAddress = hasCompleteAddress(contact);

  useEffect(() => {
    if (!mapContainer.current || !hasAddress) return;
    if (map.current) return; // Initialize map only once

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [contact.longitude || -98.5795, contact.latitude || 39.8283],
      zoom: contact.longitude && contact.latitude ? 14 : 3,
    });

    // Add marker if coordinates exist
    if (contact.longitude && contact.latitude) {
      new maplibregl.Marker({ color: '#3B82F6' })
        .setLngLat([contact.longitude, contact.latitude])
        .addTo(map.current);
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [contact.longitude, contact.latitude, hasAddress]);

  if (!hasAddress) {
    return (
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No address available
        </p>
      </div>
    );
  }

  if (!MAPTILER_KEY || MAPTILER_KEY === 'get_your_maptiler_key_here') {
    return (
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Map configuration required
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Location
      </h3>
      <div
        ref={mapContainer}
        className="h-64 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
      />
    </div>
  );
}
