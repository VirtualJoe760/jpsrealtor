"use client";

import React, { useState, useEffect } from "react";

interface SubdivisionStatsProps {
  subdivisionSlug: string;
  initialStats: {
    listingCount: number;
    avgPrice: number;
    medianPrice?: number;
    priceRange: {
      min: number;
      max: number;
    };
  };
}

interface Stats {
  listingCount: number;
  avgPrice: number;
  medianPrice?: number;
  priceRange: {
    min: number;
    max: number;
  };
}

export default function SubdivisionStats({
  subdivisionSlug,
  initialStats
}: SubdivisionStatsProps) {
  const [currentType, setCurrentType] = useState<"sale" | "rental">("sale");
  const [stats, setStats] = useState<Stats>(initialStats);
  const [saleStats, setSaleStats] = useState<Stats | null>(null);
  const [rentalStats, setRentalStats] = useState<Stats | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fetch both sale and rental stats on mount
  useEffect(() => {
    async function fetchAllStats() {
      try {
        const [saleRes, rentalRes] = await Promise.all([
          fetch(`/api/subdivisions/${subdivisionSlug}/stats?propertyType=sale`),
          fetch(`/api/subdivisions/${subdivisionSlug}/stats?propertyType=rental`)
        ]);

        if (saleRes.ok) {
          const saleData = await saleRes.json();
          setSaleStats(saleData.stats);
        }

        if (rentalRes.ok) {
          const rentalData = await rentalRes.json();
          setRentalStats(rentalData.stats);
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    }

    fetchAllStats();
  }, [subdivisionSlug]);

  // Auto-cycle between sale and rental every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentType(prev => prev === "sale" ? "rental" : "sale");
        setIsTransitioning(false);
      }, 300); // Half of transition duration
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Update displayed stats when type changes
  useEffect(() => {
    if (currentType === "sale" && saleStats) {
      setStats(saleStats);
    } else if (currentType === "rental" && rentalStats) {
      setStats(rentalStats);
    }
  }, [currentType, saleStats, rentalStats]);

  // Format price range properly
  const formatPriceRange = () => {
    const min = stats.priceRange.min;
    const max = stats.priceRange.max;

    // Format min
    const minFormatted = min >= 1000000
      ? `$${(min / 1000000).toFixed(1)}M`
      : `$${(min / 1000).toFixed(0)}k`;

    // Format max
    const maxFormatted = max >= 1000000
      ? `$${(max / 1000000).toFixed(1)}M`
      : `$${(max / 1000).toFixed(0)}k`;

    return `${minFormatted} - ${maxFormatted}`;
  };

  return (
    <div className="mb-8 space-y-4">
      {/* Indicator - Now at top left */}
      <div className="flex items-center">
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-semibold transition-all duration-500 ${
          currentType === "sale"
            ? "bg-green-100 text-green-800"
            : "bg-purple-100 text-purple-800"
        }`}>
          <span className={`w-3 h-3 rounded-full ${
            currentType === "sale" ? "bg-green-600" : "bg-purple-600"
          }`}></span>
          {currentType === "sale" ? "For Sale" : "For Rent"}
        </span>
      </div>

      {/* Stats Grid with Transition */}
      <div
        className={`grid grid-cols-1 md:grid-cols-4 gap-6 transition-opacity duration-500 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Active Listings</div>
          <div className="text-3xl font-bold text-blue-600">
            {stats.listingCount}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Average Price</div>
          <div className="text-3xl font-bold text-green-600">
            ${stats.avgPrice >= 1000000
              ? `${(stats.avgPrice / 1000000).toFixed(1)}M`
              : `${(stats.avgPrice / 1000).toFixed(0)}k`}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Price Range</div>
          <div className="text-xl font-bold text-gray-900">
            {formatPriceRange()}
          </div>
        </div>
        {stats.medianPrice && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Median Price</div>
            <div className="text-3xl font-bold text-gray-900">
              ${stats.medianPrice >= 1000000
                ? `${(stats.medianPrice / 1000000).toFixed(1)}M`
                : `${(stats.medianPrice / 1000).toFixed(0)}k`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
