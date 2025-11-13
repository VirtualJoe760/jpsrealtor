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
  propertySubType?: string;
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
  propertyTypeFilter?: "all" | "sale" | "rental";
}

export default function SubdivisionListings({
  subdivisionSlug,
  onListingSelect,
  propertyTypeFilter: externalPropertyTypeFilter,
}: SubdivisionListingsProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<"all" | "sale" | "rental">(externalPropertyTypeFilter || "all");
  const [subdivision, setSubdivision] = useState<SubdivisionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minBeds, setMinBeds] = useState<string>("");
  const [maxBeds, setMaxBeds] = useState<string>("");
  const [minBaths, setMinBaths] = useState<string>("");
  const [maxBaths, setMaxBaths] = useState<string>("");
  const [minSqft, setMinSqft] = useState<string>("");
  const [maxSqft, setMaxSqft] = useState<string>("");

  useEffect(() => {
    fetchListings();
  }, [subdivisionSlug, page, minPrice, maxPrice, minBeds, maxBeds, minBaths, maxBaths, minSqft, maxSqft]);

  // Filter listings based on property type and additional filters
  // PropertyType codes: A = Residential (Sale), B = Residential Lease (Rental), C = Multi-Family
  useEffect(() => {
    const isRental = (listing: Listing) => {
      return listing.propertyType === "B";
    };

    let filtered = listings;

    // Property type filter
    if (propertyTypeFilter === "sale") {
      filtered = filtered.filter(l => !isRental(l));
    } else if (propertyTypeFilter === "rental") {
      filtered = filtered.filter(l => isRental(l));
    }

    // Beds filter
    if (minBeds) {
      const min = parseInt(minBeds);
      filtered = filtered.filter(l => (l.bedroomsTotal || 0) >= min);
    }
    if (maxBeds) {
      const max = parseInt(maxBeds);
      filtered = filtered.filter(l => (l.bedroomsTotal || 0) <= max);
    }

    // Baths filter
    if (minBaths) {
      const min = parseInt(minBaths);
      filtered = filtered.filter(l => (l.bathroomsTotalDecimal || 0) >= min);
    }
    if (maxBaths) {
      const max = parseInt(maxBaths);
      filtered = filtered.filter(l => (l.bathroomsTotalDecimal || 0) <= max);
    }

    // Sqft filter
    if (minSqft) {
      const min = parseInt(minSqft);
      filtered = filtered.filter(l => (l.livingArea || 0) >= min);
    }
    if (maxSqft) {
      const max = parseInt(maxSqft);
      filtered = filtered.filter(l => (l.livingArea || 0) <= max);
    }

    setFilteredListings(filtered);
  }, [listings, propertyTypeFilter, minBeds, maxBeds, minBaths, maxBaths, minSqft, maxSqft]);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "100",
      });

      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);

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
    setMinBeds("");
    setMaxBeds("");
    setMinBaths("");
    setMaxBaths("");
    setMinSqft("");
    setMaxSqft("");
    setPage(1);
  };

  if (loading && filteredListings.length === 0) {
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
    <div className="space-y-4">
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

      {/* Property Type Toggle */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Show listings:</span>
        <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
          <button
            onClick={() => setPropertyTypeFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              propertyTypeFilter === "all"
                ? "bg-blue-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setPropertyTypeFilter("sale")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              propertyTypeFilter === "sale"
                ? "bg-green-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-600"></span>
              For Sale
            </span>
          </button>
          <button
            onClick={() => setPropertyTypeFilter("rental")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              propertyTypeFilter === "rental"
                ? "bg-purple-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-600"></span>
              For Rent
            </span>
          </button>
        </div>
      </div>

      {/* Filters Accordion */}
      <div className="bg-gray-50 rounded-lg overflow-hidden">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors"
        >
          <h3 className="font-semibold text-gray-900">Filter Listings</h3>
          <svg
            className={`w-5 h-5 text-gray-600 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {filtersOpen && (
          <div className="p-4 pt-0 space-y-3">
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleFilterApply}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={handleFilterClear}
                className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Price */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min Price</label>
            <input
              type="number"
              placeholder="Any"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Price</label>
            <input
              type="number"
              placeholder="Any"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Beds */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min Beds</label>
            <input
              type="number"
              placeholder="Any"
              value={minBeds}
              onChange={(e) => setMinBeds(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Beds</label>
            <input
              type="number"
              placeholder="Any"
              value={maxBeds}
              onChange={(e) => setMaxBeds(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Baths */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min Baths</label>
            <input
              type="number"
              placeholder="Any"
              value={minBaths}
              onChange={(e) => setMinBaths(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Baths</label>
            <input
              type="number"
              placeholder="Any"
              value={maxBaths}
              onChange={(e) => setMaxBaths(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Sqft */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Min Sqft</label>
            <input
              type="number"
              placeholder="Any"
              value={minSqft}
              onChange={(e) => setMinSqft(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Max Sqft</label>
            <input
              type="number"
              placeholder="Any"
              value={maxSqft}
              onChange={(e) => setMaxSqft(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
            </div>
          </div>
        )}
      </div>

      {/* Listings Grid */}
      {filteredListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <Link
              key={listing.listingId}
              href={`/mls-listings/${listing.slug}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer block"
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
            </Link>
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
