"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface Listing {
  listingId: string;
  listingKey?: string;
  slug: string;
  address?: string;
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  listPrice?: number;
  bedroomsTotal?: number;
  bathroomsTotalDecimal?: number;
  livingArea?: number;
  yearBuilt?: number;
  primaryPhotoUrl?: string;
  latitude?: number;
  longitude?: number;
  standardStatus?: string;
  propertyType?: string;
  mlsSource?: string;
}

interface SubdivisionInfo {
  name: string;
  city: string;
  region: string;
  slug: string;
}

interface SubdivisionListingsProps {
  subdivisionSlug: string;
  onListingSelect?: (listing: Listing) => void;
}

export default function SubdivisionListings({
  subdivisionSlug,
  onListingSelect,
}: SubdivisionListingsProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [subdivision, setSubdivision] = useState<SubdivisionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [beds, setBeds] = useState<string>("");
  const [baths, setBaths] = useState<string>("");

  useEffect(() => {
    fetchListings();
  }, [subdivisionSlug, page, minPrice, maxPrice, beds, baths]);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (beds) params.append("beds", beds);
      if (baths) params.append("baths", baths);

      const response = await fetch(
        `/api/subdivisions/${subdivisionSlug}/listings?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch listings");
      }

      const data = await response.json();

      setListings(data.listings || []);
      setSubdivision(data.subdivision);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error("Error fetching subdivision listings:", err);
      setError("Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return `$${price.toLocaleString()}`;
  };

  const handleFilterApply = () => {
    setPage(1); // Reset to first page
    fetchListings();
  };

  const handleFilterClear = () => {
    setMinPrice("");
    setMaxPrice("");
    setBeds("");
    setBaths("");
    setPage(1);
  };

  if (loading && listings.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading listings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {subdivision && (
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-900">{subdivision.name}</h2>
          <p className="text-gray-600">
            {subdivision.city}, {subdivision.region}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {listings.length > 0
              ? `${listings.length} listing${listings.length !== 1 ? "s" : ""} available`
              : "No listings available"}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-gray-900">Filter Listings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Price
            </label>
            <input
              type="number"
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Price
            </label>
            <input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Beds
            </label>
            <input
              type="number"
              placeholder="Beds"
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Baths
            </label>
            <input
              type="number"
              placeholder="Baths"
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleFilterApply}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={handleFilterClear}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Listings Grid */}
      {listings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div
              key={listing.listingId}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onListingSelect?.(listing)}
            >
              {/* Photo */}
              <div className="relative h-48 bg-gray-200">
                {listing.primaryPhotoUrl ? (
                  <Image
                    src={listing.primaryPhotoUrl}
                    alt={listing.address || "Property"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No Image
                  </div>
                )}
                {listing.mlsSource && (
                  <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-semibold">
                    {listing.mlsSource}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  {formatPrice(listing.listPrice)}
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  <div className="font-medium">{listing.address}</div>
                  <div>
                    {listing.city}, {listing.stateOrProvince} {listing.postalCode}
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-gray-700">
                  {listing.bedroomsTotal !== undefined && (
                    <div>
                      <span className="font-semibold">{listing.bedroomsTotal}</span> Beds
                    </div>
                  )}
                  {listing.bathroomsTotalDecimal !== undefined && (
                    <div>
                      <span className="font-semibold">{listing.bathroomsTotalDecimal}</span> Baths
                    </div>
                  )}
                  {listing.livingArea && (
                    <div>
                      <span className="font-semibold">{listing.livingArea.toLocaleString()}</span> sqft
                    </div>
                  )}
                </div>
                {listing.yearBuilt && (
                  <div className="text-xs text-gray-500 mt-2">
                    Built {listing.yearBuilt}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No listings found matching your criteria.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
