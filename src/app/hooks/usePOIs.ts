"use client";

import { useState, useCallback, useRef } from "react";

export interface POI {
  _id: string;
  placeId: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  rating?: number;
  userRatingsTotal?: number;
  description?: string;
  photoUrl?: string;
  address?: string;
  city?: string;
}

export function usePOIs() {
  const [pois, setPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastBoundsKey = useRef<string>("");

  const loadPOIs = useCallback(
    async (bounds: { north: number; south: number; east: number; west: number; zoom: number }) => {
      // Only fetch at zoom 12+
      if (bounds.zoom < 12) {
        if (pois.length > 0) setPois([]);
        return;
      }

      // Deduplicate requests
      const key = `${bounds.north.toFixed(3)}-${bounds.south.toFixed(3)}-${bounds.east.toFixed(3)}-${bounds.west.toFixed(3)}-${bounds.zoom}`;
      if (key === lastBoundsKey.current) return;
      lastBoundsKey.current = key;

      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          north: String(bounds.north),
          south: String(bounds.south),
          east: String(bounds.east),
          west: String(bounds.west),
          zoom: String(bounds.zoom),
        });

        const res = await fetch(`/api/pois?${params}`);
        if (res.ok) {
          const data = await res.json();
          setPois(data.pois || []);
        }
      } catch (err) {
        console.error("[usePOIs] Error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [pois.length]
  );

  return { pois, isLoading, loadPOIs };
}
