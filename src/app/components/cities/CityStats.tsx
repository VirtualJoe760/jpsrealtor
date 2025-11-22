"use client";

import React, { useState, useEffect } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface CityStatsProps {
  cityId: string;
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

export default function CityStats({
  cityId,
  initialStats
}: CityStatsProps) {
  const [currentType, setCurrentType] = useState<"sale" | "rental">("sale");
  const [stats, setStats] = useState<Stats>(initialStats);
  const [saleStats, setSaleStats] = useState<Stats | null>(null);
  const [rentalStats, setRentalStats] = useState<Stats | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Theme support
  const { cardBg, cardBorder, textPrimary, textMuted, shadow, border } = useThemeClasses();

  // Fetch both sale and rental stats on mount
  useEffect(() => {
    async function fetchAllStats() {
      try {
        const [saleRes, rentalRes] = await Promise.all([
          fetch(`/api/cities/${cityId}/stats?propertyType=sale`),
          fetch(`/api/cities/${cityId}/stats?propertyType=rental`)
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
  }, [cityId]);

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
        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-semibold transition-all duration-500 ${cardBg} ${border}`}>
          <span className={`w-3 h-3 rounded-full ${
            currentType === "sale" ? textPrimary.replace("text-", "bg-") : textMuted.replace("text-", "bg-")
          }`}></span>
          <span className={textPrimary}>
            {currentType === "sale" ? "For Sale" : "For Rent"}
          </span>
        </span>
      </div>

      {/* Stats Grid with Transition */}
      <div
        className={`grid grid-cols-1 md:grid-cols-4 gap-6 transition-opacity duration-500 ${
          isTransitioning ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className={`${cardBg} ${cardBorder} border rounded-lg ${shadow} p-6 hover:border-opacity-80 transition-all duration-200`}>
          <div className={`text-sm ${textMuted} mb-1`}>Active Listings</div>
          <div className={`text-3xl font-bold ${textPrimary}`}>
            {stats.listingCount}
          </div>
        </div>
        <div className={`${cardBg} ${cardBorder} border rounded-lg ${shadow} p-6 hover:border-opacity-80 transition-all duration-200`}>
          <div className={`text-sm ${textMuted} mb-1`}>Average Price</div>
          <div className={`text-3xl font-bold ${textPrimary}`}>
            ${stats.avgPrice >= 1000000
              ? `${(stats.avgPrice / 1000000).toFixed(1)}M`
              : `${(stats.avgPrice / 1000).toFixed(0)}k`}
          </div>
        </div>
        <div className={`${cardBg} ${cardBorder} border rounded-lg ${shadow} p-6 hover:border-opacity-80 transition-all duration-200`}>
          <div className={`text-sm ${textMuted} mb-1`}>Price Range</div>
          <div className={`text-xl font-bold ${textPrimary}`}>
            {formatPriceRange()}
          </div>
        </div>
        {stats.medianPrice && (
          <div className={`${cardBg} ${cardBorder} border rounded-lg ${shadow} p-6 hover:border-opacity-80 transition-all duration-200`}>
            <div className={`text-sm ${textMuted} mb-1`}>Median Price</div>
            <div className={`text-3xl font-bold ${textPrimary}`}>
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
