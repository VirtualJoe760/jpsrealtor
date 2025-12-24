"use client";

import { Card } from "@/app/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, MapPin, Building2 } from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

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
  };
}

interface AppreciationCardProps {
  data: AppreciationData;
}

export function AppreciationCard({ data }: AppreciationCardProps) {
  const { appreciation, marketData, location, period } = data;
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Determine trend icon and color (Bullish/Bearish terminology)
  const getTrendIcon = () => {
    switch (appreciation.trend) {
      case "bullish":
        return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      case "bearish":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case "neutral":
        return <Minus className="h-5 w-5 text-blue-500" />;
      case "mixed":
        return <Minus className="h-5 w-5 text-amber-500" />;
      default:
        return <Minus className="h-5 w-5 text-slate-500" />;
    }
  };

  const getTrendColor = () => {
    switch (appreciation.trend) {
      case "bullish":
        return isLight ? "text-emerald-600" : "text-emerald-400";
      case "bearish":
        return isLight ? "text-red-600" : "text-red-400";
      case "neutral":
        return isLight ? "text-blue-600" : "text-blue-400";
      case "mixed":
        return isLight ? "text-amber-600" : "text-amber-400";
      default:
        return isLight ? "text-slate-600" : "text-slate-400";
    }
  };

  const getConfidenceBadge = () => {
    const colors = {
      high: isLight ? "bg-emerald-100 text-emerald-800" : "bg-emerald-900/30 text-emerald-300",
      medium: isLight ? "bg-amber-100 text-amber-800" : "bg-amber-900/30 text-amber-300",
      low: isLight ? "bg-slate-100 text-slate-800" : "bg-slate-800/30 text-slate-300"
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[marketData.confidence]}`}>
        {marketData.confidence.toUpperCase()} CONFIDENCE
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const getLocationDisplay = () => {
    const iconClass = "h-4 w-4 text-slate-500";
    const textClass = `font-medium ${isLight ? 'text-slate-700' : 'text-slate-200'}`;

    if (location?.subdivision) {
      return (
        <div className="flex items-center gap-2">
          <Building2 className={iconClass} />
          <span className={textClass}>{location.subdivision}</span>
        </div>
      );
    }
    if (location?.city) {
      return (
        <div className="flex items-center gap-2">
          <MapPin className={iconClass} />
          <span className={textClass}>{location.city}</span>
        </div>
      );
    }
    if (location?.county) {
      return (
        <div className="flex items-center gap-2">
          <MapPin className={iconClass} />
          <span className={textClass}>{location.county} County</span>
        </div>
      );
    }
    return null;
  };

  const periodDisplay = {
    "1y": "1 Year",
    "3y": "3 Years",
    "5y": "5 Years",
    "10y": "10 Years"
  }[period] || period;

  const priceChange = marketData.endAvgPrice - marketData.startAvgPrice;
  const priceChangePercent = ((priceChange / marketData.startAvgPrice) * 100).toFixed(1);

  // Get first and last year data for comprehensive stats
  const startYear = appreciation.byYear?.[0];
  const endYear = appreciation.byYear?.[appreciation.byYear.length - 1];

  return (
    <Card className={`overflow-hidden shadow-lg ${
      isLight
        ? 'border-slate-200 bg-white'
        : 'border-slate-800 bg-slate-900'
    }`}>
      {/* Header */}
      <div className={`p-6 border-b ${
        isLight
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-slate-200'
          : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-800'
      }`}>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className={`h-5 w-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Market Appreciation Analysis
              </h3>
            </div>
            {getLocationDisplay()}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{periodDisplay}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Appreciation Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Annual Appreciation */}
          <div className={`rounded-lg p-4 border ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Annual Rate
              </span>
            </div>
            <p className={`text-3xl font-bold ${getTrendColor()}`}>
              {appreciation.annual > 0 ? "+" : ""}{appreciation.annual}%
            </p>
          </div>

          {/* 2-Year Appreciation */}
          <div className={`rounded-lg p-4 border ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
              <span className={`text-sm font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                2-Year
              </span>
            </div>
            <p className={`text-3xl font-bold ${getTrendColor()}`}>
              {appreciation.twoYear > 0 ? "+" : ""}{appreciation.twoYear}%
            </p>
          </div>

          {/* 5-Year Appreciation */}
          <div className={`rounded-lg p-4 border ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span className={`text-sm font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                5-Year
              </span>
            </div>
            <p className={`text-3xl font-bold ${getTrendColor()}`}>
              {appreciation.fiveYear > 0 ? "+" : ""}{appreciation.fiveYear}%
            </p>
          </div>

          {/* Trend */}
          <div className={`rounded-lg p-4 border ${
            isLight
              ? 'bg-slate-50 border-slate-200'
              : 'bg-slate-800/50 border-slate-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Market Trend
              </span>
            </div>
            <p className={`text-2xl font-bold capitalize ${getTrendColor()}`}>
              {appreciation.trend}
            </p>
          </div>
        </div>

        {/* Year-over-Year Performance Chart */}
        {appreciation.byYear && appreciation.byYear.length > 0 && (
          <div className="space-y-3">
            <h4 className={`text-sm font-semibold uppercase tracking-wide ${
              isLight ? 'text-slate-700' : 'text-slate-300'
            }`}>
              Year-over-Year Performance
            </h4>
            <div className={`rounded-lg p-4 border ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-slate-800/50 border-slate-700'
            }`}>
              {/* Chart Container */}
              <div className="space-y-4">
                {/* Bar Chart */}
                <div className="relative w-full h-48">
                  <div className="absolute inset-0 flex items-end justify-around gap-2 pb-6">
                    {appreciation.byYear.map((yearData, index) => {
                      const maxRate = Math.max(...appreciation.byYear!.map(y => Math.abs(y.appreciationRate)));
                      const heightPercent = maxRate > 0 ? (Math.abs(yearData.appreciationRate) / maxRate) * 100 : 0;
                      const isPositive = yearData.appreciationRate >= 0;

                      return (
                        <div key={yearData.year} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          {/* Rate Label Above Bar */}
                          <div className="mb-1">
                            <span className={`text-xs font-bold ${
                              isPositive
                                ? (isLight ? 'text-emerald-600' : 'text-emerald-400')
                                : (isLight ? 'text-red-600' : 'text-red-400')
                            }`}>
                              {isPositive ? '+' : ''}{yearData.appreciationRate.toFixed(1)}%
                            </span>
                          </div>

                          {/* Bar */}
                          <div className="relative w-full group" style={{ height: `${Math.max(heightPercent, 10)}%` }}>
                            <div
                              className={`w-full h-full rounded-t transition-all cursor-pointer ${
                                isPositive
                                  ? 'bg-gradient-to-t from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500'
                                  : 'bg-gradient-to-t from-red-500 to-red-400 hover:from-red-600 hover:to-red-500'
                              }`}
                            >
                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                <div className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-xl ${
                                  isLight
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-900'
                                }`}>
                                  <p className="font-semibold">{yearData.year}</p>
                                  <p className={isPositive
                                    ? (isLight ? 'text-emerald-300' : 'text-emerald-600')
                                    : (isLight ? 'text-red-300' : 'text-red-600')
                                  }>
                                    {isPositive ? '+' : ''}{yearData.appreciationRate.toFixed(1)}% appreciation
                                  </p>
                                  <p className={isLight ? 'text-slate-300' : 'text-slate-700'}>
                                    Avg Sale: {formatCurrency(yearData.avgSalePrice)}
                                  </p>
                                  <p className={isLight ? 'text-slate-300' : 'text-slate-700'}>
                                    Avg/SqFt: {formatCurrency(yearData.avgPricePerSqFt)}
                                  </p>
                                  <p className={`text-xs ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {formatNumber(yearData.salesCount)} sales
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Year Label Below */}
                          <span className={`text-xs font-medium mt-2 ${
                            isLight ? 'text-slate-600' : 'text-slate-400'
                          }`}>
                            {yearData.year}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className={`flex items-center justify-center gap-6 pt-2 border-t ${
                  isLight ? 'border-slate-200' : 'border-slate-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gradient-to-t from-emerald-500 to-emerald-400"></div>
                    <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Positive Growth</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gradient-to-t from-red-500 to-red-400"></div>
                    <span className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Negative Growth</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Average Price Data */}
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold uppercase tracking-wide ${
            isLight ? 'text-slate-700' : 'text-slate-300'
          }`}>
            Average Price Metrics
          </h4>

          {/* Overall Price Change Highlight */}
          <div className={`p-4 rounded-lg border ${
            isLight
              ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
              : 'bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border-blue-800'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`text-sm font-medium ${
                  isLight ? 'text-blue-900' : 'text-blue-100'
                }`}>
                  Average Price Change
                </span>
                <p className={`text-xs mt-1 ${
                  isLight ? 'text-blue-700' : 'text-blue-300'
                }`}>
                  {formatCurrency(marketData.startAvgPrice)} → {formatCurrency(marketData.endAvgPrice)}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  priceChange >= 0
                    ? (isLight ? 'text-emerald-600' : 'text-emerald-400')
                    : (isLight ? 'text-red-600' : 'text-red-400')
                }`}>
                  {priceChange >= 0 ? "+" : ""}{formatCurrency(priceChange)}
                </p>
                <p className={`text-sm ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>
                  ({priceChange >= 0 ? "+" : ""}{priceChangePercent}%)
                </p>
              </div>
            </div>
          </div>

          {/* Grid of Average Metrics */}
          {endYear && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Average List Price */}
              <div className={`rounded-lg p-4 border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-800/50 border-slate-700'
              }`}>
                <span className={`text-xs uppercase tracking-wide ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>Avg List Price</span>
                <p className={`text-lg font-bold mt-1 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {formatCurrency(endYear.avgListPrice)}
                </p>
              </div>

              {/* Average Sale Price */}
              <div className={`rounded-lg p-4 border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-800/50 border-slate-700'
              }`}>
                <span className={`text-xs uppercase tracking-wide ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>Avg Sale Price</span>
                <p className={`text-lg font-bold mt-1 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {formatCurrency(endYear.avgSalePrice)}
                </p>
              </div>

              {/* Average Price per SqFt */}
              <div className={`rounded-lg p-4 border ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-800/50 border-slate-700'
              }`}>
                <span className={`text-xs uppercase tracking-wide ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>Avg Price/SqFt</span>
                <p className={`text-lg font-bold mt-1 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {formatCurrency(endYear.avgPricePerSqFt)}
                </p>
              </div>
            </div>
          )}

          {/* Reference Data (Min/Max/Median) */}
          {endYear && (
            <div className={`rounded-lg p-4 border ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-slate-800/50 border-slate-700'
            }`}>
              <h5 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}>
                Reference Data (Most Recent Year)
              </h5>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-slate-500">Minimum</span>
                  <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {formatCurrency(endYear.minPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Median</span>
                  <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {formatCurrency(endYear.medianPrice)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Maximum</span>
                  <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {formatCurrency(endYear.maxPrice)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Market Data */}
        <div className="space-y-3">
          <h4 className={`text-sm font-semibold uppercase tracking-wide ${
            isLight ? 'text-slate-700' : 'text-slate-300'
          }`}>
            Market Data
          </h4>
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isLight ? 'bg-slate-50' : 'bg-slate-800/50'
          }`}>
            <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Total Sales</span>
            <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {formatNumber(marketData.totalSales)}
            </span>
          </div>
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isLight ? 'bg-slate-50' : 'bg-slate-800/50'
          }`}>
            <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Data Confidence</span>
            {getConfidenceBadge()}
          </div>
          {data.metadata?.mlsSources && data.metadata.mlsSources.length > 0 && (
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              isLight ? 'bg-slate-50' : 'bg-slate-800/50'
            }`}>
              <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>MLS Sources</span>
              <span className={`text-sm font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {data.metadata.mlsSources.join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="px-6 pb-6">
        <div className={`p-3 border rounded-lg ${
          isLight
            ? 'bg-amber-50 border-amber-200'
            : 'bg-amber-900/20 border-amber-800'
        }`}>
          <p className={`text-xs ${isLight ? 'text-amber-800' : 'text-amber-200'}`}>
            <strong>Note:</strong> {marketData.confidence === "low"
              ? "Small sample size - results may vary with more data."
              : marketData.confidence === "medium"
              ? "Moderate sample size - reasonably reliable trend."
              : "Large sample size - statistically significant trend."}
          </p>
        </div>
      </div>
    </Card>
  );
}
