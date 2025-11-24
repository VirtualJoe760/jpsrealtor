// src/app/components/chat/MLSChatResponse.tsx
// Unified MLS search results renderer for chat

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  X,
  TrendingUp,
  Home,
  DollarSign,
  BarChart3,
} from "lucide-react";
import ListingCarousel, { type Listing } from "./ListingCarousel";
import ChatMapView from "./ChatMapView";
import type { InsightMatch } from "@/lib/ai-functions";
import type { MapFilters } from "@/app/utils/mls/filterListingsServerSide";
import { useTheme } from "@/app/contexts/ThemeContext";
import AppreciationChart from "@/app/components/cma/charts/AppreciationChart";
import ConfidenceGauge from "@/app/components/cma/charts/ConfidenceGauge";
import PriceRangePositionChart from "@/app/components/cma/charts/PriceRangePositionChart";
import type { AppreciationForecast } from "@/lib/cma/cmaTypes";

export interface MLSChatResponseProps {
  listings: Listing[];
  insights?: InsightMatch[];
  filtersUsed?: MapFilters;
  searchSummary?: string;
  onFilterRemove?: (filterKey: string) => void;
  onFilterModify?: (filterKey: string, value: any) => void;
  onViewOnMap?: () => void;
  // Preference intelligence
  explanation?: string;
  intent?: "preference_recommendation" | "similar_listing" | "refinement" | "new_search";
  targetAddress?: string;
  // CMA hookpoints
  cmaSummary?: any;
  // Swipe Review Mode
  onViewDetails?: (
    listings: Listing[],
    meta?: { subdivision?: string; subdivisionSlug?: string; cityId?: string }
  ) => void;
  swipeModeEnabled?: boolean;
}

export default function MLSChatResponse({
  listings,
  insights = [],
  filtersUsed = {},
  searchSummary,
  onFilterRemove,
  onFilterModify,
  onViewOnMap,
  explanation,
  intent,
  targetAddress,
  cmaSummary,
  onViewDetails,
  swipeModeEnabled,
}: MLSChatResponseProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const router = useRouter();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  // Extract subdivision info from listings for swipe mode
  const subdivisionMeta = React.useMemo(() => {
    const firstWithSubdivision = listings.find(
      (l) => l.subdivision && l.subdivisionSlug && l.cityId
    );
    return firstWithSubdivision
      ? {
          subdivision: firstWithSubdivision.subdivision,
          subdivisionSlug: firstWithSubdivision.subdivisionSlug,
          cityId: firstWithSubdivision.cityId,
        }
      : undefined;
  }, [listings]);

  // Build filter chips from filtersUsed
  const filterChips = React.useMemo(() => {
    const chips: Array<{
      key: string;
      label: string;
      value: any;
      removable: boolean;
    }> = [];

    if (filtersUsed.beds) {
      chips.push({
        key: "beds",
        label: `${filtersUsed.beds}+ beds`,
        value: filtersUsed.beds,
        removable: true,
      });
    }

    if (filtersUsed.baths) {
      chips.push({
        key: "baths",
        label: `${filtersUsed.baths}+ baths`,
        value: filtersUsed.baths,
        removable: true,
      });
    }

    if (filtersUsed.minPrice || filtersUsed.maxPrice) {
      const priceLabel = filtersUsed.maxPrice
        ? `Under $${(filtersUsed.maxPrice / 1000).toFixed(0)}K`
        : `Over $${(filtersUsed.minPrice! / 1000).toFixed(0)}K`;
      chips.push({
        key: "price",
        label: priceLabel,
        value: filtersUsed.maxPrice || filtersUsed.minPrice,
        removable: true,
      });
    }

    if (filtersUsed.poolYn) {
      chips.push({
        key: "poolYn",
        label: "Pool",
        value: true,
        removable: true,
      });
    }

    if (filtersUsed.spaYn) {
      chips.push({
        key: "spaYn",
        label: "Spa",
        value: true,
        removable: true,
      });
    }

    if (filtersUsed.noHOA) {
      chips.push({
        key: "noHOA",
        label: "No HOA",
        value: true,
        removable: true,
      });
    }

    if (filtersUsed.maxHOA) {
      chips.push({
        key: "maxHOA",
        label: `HOA < $${filtersUsed.maxHOA}`,
        value: filtersUsed.maxHOA,
        removable: true,
      });
    }

    if (filtersUsed.minLivingArea) {
      chips.push({
        key: "minLivingArea",
        label: `${filtersUsed.minLivingArea.toLocaleString()}+ sqft`,
        value: filtersUsed.minLivingArea,
        removable: true,
      });
    }

    return chips;
  }, [filtersUsed]);

  // Prepare CMA data for charts
  const appreciationData: AppreciationForecast | undefined = cmaSummary?.appreciation ? {
    cagr1: cmaSummary.appreciation.cagr1 || null,
    cagr3: cmaSummary.appreciation.cagr3 || null,
    cagr5: cmaSummary.appreciation.cagr5 || null,
    projected5Year: cmaSummary.appreciation.projected5Year || null,
    historyYears: cmaSummary.appreciation.historyYears || [],
    volatilityIndex: cmaSummary.appreciation.volatilityIndex || null,
  } : undefined;

  const confidenceScore = cmaSummary?.confidenceScore || 0;
  const compCount = cmaSummary?.comparableCount || cmaSummary?.comps?.length || 0;
  const avgDaysOnMarket = cmaSummary?.avgDaysOnMarket || 0;

  const priceRangeData = cmaSummary?.priceRange ? {
    subjectPrice: cmaSummary.estimatedValue || cmaSummary.subjectPrice || 0,
    minPrice: cmaSummary.priceRange.min || 0,
    maxPrice: cmaSummary.priceRange.max || 0,
    avgPrice: cmaSummary.priceRange.avg || cmaSummary.estimatedValue || 0,
  } : null;

  // Handle "View on Map" click
  const handleViewOnMap = () => {
    if (onViewOnMap) {
      onViewOnMap();
    } else {
      // Build URL params from filters
      const params = new URLSearchParams();

      Object.entries(filtersUsed).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.set(key, String(value));
        }
      });

      // Navigate to map with filters
      router.push(`/map?${params.toString()}`);
    }
  };

  // Handle filter chip removal
  const handleFilterRemove = (filterKey: string) => {
    if (onFilterRemove) {
      onFilterRemove(filterKey);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`my-4 rounded-xl overflow-hidden ${
        isLight
          ? "bg-white/90 border border-gray-300 shadow-md"
          : "bg-neutral-900/80 border border-neutral-700"
      }`}
      style={isLight ? { backdropFilter: "blur(10px) saturate(150%)" } : {}}
    >
      {/* Header Section */}
      <div className="p-4 border-b border-neutral-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Home className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
            <h3 className={`font-semibold text-lg ${isLight ? "text-gray-900" : "text-white"}`}>
              {searchSummary || `Found ${listings.length} ${listings.length === 1 ? "Property" : "Properties"}`}
            </h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 rounded-lg transition-colors ${
              isLight
                ? "hover:bg-gray-200 text-gray-700"
                : "hover:bg-neutral-800 text-neutral-400"
            }`}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Filter Chips */}
        {filterChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {filterChips.map((chip) => (
              <div
                key={chip.key}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  isLight
                    ? "bg-blue-100 text-blue-800"
                    : "bg-emerald-900/30 text-emerald-400"
                }`}
              >
                <span>{chip.label}</span>
                {chip.removable && onFilterRemove && (
                  <button
                    onClick={() => handleFilterRemove(chip.key)}
                    className={`ml-1 hover:opacity-70 transition-opacity ${
                      isLight ? "text-blue-600" : "text-emerald-300"
                    }`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleViewOnMap}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isLight
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            <MapIcon className="w-4 h-4" />
            View on Map
          </button>

          <button
            onClick={() => setShowMap(!showMap)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isLight
                ? "bg-gray-200 text-gray-900 hover:bg-gray-300"
                : "bg-neutral-800 text-white hover:bg-neutral-700"
            }`}
          >
            {showMap ? "Hide" : "Show"} Preview
          </button>
        </div>
      </div>

      {/* Preference Explanation Panel */}
      {explanation && (
        <div className={`p-3 border-b ${
          isLight
            ? "bg-blue-50 border-blue-200"
            : "bg-purple-900/20 border-purple-700/50"
        }`}>
          <p className={`text-sm ${isLight ? "text-blue-800" : "text-purple-300"}`}>
            <span className="font-medium">Matched to your preferences:</span> {explanation}
          </p>
        </div>
      )}

      {/* Similarity Header */}
      {intent === "similar_listing" && targetAddress && (
        <div className={`p-3 border-b ${
          isLight
            ? "bg-cyan-50 border-cyan-200"
            : "bg-cyan-900/20 border-cyan-700/50"
        }`}>
          <p className={`text-sm font-medium ${isLight ? "text-cyan-800" : "text-cyan-300"}`}>
            Homes similar to {targetAddress}
          </p>
        </div>
      )}

      {/* Recommendation Header */}
      {intent === "preference_recommendation" && (
        <div className={`p-3 border-b ${
          isLight
            ? "bg-emerald-50 border-emerald-200"
            : "bg-emerald-900/20 border-emerald-700/50"
        }`}>
          <p className={`text-sm font-medium ${isLight ? "text-emerald-800" : "text-emerald-300"}`}>
            Recommended Homes For You
          </p>
        </div>
      )}

      {/* CMA Quick Analytics - Compact Vertical Preview */}
      {cmaSummary && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`p-4 border-b ${
            isLight
              ? "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200"
              : "bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border-indigo-700/50"
          }`}
          style={isLight ? {
            backdropFilter: "blur(12px) saturate(160%)",
            WebkitBackdropFilter: "blur(12px) saturate(160%)",
          } : {}}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-indigo-400"}`} />
            <h4 className={`font-semibold text-base ${isLight ? "text-gray-900" : "text-white"}`}>
              Quick Analytics
            </h4>
            {cmaSummary.estimatedValue && (
              <span className={`ml-auto text-sm font-bold ${isLight ? "text-blue-700" : "text-indigo-300"}`}>
                Est: ${cmaSummary.estimatedValue.toLocaleString()}
              </span>
            )}
          </div>

          {/* Compact Charts Container - Vertical Stack */}
          <div className="flex flex-col gap-4 max-w-[280px] mx-auto">
            {/* Mini Appreciation Chart */}
            {appreciationData && appreciationData.historyYears && appreciationData.historyYears.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`rounded-lg border p-3 ${
                  isLight
                    ? "bg-white/80 border-gray-200 shadow-sm"
                    : "bg-gray-800/60 border-gray-700 shadow-lg"
                }`}
                style={isLight ? {
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                } : {}}
              >
                <AppreciationChart
                  appreciation={appreciationData}
                  subjectAddress={cmaSummary.subjectAddress || "Property"}
                />
              </motion.div>
            )}

            {/* Mini Confidence Gauge */}
            {confidenceScore > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`rounded-lg border p-3 ${
                  isLight
                    ? "bg-white/80 border-gray-200 shadow-sm"
                    : "bg-gray-800/60 border-gray-700 shadow-lg"
                }`}
                style={isLight ? {
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                } : {}}
              >
                <ConfidenceGauge
                  confidenceScore={confidenceScore}
                  compCount={compCount}
                  avgDaysOnMarket={avgDaysOnMarket}
                />
              </motion.div>
            )}

            {/* Mini Price Range Position Chart */}
            {priceRangeData && priceRangeData.subjectPrice > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`rounded-lg border p-3 ${
                  isLight
                    ? "bg-white/80 border-gray-200 shadow-sm"
                    : "bg-gray-800/60 border-gray-700 shadow-lg"
                }`}
                style={isLight ? {
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                } : {}}
              >
                <PriceRangePositionChart
                  subjectPrice={priceRangeData.subjectPrice}
                  minPrice={priceRangeData.minPrice}
                  maxPrice={priceRangeData.maxPrice}
                  avgPrice={priceRangeData.avgPrice}
                  subjectAddress={cmaSummary.subjectAddress || "Property"}
                />
              </motion.div>
            )}
          </div>

          {/* View Full CMA Link */}
          {cmaSummary.cmaId && (
            <div className="mt-4 text-center">
              <Link
                href={`/dashboard/cma?id=${cmaSummary.cmaId}`}
                className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                  isLight
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-indigo-400 hover:text-indigo-300"
                }`}
              >
                View Full CMA Report
                <TrendingUp className="w-4 h-4" />
              </Link>
            </div>
          )}
        </motion.div>
      )}

      {/* Content Section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Map Preview */}
            {showMap && (
              <div className="p-4 border-b border-neutral-700">
                <ChatMapView
                  listings={listings}
                  height={300}
                  onMarkerClick={
                    onViewDetails
                      ? (listing) => onViewDetails([listing], subdivisionMeta)
                      : undefined
                  }
                />
              </div>
            )}

            {/* Listing Carousel */}
            {listings.length > 0 && (
              <div className="p-4">
                <ListingCarousel
                  listings={listings}
                  title={`${listings.length} Properties`}
                  onViewDetails={
                    onViewDetails
                      ? () => onViewDetails(listings, subdivisionMeta)
                      : undefined
                  }
                  swipeModeEnabled={swipeModeEnabled}
                />
              </div>
            )}

            {/* Insights Section */}
            {insights.length > 0 && (
              <div className={`p-4 border-t ${
                isLight ? "border-gray-200 bg-blue-50" : "border-neutral-700 bg-neutral-800/50"
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-emerald-400"}`} />
                  <h4 className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                    Related Insights
                  </h4>
                </div>
                <div className="space-y-2">
                  {insights.map((insight, index) => (
                    <Link
                      key={index}
                      href={insight.url}
                      target="_blank"
                      className={`block p-3 rounded-lg transition-colors ${
                        isLight
                          ? "bg-white hover:bg-gray-50 border border-gray-200"
                          : "bg-neutral-900 hover:bg-neutral-800 border border-neutral-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`font-medium mb-1 ${isLight ? "text-blue-700" : "text-emerald-400"}`}>
                            {insight.title}
                          </p>
                          <p className={`text-sm line-clamp-2 ${isLight ? "text-gray-600" : "text-neutral-400"}`}>
                            {insight.excerpt}
                          </p>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          isLight ? "bg-blue-100 text-blue-700" : "bg-emerald-900/30 text-emerald-400"
                        }`}>
                          {(insight.relevance * 100).toFixed(0)}%
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {listings.length === 0 && (
              <div className="p-8 text-center">
                <Home className={`w-12 h-12 mx-auto mb-3 ${isLight ? "text-gray-400" : "text-neutral-600"}`} />
                <p className={`text-lg font-medium mb-1 ${isLight ? "text-gray-900" : "text-white"}`}>
                  No listings found
                </p>
                <p className={`text-sm ${isLight ? "text-gray-600" : "text-neutral-400"}`}>
                  Try adjusting your search criteria
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
