// src/app/utils/map/useListings.ts
import { useState, useCallback, useRef } from "react";
import type { MapListing, Filters } from "@/types/types";

// Maximum listings to load from API
const MAX_LISTINGS_TO_LOAD = 5000;

// Maximum individual markers to display (clusters handle the rest)
const MAX_DISPLAY_MARKERS = 1000;

interface ListingCache {
  bounds: string;
  listings: MapListing[];
  timestamp: number;
}

export interface TotalCount {
  gps: number;
  crmls: number;
  total: number;
}

export function useListings() {
  const [allListings, setAllListings] = useState<MapListing[]>([]);
  const [visibleListings, setVisibleListings] = useState<MapListing[]>([]);
  const [totalCount, setTotalCount] = useState<TotalCount | null>(null);

  // Cache for loaded listings by area
  const cacheRef = useRef<ListingCache | null>(null);
  const loadingRef = useRef<boolean>(false);

  /**
   * Load listings from API for the given bounds
   * Loads ALL listings in the area (up to MAX_LISTINGS_TO_LOAD)
   * Client-side clustering handles display optimization
   */
  const loadListings = useCallback(async (
    bounds: { north: number; south: number; east: number; west: number; zoom?: number },
    filters: Filters,
    merge: boolean = false
  ) => {
    console.log('🔍 useListings.loadListings called with bounds:', bounds);
    console.log('🔍 useListings.loadListings filters:', filters);

    // Prevent duplicate requests
    if (loadingRef.current) {
      console.log('⏳ Already loading, skipping...');
      return;
    }

    // Check cache - if we have data for a larger area, use it
    const boundsKey = `${bounds.north.toFixed(2)}_${bounds.south.toFixed(2)}_${bounds.east.toFixed(2)}_${bounds.west.toFixed(2)}`;
    if (cacheRef.current && !merge) {
      const cached = cacheRef.current;
      const cacheAge = Date.now() - cached.timestamp;

      // Use cache if less than 5 minutes old and covers the requested area
      if (cacheAge < 5 * 60 * 1000 && cached.bounds === boundsKey) {
        console.log('📦 Using cached listings');
        return;
      }
    }

    loadingRef.current = true;

    try {
      const params: Record<string, string> = {
        north: String(bounds.north),
        south: String(bounds.south),
        east: String(bounds.east),
        west: String(bounds.west),
        limit: String(MAX_LISTINGS_TO_LOAD),
      };

      // Listing Type (sale vs rental)
      if (filters.listingType) params.listingType = filters.listingType;

      // Price filters
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;

      // Beds/Baths
      if (filters.beds) params.beds = filters.beds;
      if (filters.baths) params.baths = filters.baths;

      // Square Footage
      if (filters.minSqft) params.minSqft = filters.minSqft;
      if (filters.maxSqft) params.maxSqft = filters.maxSqft;

      // Lot Size
      if (filters.minLotSize) params.minLotSize = filters.minLotSize;
      if (filters.maxLotSize) params.maxLotSize = filters.maxLotSize;

      // Year Built
      if (filters.minYear) params.minYear = filters.minYear;
      if (filters.maxYear) params.maxYear = filters.maxYear;

      // Property Type
      if (filters.propertyType) params.propertyType = filters.propertyType;
      if (filters.propertySubType) params.propertySubType = filters.propertySubType;

      // Amenities
      if (filters.poolYn !== undefined) params.pool = String(filters.poolYn);
      if (filters.spaYn !== undefined) params.spa = String(filters.spaYn);
      if (filters.viewYn !== undefined) params.view = String(filters.viewYn);
      if (filters.garageYn !== undefined) params.garage = String(filters.garageYn);

      // Garage count
      if (filters.minGarages) params.minGarages = filters.minGarages;

      // HOA
      if (filters.hoa) params.hoa = filters.hoa;
      if (filters.associationYN !== undefined) params.hasHOA = String(filters.associationYN);

      // Community
      if (filters.gatedCommunity !== undefined) params.gated = String(filters.gatedCommunity);
      if (filters.seniorCommunity !== undefined) params.senior = String(filters.seniorCommunity);

      // Land Type
      if (filters.landType) params.landType = filters.landType;

      // Location
      if (filters.city) params.city = filters.city;
      if (filters.subdivision) params.subdivision = filters.subdivision;

      const queryString = new URLSearchParams(params).toString();
      const apiUrl = `/api/mls-listings?${queryString}`;

      console.log('🌐 Fetching listings from:', apiUrl);

      const res = await fetch(apiUrl);
      const data = await res.json();

      const newListings = data.listings || [];
      console.log(`✅ Received ${newListings.length} listings from API`);

      // Update total count if available
      if (data.totalCount) {
        setTotalCount(data.totalCount);
        console.log(`📊 Total listings - GPS: ${data.totalCount.gps}, CRMLS: ${data.totalCount.crmls}, Total: ${data.totalCount.total}`);
      }

      if (merge) {
        // Merge with existing listings, avoiding duplicates
        setAllListings(prev => {
          const existingKeys = new Set(prev.map(l => l.listingKey || l._id));
          const uniqueNew = newListings.filter(
            (l: MapListing) => !existingKeys.has(l.listingKey || l._id)
          );
          console.log(`🔀 Merging ${uniqueNew.length} new listings with ${prev.length} existing`);
          return [...prev, ...uniqueNew];
        });
        setVisibleListings(prev => {
          const existingKeys = new Set(prev.map(l => l.listingKey || l._id));
          const uniqueNew = newListings.filter(
            (l: MapListing) => !existingKeys.has(l.listingKey || l._id)
          );
          return [...prev, ...uniqueNew];
        });
      } else {
        // Replace listings entirely
        setAllListings(newListings);
        setVisibleListings(newListings);

        // Update cache
        cacheRef.current = {
          bounds: boundsKey,
          listings: newListings,
          timestamp: Date.now(),
        };
      }
    } catch (error) {
      console.error('❌ Failed to load listings:', error);
    } finally {
      loadingRef.current = false;
    }
  }, []);

  /**
   * Clear the cache (useful when filters change)
   */
  const clearCache = useCallback(() => {
    cacheRef.current = null;
  }, []);

  return {
    allListings,
    visibleListings,
    setVisibleListings,
    loadListings,
    clearCache,
    totalCount,
  };
}
