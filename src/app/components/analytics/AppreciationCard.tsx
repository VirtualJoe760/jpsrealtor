"use client";

import { Card } from "@/app/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, MapPin, Building2 } from "lucide-react";

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
    trend: "increasing" | "decreasing" | "stable";
  };
  marketData: {
    startMedianPrice: number;
    endMedianPrice: number;
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

  // Determine trend icon and color
  const getTrendIcon = () => {
    switch (appreciation.trend) {
      case "increasing":
        return <TrendingUp className="h-5 w-5 text-emerald-500" />;
      case "decreasing":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-amber-500" />;
    }
  };

  const getTrendColor = () => {
    switch (appreciation.trend) {
      case "increasing":
        return "text-emerald-600 dark:text-emerald-400";
      case "decreasing":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-amber-600 dark:text-amber-400";
    }
  };

  const getConfidenceBadge = () => {
    const colors = {
      high: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      low: "bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-300"
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
    if (location?.subdivision) {
      return (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-500" />
          <span className="font-medium">{location.subdivision}</span>
        </div>
      );
    }
    if (location?.city) {
      return (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-500" />
          <span className="font-medium">{location.city}</span>
        </div>
      );
    }
    if (location?.county) {
      return (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-500" />
          <span className="font-medium">{location.county} County</span>
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

  const priceChange = marketData.endMedianPrice - marketData.startMedianPrice;
  const priceChangePercent = ((priceChange / marketData.startMedianPrice) * 100).toFixed(1);

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Market Appreciation Analysis
              </h3>
            </div>
            {getLocationDisplay()}
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">{periodDisplay}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Appreciation Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Annual Appreciation */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon()}
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Annual Rate
              </span>
            </div>
            <p className={`text-3xl font-bold ${getTrendColor()}`}>
              {appreciation.annual > 0 ? "+" : ""}{appreciation.annual}%
            </p>
          </div>

          {/* Cumulative Appreciation */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Cumulative
              </span>
            </div>
            <p className={`text-3xl font-bold ${getTrendColor()}`}>
              {appreciation.cumulative > 0 ? "+" : ""}{appreciation.cumulative}%
            </p>
          </div>

          {/* Trend */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon()}
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Trend
              </span>
            </div>
            <p className={`text-2xl font-bold capitalize ${getTrendColor()}`}>
              {appreciation.trend}
            </p>
          </div>
        </div>

        {/* Price Information */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Price Data
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-600 dark:text-slate-400">Start Median Price</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(marketData.startMedianPrice)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-600 dark:text-slate-400">End Median Price</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatCurrency(marketData.endMedianPrice)}
              </span>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Price Change
              </span>
              <div className="text-right">
                <p className={`text-2xl font-bold ${priceChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {priceChange >= 0 ? "+" : ""}{formatCurrency(priceChange)}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ({priceChange >= 0 ? "+" : ""}{priceChangePercent}%)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Market Data */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Market Data
          </h4>
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Sales</span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatNumber(marketData.totalSales)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <span className="text-sm text-slate-600 dark:text-slate-400">Data Confidence</span>
            {getConfidenceBadge()}
          </div>
          {data.metadata?.mlsSources && data.metadata.mlsSources.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-sm text-slate-600 dark:text-slate-400">MLS Sources</span>
              <span className="text-sm font-medium text-slate-900 dark:text-white">
                {data.metadata.mlsSources.join(", ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Note */}
      <div className="px-6 pb-6">
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-200">
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
