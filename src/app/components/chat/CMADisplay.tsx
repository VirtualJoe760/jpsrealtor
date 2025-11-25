"use client";

import React from "react";
import { CMAResult, formatPrice, formatPricePerSqft } from "@/lib/cma-calculator";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { TrendingUp, DollarSign, Maximize2 } from "lucide-react";

interface CMADisplayProps {
  cmaData: CMAResult;
}

export default function CMADisplay({ cmaData }: CMADisplayProps) {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const { metrics, selectedProperties, location } = cmaData;

  const bgClass = isLight ? "bg-white/90 border-gray-300" : "bg-gray-800 border-gray-700";
  const headerColorClass = isLight ? "text-blue-600" : "text-emerald-400";
  const textClass = isLight ? "text-gray-700" : "text-gray-300";
  const metricBgClass = isLight ? "bg-blue-50" : "bg-gray-900/50";
  const rangeBgClass = isLight ? "bg-gray-100" : "bg-gray-900/50";

  return (
    <div className={"rounded-lg p-6 border " + bgClass}
      style={isLight ? { backdropFilter: "blur(10px) saturate(150%)" } : {}}>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className={headerColorClass + " w-6 h-6"} />
          <h3 className={"text-xl font-bold " + headerColorClass}>
            Comparative Market Analysis
          </h3>
        </div>
        <p className={"text-sm " + textClass}>
          Analysis of {metrics.totalProperties} selected property(ies) in {location}
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className={"rounded-lg p-4 " + metricBgClass}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className={headerColorClass + " w-4 h-4"} />
            <p className={"text-xs font-medium " + (isLight ? "text-gray-600" : "text-gray-400")}>Median Price</p>
          </div>
          <p className={"text-2xl font-bold " + headerColorClass}>
            {formatPrice(metrics.medianPrice)}
          </p>
        </div>

        <div className={"rounded-lg p-4 " + metricBgClass}>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className={headerColorClass + " w-4 h-4"} />
            <p className={"text-xs font-medium " + (isLight ? "text-gray-600" : "text-gray-400")}>Average Price</p>
          </div>
          <p className={"text-2xl font-bold " + headerColorClass}>
            {formatPrice(metrics.averagePrice)}
          </p>
        </div>

        <div className={"rounded-lg p-4 " + metricBgClass}>
          <div className="flex items-center gap-2 mb-1">
            <Maximize2 className={headerColorClass + " w-4 h-4"} />
            <p className={"text-xs font-medium " + (isLight ? "text-gray-600" : "text-gray-400")}>Median $/SqFt</p>
          </div>
          <p className={"text-2xl font-bold " + headerColorClass}>
            {formatPricePerSqft(metrics.medianPricePerSqft)}
          </p>
        </div>

        <div className={"rounded-lg p-4 " + metricBgClass}>
          <div className="flex items-center gap-2 mb-1">
            <Maximize2 className={headerColorClass + " w-4 h-4"} />
            <p className={"text-xs font-medium " + (isLight ? "text-gray-600" : "text-gray-400")}>Average $/SqFt</p>
          </div>
          <p className={"text-2xl font-bold " + headerColorClass}>
            {formatPricePerSqft(metrics.averagePricePerSqft)}
          </p>
        </div>
      </div>

      {/* Ranges */}
      <div className={"rounded-lg p-4 mb-6 " + rangeBgClass}>
        <h4 className={"text-sm font-semibold mb-3 " + textClass}>Property Ranges</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className={isLight ? "text-gray-600" : "text-gray-500"}>Price Range</p>
            <p className={isLight ? "text-gray-900 font-semibold" : "text-white font-semibold"}>
              {formatPrice(metrics.priceRange.min)} - {formatPrice(metrics.priceRange.max)}
            </p>
          </div>
          <div>
            <p className={isLight ? "text-gray-600" : "text-gray-500"}>Square Feet</p>
            <p className={isLight ? "text-gray-900 font-semibold" : "text-white font-semibold"}>
              {metrics.sqftRange.min.toLocaleString()} - {metrics.sqftRange.max.toLocaleString()} sqft
            </p>
          </div>
          <div>
            <p className={isLight ? "text-gray-600" : "text-gray-500"}>Bedrooms</p>
            <p className={isLight ? "text-gray-900 font-semibold" : "text-white font-semibold"}>
              {metrics.bedsRange.min} - {metrics.bedsRange.max} beds
            </p>
          </div>
          <div>
            <p className={isLight ? "text-gray-600" : "text-gray-500"}>Bathrooms</p>
            <p className={isLight ? "text-gray-900 font-semibold" : "text-white font-semibold"}>
              {metrics.bathsRange.min} - {metrics.bathsRange.max} baths
            </p>
          </div>
        </div>
      </div>

      {/* Selected Properties Table */}
      <div className={"rounded-lg p-4 " + rangeBgClass}>
        <h4 className={"text-sm font-semibold mb-3 " + textClass}>
          Selected Properties ({selectedProperties.length})
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className={"border-b " + (isLight ? "border-gray-300" : "border-gray-700")}>
                <th className={"text-left py-2 px-2 " + (isLight ? "text-gray-600" : "text-gray-400")}>Address</th>
                <th className={"text-right py-2 px-2 " + (isLight ? "text-gray-600" : "text-gray-400")}>Price</th>
                <th className={"text-right py-2 px-2 " + (isLight ? "text-gray-600" : "text-gray-400")}>Beds</th>
                <th className={"text-right py-2 px-2 " + (isLight ? "text-gray-600" : "text-gray-400")}>Baths</th>
                <th className={"text-right py-2 px-2 " + (isLight ? "text-gray-600" : "text-gray-400")}>SqFt</th>
                <th className={"text-right py-2 px-2 " + (isLight ? "text-gray-600" : "text-gray-400")}>$/SqFt</th>
              </tr>
            </thead>
            <tbody>
              {selectedProperties.map((prop, idx) => (
                <tr key={idx} className={"border-b " + (isLight ? "border-gray-200 hover:bg-gray-200" : "border-gray-800 hover:bg-gray-800/50")}>
                  <td className={"py-2 px-2 truncate max-w-[200px] " + (isLight ? "text-gray-900" : "text-gray-300")} title={prop.address}>
                    {prop.address}
                  </td>
                  <td className={"py-2 px-2 text-right " + (isLight ? "text-gray-900" : "text-gray-300")}>
                    {formatPrice(prop.price)}
                  </td>
                  <td className={"py-2 px-2 text-right " + (isLight ? "text-gray-700" : "text-gray-400")}>{prop.beds}</td>
                  <td className={"py-2 px-2 text-right " + (isLight ? "text-gray-700" : "text-gray-400")}>{prop.baths}</td>
                  <td className={"py-2 px-2 text-right " + (isLight ? "text-gray-700" : "text-gray-400")}>{prop.sqft.toLocaleString()}</td>
                  <td className={"py-2 px-2 text-right font-semibold " + headerColorClass}>
                    {formatPricePerSqft(prop.price / prop.sqft)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timestamp */}
      <div className="mt-4 text-xs text-center" style={{ color: isLight ? "#6b7280" : "#9ca3af" }}>
        Generated {new Date(cmaData.timestamp).toLocaleString()}
      </div>
    </div>
  );
}
