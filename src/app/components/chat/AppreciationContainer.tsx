"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { AppreciationCard } from "../analytics/AppreciationCard";
import type { EntityType } from "@/lib/chat/utils/entity-recognition";

interface AppreciationContainerProps {
  location: string;
  locationType: EntityType;
  period: "1y" | "3y" | "5y" | "10y";
}

type PeriodOption = "1y" | "3y" | "5y";
type MarketType = "residential" | "rental";
type PropertySubType = string;  // e.g., "Single Family Residence", "Condominium", "Townhouse"

interface YearlyMarketData {
  year: number;
  avgListPrice: number;
  avgSalePrice: number;
  avgPricePerSqFt: number;
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  appreciationRate: number;
  salesCount: number;
}

interface AppreciationData {
  location?: {
    city?: string;
    subdivision?: string;
    county?: string;
  };
  period: string;
  appreciation: {
    annual: number;
    cumulative: number;
    twoYear: number;
    fiveYear: number;
    trend: "bullish" | "bearish" | "neutral" | "mixed";
    byYear?: YearlyMarketData[];
  };
  marketData: {
    startAvgPrice: number;
    endAvgPrice: number;
    startPricePerSqFt: number;
    endPricePerSqFt: number;
    totalSales: number;
    confidence: "high" | "medium" | "low";
  };
  metadata?: {
    mlsSources?: string[];
    propertySubTypes?: string[];  // Available property subtypes for tabs
    marketType?: MarketType;
  };
}

export function AppreciationContainer({
  location,
  locationType,
  period: initialPeriod
}: AppreciationContainerProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // State for selected period, market type, and property subtype
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>(
    initialPeriod === "10y" ? "5y" : (initialPeriod as PeriodOption)
  );
  const [selectedMarketType, setSelectedMarketType] = useState<MarketType>("residential");
  const [selectedPropertySubType, setSelectedPropertySubType] = useState<PropertySubType | null>(null);
  const [availableSubTypes, setAvailableSubTypes] = useState<string[]>([]);
  const [initialSubTypes, setInitialSubTypes] = useState<string[]>([]); // Store initial full list
  const [data, setData] = useState<AppreciationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAppreciation() {
      try {
        setLoading(true);
        setError(null);

        // Build query params based on location type, market type, and property subtype
        const params = new URLSearchParams({
          period: selectedPeriod,
          marketType: selectedMarketType
        });

        // Add property subtype filter if selected
        if (selectedPropertySubType) {
          params.set("propertySubType", selectedPropertySubType);
        }

        if (locationType === "subdivision") {
          params.set("subdivision", location);
        } else if (locationType === "city") {
          params.set("city", location);
        } else if (locationType === "county") {
          params.set("county", location);
        } else {
          // Fallback: try city
          params.set("city", location);
        }

        console.log(`[AppreciationContainer] Fetching: /api/analytics/appreciation?${params}`);

        const response = await fetch(`/api/analytics/appreciation?${params}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(errorData.error || `Failed to fetch appreciation data: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`[AppreciationContainer] Received data:`, result);
        setData(result);

        // Store available property subtypes for tab display
        if (result.metadata?.propertySubTypes && result.metadata.propertySubTypes.length > 0) {
          const subtypes = result.metadata.propertySubTypes;

          // Only update initial list when loading without filter
          if (selectedPropertySubType === null) {
            setInitialSubTypes(subtypes);
            setAvailableSubTypes(subtypes);
          }

          // Set default selected subtype to "Single Family Residence" if available, otherwise first available
          if (!selectedPropertySubType && subtypes.length > 0) {
            const preferredDefault = "Single Family Residence";
            const defaultSubtype = subtypes.includes(preferredDefault) ? preferredDefault : subtypes[0];
            setSelectedPropertySubType(defaultSubtype);
          }
        }
      } catch (err: any) {
        console.error("[AppreciationContainer] Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAppreciation();
  }, [location, locationType, selectedPeriod, selectedMarketType, selectedPropertySubType]);

  // Loading state with spinner
  if (loading) {
    return (
      <div className="w-full rounded-2xl p-8 flex items-center justify-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-t-2 border-blue-600 dark:border-emerald-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Loading appreciation data for {location}...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    // Check if it's a "no data" error vs a real error
    const isNoDataError = error.includes('No closed sales found') || error.includes('no data');

    if (isNoDataError) {
      return (
        <div className="w-full rounded-2xl p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                Limited Historical Data
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                We don't have enough recent closed sales data for {location} to show appreciation trends. This could mean:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                <li>Properties rarely come on the market (exclusive area)</li>
                <li>New development with limited sales history</li>
                <li>Very small subdivision with few transactions</li>
              </ul>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-3">
                💡 Try asking me to show you current listings instead to see what's available now!
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full rounded-2xl p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
              Failed to load appreciation data
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Market type labels for toggle
  const marketTypeLabels: Record<MarketType, string> = {
    "residential": "Residential Sales",
    "rental": "Rental Market"
  };

  // Success - render market type toggle + AppreciationCard with fetched data
  if (data) {
    return (
      <div className="w-full space-y-3">
        {/* Market Type Toggle */}
        <div className="flex items-center gap-3">
          <p className={`text-xs font-medium ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>
            Market Type:
          </p>
          <div className={`inline-flex rounded-full p-0.5 ${
            isLight
              ? 'bg-gray-200'
              : 'bg-neutral-700'
          }`}>
            {(["residential", "rental"] as MarketType[]).map((marketType) => (
              <button
                key={marketType}
                onClick={() => setSelectedMarketType(marketType)}
                disabled={loading}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedMarketType === marketType
                    ? isLight
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'bg-neutral-800 text-emerald-400 shadow-md'
                    : isLight
                      ? 'text-gray-600 hover:text-gray-900'
                      : 'text-neutral-400 hover:text-neutral-200'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {marketTypeLabels[marketType]}
              </button>
            ))}
          </div>
        </div>

        {/* Property Subtype Dropdown (only for residential with multiple subtypes) */}
        {selectedMarketType === "residential" && initialSubTypes.length > 1 && (
          <div className="flex items-center gap-3">
            <p className={`text-xs font-medium ${isLight ? 'text-gray-600' : 'text-neutral-400'}`}>
              Property Type:
            </p>
            <select
              value={selectedPropertySubType || ''}
              onChange={(e) => setSelectedPropertySubType(e.target.value)}
              disabled={loading}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                isLight
                  ? 'bg-white text-gray-700 border border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                  : 'bg-neutral-800 text-neutral-300 border border-neutral-600 hover:border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-900/50'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''} outline-none`}
            >
              {initialSubTypes.map((subType) => (
                <option key={subType} value={subType}>
                  {subType}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Appreciation Card with cross-dissolve animation */}
        <div
          key={`${selectedMarketType}-${selectedPropertySubType || 'none'}`}
          className="animate-in fade-in duration-300"
        >
          <AppreciationCard data={data} />
        </div>
      </div>
    );
  }

  // No data (shouldn't happen, but handle gracefully)
  return null;
}
