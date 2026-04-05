"use client";

import React, { useState, useEffect } from "react";
import ListingsMap, { MapListing } from "@/app/components/map/ListingsMap";

interface Subdivision {
  name: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

interface SubdivisionMapProps {
  subdivisionSlug: string;
  subdivision: Subdivision;
  onListingClick?: (listing: MapListing) => void;
  height?: string;
  propertyTypeFilter?: "all" | "sale" | "rental";
}

const FILTER_OPTIONS = [
  { value: "sale", label: "For Sale" },
  { value: "rental", label: "For Rent" },
  { value: "all", label: "All" },
];

export default function SubdivisionMap({
  subdivisionSlug,
  subdivision,
  onListingClick,
  height = "400px",
  propertyTypeFilter: externalFilter,
}: SubdivisionMapProps) {
  const [listings, setListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>(externalFilter || "all");

  useEffect(() => {
    setLoading(true);
    async function fetchListings() {
      try {
        const propertyTypeMap: Record<string, string> = {
          sale: "A",
          rental: "B",
          all: "all",
        };
        const propertyType = propertyTypeMap[propertyTypeFilter] || "A";

        const response = await fetch(
          `/api/subdivisions/${subdivisionSlug}/listings?limit=100&propertyType=${propertyType}`
        );
        if (response.ok) {
          const data = await response.json();
          const mapped: MapListing[] = (data.listings || []).map((l: any) => ({
            listingKey: l.listingKey || l.listingId,
            slugAddress: l.slug || l.slugAddress,
            latitude: l.latitude,
            longitude: l.longitude,
            listPrice: l.listPrice,
            propertyType: l.propertyType,
            mlsSource: l.mlsSource,
            bedsTotal: l.bedsTotal,
            bathsTotal: l.bathroomsTotalDecimal,
            address: l.address,
            photoUrl: l.photoUrl,
          }));
          setListings(mapped);
        }
      } catch (error) {
        console.error("Error fetching subdivision listings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, [subdivisionSlug, propertyTypeFilter]);

  return (
    <ListingsMap
      listings={listings}
      loading={loading}
      height={height}
      center={subdivision.coordinates}
      zoom={13}
      showFilters
      filterOptions={FILTER_OPTIONS}
      activeFilter={propertyTypeFilter}
      onFilterChange={setPropertyTypeFilter}
      onListingClick={onListingClick}
    />
  );
}
