// src/app/utils/map/useListings.ts
import { useState, useCallback } from "react";
import type { MapListing, Filters } from "@/types/types";

export function useListings() {
  const [allListings, setAllListings] = useState<MapListing[]>([]);
  const [visibleListings, setVisibleListings] = useState<MapListing[]>([]);

  const loadListings = useCallback(async (bounds: any, filters: Filters) => {
    const params: Record<string, string> = {
      north: String(bounds.north),
      south: String(bounds.south),
      east: String(bounds.east),
      west: String(bounds.west),
    };

    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.beds) params.beds = filters.beds;
    if (filters.baths) params.baths = filters.baths;
    if (filters.propertyType) params.propertyType = filters.propertyType;
    if (filters.hoa) params.hoa = filters.hoa;
    if (filters.poolYn !== undefined) params.pool = String(filters.poolYn);
    if (filters.spaYn !== undefined) params.spa = String(filters.spaYn);
    if (filters.associationYN !== undefined)
      params.hasHOA = String(filters.associationYN);

    const queryString = new URLSearchParams(params).toString();

    const res = await fetch(`/api/mls-listings?${queryString}`);
    const data = await res.json();

    setAllListings(data.listings || []);
    setVisibleListings(data.listings || []);
  }, []);

  return {
    allListings,
    visibleListings,
    setVisibleListings,
    loadListings,
  };
}
