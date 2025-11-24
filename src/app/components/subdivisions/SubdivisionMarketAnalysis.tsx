// src/app/components/subdivisions/SubdivisionMarketAnalysis.tsx
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { FileText, Loader2, TrendingUp, Home, DollarSign, Calendar } from "lucide-react";
import MarketStatsCard from "../cma/MarketStatsCard";
import PriceComparisonChart from "../cma/PriceComparisonChart";
import type { MarketStatistics } from "@/types/cma";

interface SubdivisionMarketAnalysisProps {
  subdivisionSlug: string;
  subdivisionName: string;
  className?: string;
}

export default function SubdivisionMarketAnalysis({
  subdivisionSlug,
  subdivisionName,
  className = "",
}: SubdivisionMarketAnalysisProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const [marketData, setMarketData] = useState<MarketStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/subdivisions/${subdivisionSlug}/market-stats`);
      if (!response.ok) {
        throw new Error("Failed to fetch market data");
      }
      const data = await response.json();
      setMarketData(data.statistics);
    } catch (err) {
      console.error("Error fetching market data:", err);
      setError("Failed to load market analysis");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, [subdivisionSlug]);

  if (loading) {
    return (
      <div
        className={`${className} rounded-2xl border p-8 flex items-center justify-center ${
          isLight
            ? "bg-white border-gray-300"
            : "bg-gray-900/50 border-gray-700/30"
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2
            className={`w-8 h-8 animate-spin ${
              isLight ? "text-blue-500" : "text-blue-400"
            }`}
          />
          <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
            Loading market analysis...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`${className} rounded-2xl border p-8 ${
          isLight
            ? "bg-red-50 border-red-200"
            : "bg-red-500/10 border-red-500/30"
        }`}
      >
        <p className={`text-sm ${isLight ? "text-red-600" : "text-red-400"}`}>
          {error}
        </p>
        <button
          onClick={fetchMarketData}
          className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
            isLight
              ? "bg-red-100 hover:bg-red-200 text-red-700"
              : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
          }`}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!marketData) {
    return null;
  }

  return (
    <div className={className}>
      {/* Header */}
      <div
        className={`rounded-2xl border p-6 mb-6 ${
          isLight
            ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200"
            : "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30"
        }`}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isLight ? "bg-blue-100" : "bg-blue-500/20"
            }`}
          >
            <TrendingUp
              className={`w-6 h-6 ${isLight ? "text-blue-600" : "text-blue-400"}`}
            />
          </div>
          <div>
            <h3 className={`text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
              Market Analysis
            </h3>
            <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              {subdivisionName}
            </p>
          </div>
        </div>
      </div>

      {/* Market Statistics */}
      <MarketStatsCard statistics={marketData} />

      {/* Summary */}
      <div
        className={`mt-6 rounded-2xl border p-6 ${
          isLight
            ? "bg-blue-50 border-blue-200"
            : "bg-blue-500/10 border-blue-500/30"
        }`}
      >
        <p className={`text-sm leading-relaxed ${isLight ? "text-gray-700" : "text-gray-300"}`}>
          Based on current and recently sold properties in {subdivisionName}, the average list
          price is <span className="font-bold">${marketData.averageListPrice.toLocaleString()}</span> and
          the average sold price is <span className="font-bold">${marketData.averageSoldPrice.toLocaleString()}</span>.
          Properties in this subdivision typically spend{" "}
          <span className="font-bold">{Math.round(marketData.averageDaysOnMarket)} days</span> on
          the market with a list-to-sold ratio of{" "}
          <span className="font-bold">{marketData.listToSoldRatio}%</span>.
        </p>
      </div>
    </div>
  );
}
