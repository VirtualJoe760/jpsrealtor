"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ListingsMap, { MapListing } from "@/app/components/map/ListingsMap";
import { useTheme } from "@/app/contexts/ThemeContext";

interface CityMapProps {
  cityId: string;
  cityName: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  onListingClick?: (listing: MapListing) => void;
  height?: string;
}

const FILTER_OPTIONS = [
  { value: "sale", label: "For Sale" },
  { value: "rental", label: "For Rent" },
  { value: "multifamily", label: "Multifamily" },
  { value: "land", label: "Land" },
  { value: "all", label: "All" },
];

export default function CityMap({
  cityId,
  cityName,
  coordinates,
  onListingClick,
  height = "600px",
}: CityMapProps) {
  const [listings, setListings] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("sale");
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Advanced filter states
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [maxBeds, setMaxBeds] = useState("");
  const [minBaths, setMinBaths] = useState("");
  const [maxBaths, setMaxBaths] = useState("");

  const handleFilterClear = () => {
    setMinPrice("");
    setMaxPrice("");
    setMinBeds("");
    setMaxBeds("");
    setMinBaths("");
    setMaxBaths("");
  };

  // Fetch listings
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          limit: "100",
          propertyType: propertyTypeFilter,
        });
        if (minPrice) params.append("minPrice", minPrice);
        if (maxPrice) params.append("maxPrice", maxPrice);
        if (minBeds) params.append("minBeds", minBeds);
        if (maxBeds) params.append("maxBeds", maxBeds);
        if (minBaths) params.append("minBaths", minBaths);
        if (maxBaths) params.append("maxBaths", maxBaths);

        const response = await fetch(`/api/cities/${cityId}/listings?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          // Map API response to MapListing shape
          const mapped: MapListing[] = (data.listings || []).map((l: any) => ({
            listingKey: l.listingKey,
            slugAddress: l.slugAddress,
            latitude: l.latitude || l.coordinates?.latitude,
            longitude: l.longitude || l.coordinates?.longitude,
            listPrice: l.listPrice,
            propertyType: l.propertyType,
            mlsSource: l.mlsSource,
            bedsTotal: l.beds || l.bedsTotal,
            bathsTotal: l.baths || l.bathsTotal,
            bathroomsTotalInteger: l.bathroomsTotalInteger,
            livingArea: l.livingArea,
            lotSize: l.lotSize,
            associationFee: l.associationFee,
            subdivisionName: l.subdivisionName,
            address: l.address || l.unparsedAddress,
            photoUrl: l.photoUrl || l.primaryPhotoUrl,
          }));
          setListings(mapped);
        }
      } catch (error) {
        console.error("Error fetching listings for map:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [cityId, propertyTypeFilter, minPrice, maxPrice, minBeds, maxBeds, minBaths, maxBaths]);

  const validCount = listings.filter((l) => l.latitude && l.longitude).length;
  const typeLabel =
    propertyTypeFilter === "all"
      ? "properties"
      : propertyTypeFilter === "rental"
        ? "rentals"
        : `properties for ${propertyTypeFilter}`;

  return (
    <ListingsMap
      listings={listings}
      loading={loading}
      height={height}
      center={coordinates}
      showFilters
      filterOptions={FILTER_OPTIONS}
      activeFilter={propertyTypeFilter}
      onFilterChange={setPropertyTypeFilter}
      onListingClick={onListingClick}
      showAdvancedFilters
      advancedFilterContent={
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>Filters</h3>
            <button
              onClick={handleFilterClear}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                isLight ? "text-gray-600 hover:bg-gray-100" : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Min Price", value: minPrice, set: setMinPrice },
              { label: "Max Price", value: maxPrice, set: setMaxPrice },
              { label: "Min Beds", value: minBeds, set: setMinBeds },
              { label: "Max Beds", value: maxBeds, set: setMaxBeds },
              { label: "Min Baths", value: minBaths, set: setMinBaths },
              { label: "Max Baths", value: maxBaths, set: setMaxBaths },
            ].map((f) => (
              <div key={f.label}>
                <label className={`block text-xs font-medium mb-1 ${isLight ? "text-gray-700" : "text-gray-400"}`}>
                  {f.label}
                </label>
                <input
                  type="number"
                  placeholder="Any"
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className={`w-full px-2 py-1.5 text-sm rounded-md ${
                    isLight
                      ? "bg-white border border-gray-300 text-gray-900"
                      : "bg-gray-800 border border-gray-600 text-white"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      }
      statusText={`Showing ${validCount} ${typeLabel} in ${cityName}`}
      actionButton={
        <Link
          href="/mls-listings"
          className={`px-4 md:px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            isLight
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "bg-blue-500 hover:bg-blue-400 text-white"
          }`}
        >
          View All Listings &rarr;
        </Link>
      }
    />
  );
}
