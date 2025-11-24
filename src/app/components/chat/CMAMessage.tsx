// src/app/components/chat/CMAMessage.tsx
"use client";

import { useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, FileText, Download } from "lucide-react";
import type { CMAReport } from "@/types/cma";
import PriceComparisonChart from "../cma/PriceComparisonChart";
import MarketStatsCard from "../cma/MarketStatsCard";
import ComparablesTable from "../cma/ComparablesTable";

interface CMAMessageProps {
  report: CMAReport;
  className?: string;
}

export default function CMAMessage({ report, className = "" }: CMAMessageProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [isExpanded, setIsExpanded] = useState(true);

  const { subjectProperty, comparableProperties, marketStatistics } = report;

  const valueEstimate = subjectProperty.estimatedValue || subjectProperty.listPrice;
  const valueLow = subjectProperty.estimatedValueLow || valueEstimate * 0.95;
  const valueHigh = subjectProperty.estimatedValueHigh || valueEstimate * 1.05;

  return (
    <div className={className}>
      {/* Header - Always Visible */}
      <div
        className={`rounded-lg border p-4 cursor-pointer ${
          isLight
            ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:border-blue-300"
            : "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30 hover:border-blue-500/50"
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isLight ? "bg-blue-100" : "bg-blue-500/20"
              }`}
            >
              <FileText className={`w-5 h-5 ${isLight ? "text-blue-600" : "text-blue-400"}`} />
            </div>
            <div>
              <h3 className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                Comparative Market Analysis
              </h3>
              <p className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                {subjectProperty.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className={`text-sm ${isLight ? "text-gray-600" : "text-gray-400"}`}>
                Est. Value
              </div>
              <div
                className={`text-lg font-bold text-transparent bg-clip-text ${
                  isLight
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600"
                    : "bg-gradient-to-r from-blue-400 to-cyan-400"
                }`}
              >
                ${valueEstimate.toLocaleString()}
              </div>
            </div>
            {isExpanded ? (
              <ChevronUp className={`w-5 h-5 ${isLight ? "text-gray-600" : "text-gray-400"}`} />
            ) : (
              <ChevronDown className={`w-5 h-5 ${isLight ? "text-gray-600" : "text-gray-400"}`} />
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
          <div>
            <span className={isLight ? "text-gray-600" : "text-gray-400"}>Low:</span>{" "}
            <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
              ${(valueLow / 1000).toFixed(0)}K
            </span>
          </div>
          <div>
            <span className={isLight ? "text-gray-600" : "text-gray-400"}>High:</span>{" "}
            <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
              ${(valueHigh / 1000).toFixed(0)}K
            </span>
          </div>
          <div>
            <span className={isLight ? "text-gray-600" : "text-gray-400"}>Comps:</span>{" "}
            <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
              {comparableProperties.length}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4 space-y-4"
        >
          {/* Market Stats */}
          <div
            className={`rounded-lg border p-4 ${
              isLight
                ? "bg-white border-gray-200"
                : "bg-gray-900/50 border-gray-700/30"
            }`}
          >
            <MarketStatsCard statistics={marketStatistics} />
          </div>

          {/* Price Chart */}
          <div
            className={`rounded-lg border p-4 ${
              isLight
                ? "bg-white border-gray-200"
                : "bg-gray-900/50 border-gray-700/30"
            }`}
          >
            <h4 className={`font-semibold mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>
              Price Comparison
            </h4>
            <PriceComparisonChart
              subject={subjectProperty}
              comparables={comparableProperties.slice(0, 6)}
            />
          </div>

          {/* Comparables Table */}
          <div
            className={`rounded-lg border p-4 ${
              isLight
                ? "bg-white border-gray-200"
                : "bg-gray-900/50 border-gray-700/30"
            }`}
          >
            <h4 className={`font-semibold mb-3 ${isLight ? "text-gray-900" : "text-white"}`}>
              Top Comparables
            </h4>
            <ComparablesTable
              subject={subjectProperty}
              comparables={comparableProperties.slice(0, 5)}
            />
          </div>

          {/* Summary */}
          <div
            className={`rounded-lg border p-4 ${
              isLight
                ? "bg-blue-50 border-blue-200"
                : "bg-blue-500/10 border-blue-500/30"
            }`}
          >
            <p className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>
              Based on {comparableProperties.length} comparable properties within {report.radius} miles,
              this property is estimated at{" "}
              <span className="font-bold">${valueEstimate.toLocaleString()}</span>.
              The market shows an average of {Math.round(marketStatistics.averageDaysOnMarket)} days
              on market with {marketStatistics.listToSoldRatio}% list-to-sold ratio.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isLight
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50"
              }`}
            >
              <Download className="w-4 h-4" />
              Download Report
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
