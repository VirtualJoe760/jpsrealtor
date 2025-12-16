// Subdivision/City Comparison Chart Component
// Mobile-first design with theme support

"use client";

import { useState } from "react";
import { useTheme } from "@/app/contexts/ThemeContext";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Home, DollarSign, Calendar, MapPin, ChevronDown, ChevronUp } from "lucide-react";

export interface ComparisonItem {
  name: string;
  type: "subdivision" | "city" | "county";
  stats: {
    avgPrice?: number;
    medianPrice?: number;
    priceRange?: { min: number; max: number };
    totalListings?: number;
    avgSqft?: number;
    avgPricePerSqft?: number;
    avgDaysOnMarket?: number;
    appreciation?: {
      oneYear?: number;
      threeYear?: number;
      fiveYear?: number;
    };
    amenities?: string[];
    hoa?: { min?: number; max?: number; avg?: number };
  };
}

interface SubdivisionComparisonChartProps {
  items: ComparisonItem[];
  title?: string;
}

export default function SubdivisionComparisonChart({
  items = [],
  title = "Comparison"
}: SubdivisionComparisonChartProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Guard against undefined or invalid items
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }

  const formatPrice = (price?: number) => {
    if (!price) return "—";
    if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(2)}M`;
    if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`;
    return `$${price.toLocaleString()}`;
  };

  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return "—";
    const formatted = value >= 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`;
    return formatted;
  };

  const getAppreciationColor = (value?: number) => {
    if (value === undefined || value === null) return isLight ? "text-gray-500" : "text-neutral-400";
    if (value > 0) return isLight ? "text-green-600" : "text-green-400";
    if (value < 0) return isLight ? "text-red-600" : "text-red-400";
    return isLight ? "text-gray-500" : "text-neutral-400";
  };

  const getAppreciationIcon = (value?: number) => {
    if (value === undefined || value === null) return null;
    return value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  };

  return (
    <div className={`w-full rounded-xl overflow-hidden border ${
      isLight
        ? "bg-white border-gray-300 shadow-lg"
        : "bg-neutral-900 border-neutral-700 shadow-2xl"
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${
        isLight
          ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-gray-200"
          : "bg-gradient-to-r from-neutral-800 to-neutral-900 border-neutral-700"
      }`}>
        <h3 className={`text-lg font-bold ${
          isLight ? "text-gray-900" : "text-white"
        }`}>
          {title}
        </h3>
        <p className={`text-sm mt-1 ${
          isLight ? "text-gray-600" : "text-neutral-400"
        }`}>
          Comparing {items.length} {items.length === 1 ? "location" : "locations"}
        </p>
      </div>

      {/* Mobile: Stacked Cards */}
      <div className="block md:hidden">
        {items.map((item, index) => (
          <div
            key={index}
            className={`border-b last:border-b-0 ${
              isLight ? "border-gray-200" : "border-neutral-700"
            }`}
          >
            {/* Card Header */}
            <button
              onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
              className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                isLight
                  ? "hover:bg-gray-50 active:bg-gray-100"
                  : "hover:bg-neutral-800 active:bg-neutral-700"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isLight ? "bg-blue-100" : "bg-emerald-900/30"
                }`}>
                  <MapPin className={`w-5 h-5 ${
                    isLight ? "text-blue-600" : "text-emerald-400"
                  }`} />
                </div>
                <div className="text-left">
                  <h4 className={`font-bold text-base ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}>
                    {item.name}
                  </h4>
                  <p className={`text-xs ${
                    isLight ? "text-gray-500" : "text-neutral-400"
                  }`}>
                    {item.stats.totalListings || 0} listings
                  </p>
                </div>
              </div>
              {expandedIndex === index ? (
                <ChevronUp className={`w-5 h-5 ${
                  isLight ? "text-gray-400" : "text-neutral-500"
                }`} />
              ) : (
                <ChevronDown className={`w-5 h-5 ${
                  isLight ? "text-gray-400" : "text-neutral-500"
                }`} />
              )}
            </button>

            {/* Expanded Details */}
            {expandedIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`px-4 pb-4 space-y-3 ${
                  isLight ? "bg-gray-50" : "bg-neutral-800/50"
                }`}
              >
                {/* Price */}
                {item.stats.medianPrice && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className={`w-4 h-4 ${
                        isLight ? "text-blue-600" : "text-emerald-400"
                      }`} />
                      <span className={`text-sm font-medium ${
                        isLight ? "text-gray-700" : "text-neutral-300"
                      }`}>
                        Median Price
                      </span>
                    </div>
                    <span className={`text-lg font-bold ${
                      isLight ? "text-blue-600" : "text-emerald-400"
                    }`}>
                      {formatPrice(item.stats.medianPrice)}
                    </span>
                  </div>
                )}

                {/* Price Range */}
                {item.stats.priceRange && (
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      isLight ? "text-gray-600" : "text-neutral-400"
                    }`}>
                      Price Range
                    </span>
                    <span className={`text-sm font-medium ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}>
                      {formatPrice(item.stats.priceRange.min)} - {formatPrice(item.stats.priceRange.max)}
                    </span>
                  </div>
                )}

                {/* Avg Sqft */}
                {item.stats.avgSqft && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Home className={`w-4 h-4 ${
                        isLight ? "text-blue-600" : "text-emerald-400"
                      }`} />
                      <span className={`text-sm ${
                        isLight ? "text-gray-600" : "text-neutral-400"
                      }`}>
                        Avg. Size
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}>
                      {item.stats.avgSqft.toLocaleString()} sqft
                    </span>
                  </div>
                )}

                {/* Price per Sqft */}
                {item.stats.avgPricePerSqft && (
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${
                      isLight ? "text-gray-600" : "text-neutral-400"
                    }`}>
                      Price/Sqft
                    </span>
                    <span className={`text-sm font-medium ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}>
                      ${item.stats.avgPricePerSqft.toLocaleString()}/sqft
                    </span>
                  </div>
                )}

                {/* Days on Market */}
                {item.stats.avgDaysOnMarket && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${
                        isLight ? "text-blue-600" : "text-emerald-400"
                      }`} />
                      <span className={`text-sm ${
                        isLight ? "text-gray-600" : "text-neutral-400"
                      }`}>
                        Avg. Days on Market
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}>
                      {item.stats.avgDaysOnMarket} days
                    </span>
                  </div>
                )}

                {/* Appreciation */}
                {item.stats.appreciation && (
                  <div className={`p-3 rounded-lg ${
                    isLight ? "bg-white border border-gray-200" : "bg-neutral-900 border border-neutral-700"
                  }`}>
                    <h5 className={`text-xs font-semibold mb-2 ${
                      isLight ? "text-gray-700" : "text-neutral-300"
                    }`}>
                      Appreciation
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      {item.stats.appreciation.oneYear !== undefined && (
                        <div className="text-center">
                          <div className={`text-xs ${
                            isLight ? "text-gray-500" : "text-neutral-400"
                          }`}>
                            1 Year
                          </div>
                          <div className={`flex items-center justify-center gap-1 text-sm font-bold mt-1 ${
                            getAppreciationColor(item.stats.appreciation.oneYear)
                          }`}>
                            {getAppreciationIcon(item.stats.appreciation.oneYear)}
                            {formatPercent(item.stats.appreciation.oneYear)}
                          </div>
                        </div>
                      )}
                      {item.stats.appreciation.threeYear !== undefined && (
                        <div className="text-center">
                          <div className={`text-xs ${
                            isLight ? "text-gray-500" : "text-neutral-400"
                          }`}>
                            3 Year
                          </div>
                          <div className={`flex items-center justify-center gap-1 text-sm font-bold mt-1 ${
                            getAppreciationColor(item.stats.appreciation.threeYear)
                          }`}>
                            {getAppreciationIcon(item.stats.appreciation.threeYear)}
                            {formatPercent(item.stats.appreciation.threeYear)}
                          </div>
                        </div>
                      )}
                      {item.stats.appreciation.fiveYear !== undefined && (
                        <div className="text-center">
                          <div className={`text-xs ${
                            isLight ? "text-gray-500" : "text-neutral-400"
                          }`}>
                            5 Year
                          </div>
                          <div className={`flex items-center justify-center gap-1 text-sm font-bold mt-1 ${
                            getAppreciationColor(item.stats.appreciation.fiveYear)
                          }`}>
                            {getAppreciationIcon(item.stats.appreciation.fiveYear)}
                            {formatPercent(item.stats.appreciation.fiveYear)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* HOA Fees */}
                {item.stats.hoa && (
                  <div className={`p-3 rounded-lg ${
                    isLight ? "bg-amber-50 border border-amber-200" : "bg-amber-900/20 border border-amber-800"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        isLight ? "text-amber-900" : "text-amber-200"
                      }`}>
                        HOA Fees
                      </span>
                      <span className={`text-sm font-bold ${
                        isLight ? "text-amber-900" : "text-amber-200"
                      }`}>
                        {item.stats.hoa.avg ? `$${item.stats.hoa.avg}/mo` :
                         item.stats.hoa.min && item.stats.hoa.max ?
                         `$${item.stats.hoa.min}-$${item.stats.hoa.max}/mo` : "—"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {item.stats.amenities && item.stats.amenities.length > 0 && (
                  <div>
                    <h5 className={`text-xs font-semibold mb-2 ${
                      isLight ? "text-gray-700" : "text-neutral-300"
                    }`}>
                      Key Amenities
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {item.stats.amenities.slice(0, 5).map((amenity, i) => (
                        <span
                          key={i}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isLight
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-900/30 text-emerald-300"
                          }`}
                        >
                          {amenity}
                        </span>
                      ))}
                      {item.stats.amenities.length > 5 && (
                        <span className={`px-2 py-1 text-xs ${
                          isLight ? "text-gray-500" : "text-neutral-400"
                        }`}>
                          +{item.stats.amenities.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: Comparison Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${
              isLight ? "bg-gray-50 border-gray-200" : "bg-neutral-800 border-neutral-700"
            }`}>
              <th className={`px-4 py-3 text-left text-sm font-semibold ${
                isLight ? "text-gray-700" : "text-neutral-300"
              }`}>
                Metric
              </th>
              {items.map((item, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 text-center text-sm font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <MapPin className={`w-5 h-5 ${
                      isLight ? "text-blue-600" : "text-emerald-400"
                    }`} />
                    <span>{item.name}</span>
                    <span className={`text-xs font-normal ${
                      isLight ? "text-gray-500" : "text-neutral-400"
                    }`}>
                      {item.stats.totalListings || 0} listings
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Median Price Row */}
            <tr className={`border-b ${
              isLight ? "border-gray-200" : "border-neutral-700"
            }`}>
              <td className={`px-4 py-3 text-sm font-medium ${
                isLight ? "text-gray-700" : "text-neutral-300"
              }`}>
                Median Price
              </td>
              {items.map((item, index) => (
                <td
                  key={index}
                  className={`px-4 py-3 text-center text-base font-bold ${
                    isLight ? "text-blue-600" : "text-emerald-400"
                  }`}
                >
                  {formatPrice(item.stats.medianPrice)}
                </td>
              ))}
            </tr>

            {/* Price Range Row */}
            <tr className={`border-b ${
              isLight ? "border-gray-200" : "border-neutral-700"
            }`}>
              <td className={`px-4 py-3 text-sm font-medium ${
                isLight ? "text-gray-700" : "text-neutral-300"
              }`}>
                Price Range
              </td>
              {items.map((item, index) => (
                <td
                  key={index}
                  className={`px-4 py-3 text-center text-sm ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  {item.stats.priceRange
                    ? `${formatPrice(item.stats.priceRange.min)} - ${formatPrice(item.stats.priceRange.max)}`
                    : "—"}
                </td>
              ))}
            </tr>

            {/* Avg Size Row */}
            <tr className={`border-b ${
              isLight ? "border-gray-200" : "border-neutral-700"
            }`}>
              <td className={`px-4 py-3 text-sm font-medium ${
                isLight ? "text-gray-700" : "text-neutral-300"
              }`}>
                Avg. Size
              </td>
              {items.map((item, index) => (
                <td
                  key={index}
                  className={`px-4 py-3 text-center text-sm ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  {item.stats.avgSqft ? `${item.stats.avgSqft.toLocaleString()} sqft` : "—"}
                </td>
              ))}
            </tr>

            {/* Price/Sqft Row */}
            <tr className={`border-b ${
              isLight ? "border-gray-200" : "border-neutral-700"
            }`}>
              <td className={`px-4 py-3 text-sm font-medium ${
                isLight ? "text-gray-700" : "text-neutral-300"
              }`}>
                Price per Sqft
              </td>
              {items.map((item, index) => (
                <td
                  key={index}
                  className={`px-4 py-3 text-center text-sm ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  {item.stats.avgPricePerSqft ? `$${item.stats.avgPricePerSqft.toLocaleString()}/sqft` : "—"}
                </td>
              ))}
            </tr>

            {/* Days on Market Row */}
            <tr className={`border-b ${
              isLight ? "border-gray-200" : "border-neutral-700"
            }`}>
              <td className={`px-4 py-3 text-sm font-medium ${
                isLight ? "text-gray-700" : "text-neutral-300"
              }`}>
                Avg. Days on Market
              </td>
              {items.map((item, index) => (
                <td
                  key={index}
                  className={`px-4 py-3 text-center text-sm ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  {item.stats.avgDaysOnMarket ? `${item.stats.avgDaysOnMarket} days` : "—"}
                </td>
              ))}
            </tr>

            {/* 1-Year Appreciation Row */}
            <tr className={`border-b ${
              isLight ? "border-gray-200" : "border-neutral-700"
            }`}>
              <td className={`px-4 py-3 text-sm font-medium ${
                isLight ? "text-gray-700" : "text-neutral-300"
              }`}>
                1-Year Appreciation
              </td>
              {items.map((item, index) => (
                <td
                  key={index}
                  className={`px-4 py-3 text-center text-sm font-bold ${
                    getAppreciationColor(item.stats.appreciation?.oneYear)
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {getAppreciationIcon(item.stats.appreciation?.oneYear)}
                    {formatPercent(item.stats.appreciation?.oneYear)}
                  </div>
                </td>
              ))}
            </tr>

            {/* HOA Fees Row */}
            <tr className={`border-b ${
              isLight ? "border-gray-200" : "border-neutral-700"
            }`}>
              <td className={`px-4 py-3 text-sm font-medium ${
                isLight ? "text-gray-700" : "text-neutral-300"
              }`}>
                HOA Fees
              </td>
              {items.map((item, index) => (
                <td
                  key={index}
                  className={`px-4 py-3 text-center text-sm ${
                    isLight ? "text-amber-700" : "text-amber-300"
                  }`}
                >
                  {item.stats.hoa?.avg
                    ? `$${item.stats.hoa.avg}/mo`
                    : item.stats.hoa?.min && item.stats.hoa?.max
                    ? `$${item.stats.hoa.min}-$${item.stats.hoa.max}/mo`
                    : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
