"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { motion } from "framer-motion";
import { TrendingUp, Home, DollarSign, Receipt } from "lucide-react";

interface MarketStatsProps {
  location?: {
    city?: string;
    subdivision?: string;
    county?: string;
  };
  daysOnMarket?: {
    average: number;
    median: number;
    min: number;
    max: number;
    trend: string;
    sampleSize: number;
  };
  pricePerSqft?: {
    average: number;
    median: number;
    min: number;
    max: number;
    sampleSize: number;
  };
  hoaFees?: {
    average: number;
    median: number;
    min: number;
    max: number;
    sampleSize: number;
  };
  propertyTax?: {
    average: number;
    median: number;
    effectiveRate: number;
    sampleSize: number;
  };
}

export default function MarketStatsCard(props: MarketStatsProps) {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === "blackspace";

  const { location, daysOnMarket, pricePerSqft, hoaFees, propertyTax } = props;

  // Format numbers with commas
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return "N/A";
    return num.toLocaleString();
  };

  // Format currency
  const formatCurrency = (num: number | undefined, decimals = 0) => {
    if (num === undefined || num === null) return "N/A";
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  // Location header
  const locationName = location?.subdivision || location?.city || location?.county || "Market";

  // Trend indicator colors
  const getTrendColor = (trend: string) => {
    if (trend === "fast-moving") return isDark ? "text-emerald-400" : "text-emerald-600";
    if (trend === "slow-moving") return isDark ? "text-orange-400" : "text-orange-600";
    return isDark ? "text-blue-400" : "text-blue-600";
  };

  const getTrendBg = (trend: string) => {
    if (trend === "fast-moving") return isDark ? "bg-emerald-500/10" : "bg-emerald-50";
    if (trend === "slow-moving") return isDark ? "bg-orange-500/10" : "bg-orange-50";
    return isDark ? "bg-blue-500/10" : "bg-blue-50";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`w-full rounded-2xl p-4 sm:p-6 ${
        isDark
          ? "bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700"
          : "bg-gradient-to-br from-white to-gray-50 border border-gray-200 shadow-lg"
      }`}
    >
      {/* Header */}
      <div className="mb-6">
        <h3
          className={`text-xl sm:text-2xl font-bold ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Market Statistics
        </h3>
        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          {locationName}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Days on Market */}
        {daysOnMarket && (
          <div
            className={`rounded-xl p-4 ${
              isDark ? "bg-slate-700/50" : "bg-white shadow"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${getTrendBg(daysOnMarket.trend)}`}>
                <TrendingUp className={`w-5 h-5 ${getTrendColor(daysOnMarket.trend)}`} />
              </div>
              {daysOnMarket.trend && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${getTrendBg(
                    daysOnMarket.trend
                  )} ${getTrendColor(daysOnMarket.trend)}`}
                >
                  {daysOnMarket.trend}
                </span>
              )}
            </div>
            <h4
              className={`text-sm font-medium mb-1 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Days on Market
            </h4>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {formatNumber(daysOnMarket.median)}
              </span>
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                median
              </span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Avg: {formatNumber(daysOnMarket.average)} days • Range: {formatNumber(daysOnMarket.min)}-{formatNumber(daysOnMarket.max)}
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {formatNumber(daysOnMarket.sampleSize)} listings analyzed
            </p>
          </div>
        )}

        {/* Price Per Sqft */}
        {pricePerSqft && (
          <div
            className={`rounded-xl p-4 ${
              isDark ? "bg-slate-700/50" : "bg-white shadow"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`p-2 rounded-lg ${
                  isDark ? "bg-blue-500/10" : "bg-blue-50"
                }`}
              >
                <Home className={`w-5 h-5 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
              </div>
            </div>
            <h4
              className={`text-sm font-medium mb-1 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Price Per Sqft
            </h4>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {formatCurrency(pricePerSqft.median)}
              </span>
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                median
              </span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Avg: {formatCurrency(pricePerSqft.average)} • Range: {formatCurrency(pricePerSqft.min)}-{formatCurrency(pricePerSqft.max)}
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {formatNumber(pricePerSqft.sampleSize)} properties analyzed
            </p>
          </div>
        )}

        {/* HOA Fees */}
        {hoaFees && (
          <div
            className={`rounded-xl p-4 ${
              isDark ? "bg-slate-700/50" : "bg-white shadow"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`p-2 rounded-lg ${
                  isDark ? "bg-purple-500/10" : "bg-purple-50"
                }`}
              >
                <DollarSign className={`w-5 h-5 ${isDark ? "text-purple-400" : "text-purple-600"}`} />
              </div>
            </div>
            <h4
              className={`text-sm font-medium mb-1 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              HOA Fees
            </h4>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {formatCurrency(hoaFees.median)}
              </span>
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                /mo
              </span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Avg: {formatCurrency(hoaFees.average)} • Range: {formatCurrency(hoaFees.min)}-{formatCurrency(hoaFees.max)}
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {formatNumber(hoaFees.sampleSize)} properties analyzed
            </p>
          </div>
        )}

        {/* Property Tax */}
        {propertyTax && (
          <div
            className={`rounded-xl p-4 ${
              isDark ? "bg-slate-700/50" : "bg-white shadow"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`p-2 rounded-lg ${
                  isDark ? "bg-amber-500/10" : "bg-amber-50"
                }`}
              >
                <Receipt className={`w-5 h-5 ${isDark ? "text-amber-400" : "text-amber-600"}`} />
              </div>
              {propertyTax.effectiveRate && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    isDark
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-amber-50 text-amber-600"
                  }`}
                >
                  {propertyTax.effectiveRate.toFixed(2)}% rate
                </span>
              )}
            </div>
            <h4
              className={`text-sm font-medium mb-1 ${
                isDark ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Property Tax
            </h4>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-bold ${
                  isDark ? "text-white" : "text-gray-900"
                }`}
              >
                {formatCurrency(propertyTax.median)}
              </span>
              <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                /year
              </span>
            </div>
            <p className={`text-xs mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Avg: {formatCurrency(propertyTax.average)}
            </p>
            <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              {formatNumber(propertyTax.sampleSize)} properties analyzed
            </p>
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div
        className={`mt-4 pt-4 border-t ${
          isDark ? "border-slate-700" : "border-gray-200"
        }`}
      >
        <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          Statistics based on active listings in {locationName}. Data is updated in real-time from multiple MLS sources.
        </p>
      </div>
    </motion.div>
  );
}
