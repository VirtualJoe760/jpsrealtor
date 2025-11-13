"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Subdivision {
  name: string;
  slug: string;
  listingCount: number;
  avgPrice: number;
  priceRange: {
    min: number;
    max: number;
  };
}

interface SubdivisionsSectionProps {
  cityId: string;
}

export default function SubdivisionsSection({ cityId }: SubdivisionsSectionProps) {
  const [subdivisions, setSubdivisions] = useState<Subdivision[]>([]);
  const [noSubdivisionCount, setNoSubdivisionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cityName, setCityName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    async function fetchSubdivisions() {
      try {
        const res = await fetch(`/api/cities/${cityId}/subdivisions`);
        if (res.ok) {
          const data = await res.json();
          setSubdivisions(data.subdivisions || []);
          setNoSubdivisionCount(data.noSubdivisionCount || 0);
          setCityName(data.city);
        }
      } catch (error) {
        console.error("Error fetching subdivisions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubdivisions();
  }, [cityId]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-800 rounded w-2/3"></div>
      </div>
    );
  }

  if (subdivisions.length === 0 && noSubdivisionCount === 0) {
    return null; // Hide if no data found
  }

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    }
    return `$${(price / 1000).toFixed(0)}k`;
  };

  // Calculate pagination
  const totalItems = subdivisions.length + (noSubdivisionCount > 0 ? 1 : 0);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  // Get current page items
  let currentItems: (Subdivision | { type: "individual" })[] = [];
  if (noSubdivisionCount > 0) {
    currentItems = [{ type: "individual" }, ...subdivisions];
  } else {
    currentItems = subdivisions;
  }
  const paginatedItems = currentItems.slice(startIndex, endIndex);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">
          Subdivisions & Neighborhoods in {cityName}
        </h2>
        {totalPages > 1 && (
          <div className="text-sm text-gray-400">
            Page {currentPage} of {totalPages} ({totalItems} total)
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paginatedItems.map((item, index) => {
          // Individual Homes card
          if ("type" in item && item.type === "individual") {
            return (
              <Link
                key="individual-homes"
                href={`/listings?city=${cityId}`}
                className="group bg-gradient-to-br from-gray-900 via-gray-800 to-black border-2 border-gray-600 rounded-lg p-6 hover:border-white/70 hover:shadow-2xl transition-all duration-200"
              >
                <h3 className="text-xl font-semibold text-white mb-2">
                  Individual Homes
                </h3>
                <div className="space-y-1 text-sm text-gray-400">
                  <p>
                    <span className="font-semibold text-white">{noSubdivisionCount}</span> active listings
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Properties without HOA or subdivision
                  </p>
                </div>
                <div className="mt-4 text-gray-300 text-sm font-medium group-hover:text-white group-hover:underline">
                  View All Homes →
                </div>
              </Link>
            );
          }

          // Subdivision card
          const subdivision = item as Subdivision;
          return (
            <Link
              key={subdivision.name}
              href={`/neighborhoods/${cityId}/${subdivision.slug}`}
              className="group bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-lg p-6 hover:border-white/50 hover:shadow-2xl transition-all duration-200"
            >
              <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-white">
                {subdivision.name}
              </h3>
              <div className="space-y-1 text-sm text-gray-400">
                <p>
                  <span className="font-semibold text-white">{subdivision.listingCount}</span> active listings
                </p>
                <p>
                  Avg: <span className="font-semibold text-white">{formatPrice(subdivision.avgPrice)}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {formatPrice(subdivision.priceRange.min)} - {formatPrice(subdivision.priceRange.max)}
                </p>
              </div>
              <div className="mt-4 text-gray-300 text-sm font-medium group-hover:text-white group-hover:underline">
                View Listings →
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {/* Previous Button */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentPage === 1
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            ← Previous
          </button>

          {/* Page Numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first page, last page, current page, and pages around current
            const showPage =
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1);

            if (!showPage) {
              // Show ellipsis
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="px-2 text-gray-600">
                    ...
                  </span>
                );
              }
              return null;
            }

            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
              >
                {page}
              </button>
            );
          })}

          {/* Next Button */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentPage === totalPages
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
