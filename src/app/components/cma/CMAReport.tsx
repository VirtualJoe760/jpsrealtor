// src/app/components/cma/CMAReport.tsx
"use client";

import { useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { motion } from "framer-motion";
import { Home, MapPin, TrendingUp, FileText, Download } from "lucide-react";
import type { CMAReport as CMAReportType } from "@/types/cma";
import PriceComparisonChart from "./PriceComparisonChart";
import MarketStatsCard from "./MarketStatsCard";
import ComparablesTable from "./ComparablesTable";

interface CMAReportProps {
  report: CMAReportType;
  className?: string;
}

export default function CMAReport({ report, className = "" }: CMAReportProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [activeTab, setActiveTab] = useState<"overview" | "comparables" | "charts">("overview");

  const { subjectProperty, comparableProperties, marketStatistics } = report;

  const valueEstimate = subjectProperty.estimatedValue || subjectProperty.listPrice;
  const valueLow = subjectProperty.estimatedValueLow || valueEstimate * 0.95;
  const valueHigh = subjectProperty.estimatedValueHigh || valueEstimate * 1.05;

  const tabs = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "comparables", label: "Comparables", icon: MapPin },
    { id: "charts", label: "Charts", icon: TrendingUp },
  ] as const;

  return (
    <div className={className}>
      {/* Header */}
      <div
        className={`rounded-2xl p-6 mb-6 ${
          isLight
            ? "bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200"
            : "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30"
        }`}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className={`text-2xl font-bold mb-2 ${isLight ? "text-gray-900" : "text-white"}`}>
              Comparative Market Analysis
            </h2>
            <p className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>
              {subjectProperty.address}
            </p>
            <p className={`text-xs ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              Generated {new Date(report.generatedAt).toLocaleDateString()}
            </p>
          </div>

          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isLight
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/50"
            }`}
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>

        {/* Value Estimate */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className={`text-xs mb-1 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              Estimated Value
            </div>
            <div
              className={`text-3xl font-bold text-transparent bg-clip-text ${
                isLight
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600"
                  : "bg-gradient-to-r from-blue-400 to-cyan-400"
              }`}
            >
              ${valueEstimate.toLocaleString()}
            </div>
          </div>

          <div>
            <div className={`text-xs mb-1 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              Low Estimate
            </div>
            <div className={`text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
              ${valueLow.toLocaleString()}
            </div>
          </div>

          <div>
            <div className={`text-xs mb-1 ${isLight ? "text-gray-600" : "text-gray-400"}`}>
              High Estimate
            </div>
            <div className={`text-2xl font-bold ${isLight ? "text-gray-900" : "text-white"}`}>
              ${valueHigh.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Subject Property Details */}
        <div className={`mt-4 pt-4 border-t ${isLight ? "border-gray-300" : "border-gray-700"}`}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            {subjectProperty.bedroomsTotal && (
              <div>
                <span className={isLight ? "text-gray-600" : "text-gray-400"}>Beds:</span>{" "}
                <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                  {subjectProperty.bedroomsTotal}
                </span>
              </div>
            )}
            {subjectProperty.bathroomsTotalInteger && (
              <div>
                <span className={isLight ? "text-gray-600" : "text-gray-400"}>Baths:</span>{" "}
                <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                  {subjectProperty.bathroomsTotalInteger}
                </span>
              </div>
            )}
            {subjectProperty.livingArea && (
              <div>
                <span className={isLight ? "text-gray-600" : "text-gray-400"}>SqFt:</span>{" "}
                <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                  {subjectProperty.livingArea.toLocaleString()}
                </span>
              </div>
            )}
            {subjectProperty.yearBuilt && (
              <div>
                <span className={isLight ? "text-gray-600" : "text-gray-400"}>Built:</span>{" "}
                <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                  {subjectProperty.yearBuilt}
                </span>
              </div>
            )}
            {subjectProperty.pricePerSqFt && (
              <div>
                <span className={isLight ? "text-gray-600" : "text-gray-400"}>$/SqFt:</span>{" "}
                <span className={`font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>
                  ${subjectProperty.pricePerSqFt}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                isActive
                  ? isLight
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-blue-500/20 text-blue-400 border-2 border-blue-500/50"
                  : isLight
                    ? "bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-300"
                    : "bg-gray-900/50 border border-gray-700/30 text-gray-400 hover:border-blue-500/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === "overview" && (
          <div className="space-y-6">
            <MarketStatsCard statistics={marketStatistics} />

            <div
              className={`rounded-2xl p-6 ${
                isLight
                  ? "bg-white border-2 border-gray-300"
                  : "bg-gray-900/50 border border-gray-700/30"
              }`}
            >
              <h3 className={`text-xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
                Summary
              </h3>
              <p className={`text-sm leading-relaxed ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                Based on {comparableProperties.length} comparable properties within {report.radius} miles,
                the estimated market value for this property is{" "}
                <span className="font-bold">${valueEstimate.toLocaleString()}</span>, with a range
                between ${valueLow.toLocaleString()} and ${valueHigh.toLocaleString()}.
              </p>
              <p className={`text-sm leading-relaxed mt-3 ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                The average price per square foot in this market is ${marketStatistics.averagePricePerSqFt},
                and properties typically spend {Math.round(marketStatistics.averageDaysOnMarket)} days
                on the market.
              </p>
            </div>
          </div>
        )}

        {activeTab === "comparables" && (
          <ComparablesTable
            subject={subjectProperty}
            comparables={comparableProperties}
          />
        )}

        {activeTab === "charts" && (
          <div className="space-y-6">
            <div
              className={`rounded-2xl p-6 ${
                isLight
                  ? "bg-white border-2 border-gray-300"
                  : "bg-gray-900/50 border border-gray-700/30"
              }`}
            >
              <h3 className={`text-xl font-bold mb-4 ${isLight ? "text-gray-900" : "text-white"}`}>
                Price Comparison
              </h3>
              <PriceComparisonChart
                subject={subjectProperty}
                comparables={comparableProperties}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
