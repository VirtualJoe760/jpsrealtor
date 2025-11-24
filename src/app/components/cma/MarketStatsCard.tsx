// src/app/components/cma/MarketStatsCard.tsx
"use client";

import { useTheme } from "@/app/contexts/ThemeContext";
import { TrendingUp, TrendingDown, Home, Calendar, DollarSign } from "lucide-react";
import type { MarketStatistics } from "@/types/cma";

interface MarketStatsCardProps {
  statistics: MarketStatistics;
  className?: string;
}

export default function MarketStatsCard({
  statistics,
  className = "",
}: MarketStatsCardProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const stats = [
    {
      label: "Avg List Price",
      value: `$${statistics.averageListPrice.toLocaleString()}`,
      icon: DollarSign,
      color: isLight ? "text-blue-600" : "text-blue-400",
      bg: isLight ? "bg-blue-100" : "bg-blue-500/10",
    },
    {
      label: "Median List Price",
      value: `$${statistics.medianListPrice.toLocaleString()}`,
      icon: DollarSign,
      color: isLight ? "text-emerald-600" : "text-emerald-400",
      bg: isLight ? "bg-emerald-100" : "bg-emerald-500/10",
    },
    {
      label: "Avg Sold Price",
      value: `$${statistics.averageSoldPrice.toLocaleString()}`,
      icon: Home,
      color: isLight ? "text-purple-600" : "text-purple-400",
      bg: isLight ? "bg-purple-100" : "bg-purple-500/10",
    },
    {
      label: "Avg Days on Market",
      value: Math.round(statistics.averageDaysOnMarket).toString(),
      icon: Calendar,
      color: isLight ? "text-orange-600" : "text-orange-400",
      bg: isLight ? "bg-orange-100" : "bg-orange-500/10",
    },
    {
      label: "Avg $/SqFt",
      value: `$${statistics.averagePricePerSqFt.toLocaleString()}`,
      icon: TrendingUp,
      color: isLight ? "text-cyan-600" : "text-cyan-400",
      bg: isLight ? "bg-cyan-100" : "bg-cyan-500/10",
    },
    {
      label: "List-to-Sold Ratio",
      value: `${statistics.listToSoldRatio}%`,
      icon: statistics.listToSoldRatio > 50 ? TrendingUp : TrendingDown,
      color: statistics.listToSoldRatio > 50
        ? isLight ? "text-green-600" : "text-green-400"
        : isLight ? "text-red-600" : "text-red-400",
      bg: statistics.listToSoldRatio > 50
        ? isLight ? "bg-green-100" : "bg-green-500/10"
        : isLight ? "bg-red-100" : "bg-red-500/10",
    },
  ];

  return (
    <div className={className}>
      <h3 className={`text-xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
        Market Statistics
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className={`rounded-xl p-4 ${
                isLight
                  ? "bg-white border-2 border-gray-200"
                  : "bg-gray-900/50 border border-gray-700/30"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <div className={`text-xs ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                    {stat.label}
                  </div>
                  <div className={`text-lg font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
                    {stat.value}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`mt-4 p-4 rounded-lg ${
        isLight ? "bg-blue-50 border-2 border-blue-200" : "bg-blue-500/10 border border-blue-500/30"
      }`}>
        <p className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>
          <span className="font-semibold">
            {statistics.totalActiveListings} Active
          </span>{" "}
          and{" "}
          <span className="font-semibold">
            {statistics.totalSoldListings} Sold
          </span>{" "}
          properties analyzed
        </p>
      </div>
    </div>
  );
}
