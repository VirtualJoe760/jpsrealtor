/**
 * Calculate map bounds from listings
 * Extracted from IntegratedChatWidget.tsx
 */
import type { Listing } from "@/app/components/chat/ListingCarousel";

export interface BoundsType {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
}

export function calculateListingsBounds(listings: Listing[]): BoundsType | null {
  if (!listings || listings.length === 0) {
    return null;
  }

  const validListings = listings.filter((l) => l.latitude && l.longitude);

  if (validListings.length === 0) {
    return null;
  }

  const lats = validListings.map((l) => l.latitude!);
  const lngs = validListings.map((l) => l.longitude!);

  const north = Math.max(...lats);
  const south = Math.min(...lats);
  const east = Math.max(...lngs);
  const west = Math.min(...lngs);

  // Add 10% padding
  const latPadding = (north - south) * 0.1 || 0.01;
  const lngPadding = (east - west) * 0.1 || 0.01;

  return {
    north: north + latPadding,
    south: south - latPadding,
    east: east + lngPadding,
    west: west - lngPadding,
    zoom: 13,
  };
}
