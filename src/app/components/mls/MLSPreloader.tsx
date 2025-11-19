"use client";

import { useEffect } from "react";
import { useMLSContext } from "./MLSProvider";

// Default bounds for Coachella Valley
const DEFAULT_BOUNDS = {
  north: 33.82,
  south: 33.62,
  east: -116.27,
  west: -116.47,
  zoom: 11,
};

/**
 * MLSPreloader - Loads MLS data in the background on page load
 *
 * This component starts fetching map listings as soon as the user visits
 * any page on the site, ensuring instant map view when they click "Map View".
 *
 * The preload happens once per session and uses the default Coachella Valley
 * bounds with "For Sale" listings.
 */
export default function MLSPreloader() {
  const { loadListings, isPreloaded, filters } = useMLSContext();

  useEffect(() => {
    // Only preload once
    if (isPreloaded) return;

    // Start loading in background after a short delay
    // This ensures the main page renders first
    const timeoutId = setTimeout(() => {
      console.log("🚀 Preloading MLS data for instant map view...");
      loadListings(DEFAULT_BOUNDS, filters);
    }, 1000); // 1 second delay to not block initial page load

    return () => clearTimeout(timeoutId);
  }, [loadListings, isPreloaded, filters]);

  // This component renders nothing
  return null;
}
