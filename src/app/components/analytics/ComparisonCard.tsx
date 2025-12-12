"use client";

import { Card } from "@/app/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BarChart3, Calendar, MapPin, Building2, Award, ArrowRight } from "lucide-react";

interface LocationData {
  name: string;
  appreciation: {
    annual: number;
    cumulative: number;
    trend: "increasing" | "decreasing" | "stable" | "volatile";
  };
  marketData: {
    startMedianPrice: number;
    endMedianPrice: number;
    totalSales: number;
    confidence: "high" | "medium" | "low";
  };
}

interface ComparisonData {
  location1: LocationData;
  location2: LocationData;
  period: string;
  winner?: string;
  insights?: {
    annualDifference?: number;
    cumulativeDifference?: number;
    priceGrowth?: string;
    marketStrength?: string;
  };
}

interface ComparisonCardProps {
  data: ComparisonData;
}

export function ComparisonCard({ data }: ComparisonCardProps) {
  const { location1, location2, period, winner, insights } = data;

  // Determine trend icon and color
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "volatile":
        return <BarChart3 className="h-4 w-4 text-amber-500" />;
      default:
        return <Minus className="h-4 w-4 text-slate-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "increasing":
        return "text-emerald-600 dark:text-emerald-400";
      case "decreasing":
        return "text-red-600 dark:text-red-400";
      case "volatile":
        return "text-amber-600 dark:text-amber-400";
      default:
        return "text-slate-600 dark:text-slate-400";
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      high: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
      medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
      low: "bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-300"
    };

    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[confidence as keyof typeof colors]}`}>
        {confidence.toUpperCase()}
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

  const periodDisplay = {
    "1y": "1 Year",
    "3y": "3 Years",
    "5y": "5 Years",
    "10y": "10 Years"
  }[period] || period;

  const isWinner = (locationName: string) => {
    return winner === locationName;
  };

  const priceChange1 = location1.marketData.endMedianPrice - location1.marketData.startMedianPrice;
  const priceChange2 = location2.marketData.endMedianPrice - location2.marketData.startMedianPrice;

  return (
    <Card className="overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-800 dark:to-slate-900 p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Market Appreciation Comparison
              </h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
              <span>{periodDisplay} Analysis</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="p-6">
        {/* Location Names */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Location 1 */}
          <div className={`relative p-4 rounded-lg border-2 ${isWinner(location1.name) ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
            {isWinner(location1.name) && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1 px-3 py-1 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full text-xs font-bold shadow-lg">
                  <Award className="h-3 w-3" />
                  <span>WINNER</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 justify-center">
              <Building2 className="h-5 w-5 text-slate-500" />
              <h4 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                {location1.name}
              </h4>
            </div>
          </div>

          {/* Location 2 */}
          <div className={`relative p-4 rounded-lg border-2 ${isWinner(location2.name) ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
            {isWinner(location2.name) && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1 px-3 py-1 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full text-xs font-bold shadow-lg">
                  <Award className="h-3 w-3" />
                  <span>WINNER</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 justify-center">
              <Building2 className="h-5 w-5 text-slate-500" />
              <h4 className="text-lg font-bold text-slate-900 dark:text-white text-center">
                {location2.name}
              </h4>
            </div>
          </div>
        </div>

        {/* Annual Appreciation */}
        <div className="mb-6">
          <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            Annual Appreciation
          </h5>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                {getTrendIcon(location1.appreciation.trend)}
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Annual Rate</span>
              </div>
              <p className={`text-3xl font-bold ${getTrendColor(location1.appreciation.trend)}`}>
                {location1.appreciation.annual > 0 ? "+" : ""}{location1.appreciation.annual}%
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                {getTrendIcon(location2.appreciation.trend)}
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Annual Rate</span>
              </div>
              <p className={`text-3xl font-bold ${getTrendColor(location2.appreciation.trend)}`}>
                {location2.appreciation.annual > 0 ? "+" : ""}{location2.appreciation.annual}%
              </p>
            </div>
          </div>
        </div>

        {/* Cumulative Appreciation */}
        <div className="mb-6">
          <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            Cumulative Appreciation
          </h5>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Growth</span>
              </div>
              <p className={`text-3xl font-bold ${getTrendColor(location1.appreciation.trend)}`}>
                {location1.appreciation.cumulative > 0 ? "+" : ""}{location1.appreciation.cumulative}%
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Growth</span>
              </div>
              <p className={`text-3xl font-bold ${getTrendColor(location2.appreciation.trend)}`}>
                {location2.appreciation.cumulative > 0 ? "+" : ""}{location2.appreciation.cumulative}%
              </p>
            </div>
          </div>
        </div>

        {/* Price Data */}
        <div className="mb-6">
          <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            Median Price Change
          </h5>
          <div className="grid grid-cols-2 gap-6">
            {/* Location 1 Price */}
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded text-sm">
                <span className="text-slate-600 dark:text-slate-400">Start</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(location1.marketData.startMedianPrice)}
                </span>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded text-sm">
                <span className="text-slate-600 dark:text-slate-400">End</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(location1.marketData.endMedianPrice)}
                </span>
              </div>
              <div className={`p-3 rounded-lg text-center ${priceChange1 >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <p className={`text-xl font-bold ${priceChange1 >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {priceChange1 >= 0 ? "+" : ""}{formatCurrency(priceChange1)}
                </p>
              </div>
            </div>

            {/* Location 2 Price */}
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded text-sm">
                <span className="text-slate-600 dark:text-slate-400">Start</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(location2.marketData.startMedianPrice)}
                </span>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded text-sm">
                <span className="text-slate-600 dark:text-slate-400">End</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(location2.marketData.endMedianPrice)}
                </span>
              </div>
              <div className={`p-3 rounded-lg text-center ${priceChange2 >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <p className={`text-xl font-bold ${priceChange2 >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {priceChange2 >= 0 ? "+" : ""}{formatCurrency(priceChange2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Market Data */}
        <div className="mb-6">
          <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
            Market Data
          </h5>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Sales</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatNumber(location1.marketData.totalSales)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Confidence</span>
                {getConfidenceBadge(location1.marketData.confidence)}
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Trend</span>
                <span className={`text-sm font-semibold capitalize ${getTrendColor(location1.appreciation.trend)}`}>
                  {location1.appreciation.trend}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Sales</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatNumber(location2.marketData.totalSales)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Confidence</span>
                {getConfidenceBadge(location2.marketData.confidence)}
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                <span className="text-sm text-slate-600 dark:text-slate-400">Trend</span>
                <span className={`text-sm font-semibold capitalize ${getTrendColor(location2.appreciation.trend)}`}>
                  {location2.appreciation.trend}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        {insights && (
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <h5 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
              Comparison Insights
            </h5>
            <div className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
              {insights.annualDifference !== undefined && (
                <p>
                  <strong>Annual Difference:</strong> {Math.abs(insights.annualDifference).toFixed(2)}%
                  {insights.annualDifference > 0 ? ` in favor of ${location1.name}` : ` in favor of ${location2.name}`}
                </p>
              )}
              {insights.cumulativeDifference !== undefined && (
                <p>
                  <strong>Cumulative Difference:</strong> {Math.abs(insights.cumulativeDifference).toFixed(2)}%
                  {insights.cumulativeDifference > 0 ? ` in favor of ${location1.name}` : ` in favor of ${location2.name}`}
                </p>
              )}
              {insights.priceGrowth && (
                <p><strong>Price Growth:</strong> {insights.priceGrowth}</p>
              )}
              {insights.marketStrength && (
                <p><strong>Market Strength:</strong> {insights.marketStrength}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
