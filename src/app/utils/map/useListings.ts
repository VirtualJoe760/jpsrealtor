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
