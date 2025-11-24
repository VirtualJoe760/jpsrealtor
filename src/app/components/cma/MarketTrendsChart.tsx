// src/app/components/cma/MarketTrendsChart.tsx
// Line chart showing market trends over time

"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

export interface MarketTrendData {
  date: string; // e.g., "Jan 2024"
  avgPrice: number;
  medianPrice: number;
  avgDaysOnMarket: number;
  listingsCount: number;
}

interface MarketTrendsChartProps {
  data: MarketTrendData[];
  title?: string;
  showDaysOnMarket?: boolean;
}

export default function MarketTrendsChart({
  data,
  title = "Market Trends Analysis",
  showDaysOnMarket = false,
}: MarketTrendsChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes("Price")
                ? `$${entry.value.toLocaleString()}`
                : entry.name.includes("Days")
                ? `${entry.value} days`
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate trend percentage
  const firstPrice = data[0]?.avgPrice || 0;
  const lastPrice = data[data.length - 1]?.avgPrice || 0;
  const trendPercent = ((lastPrice - firstPrice) / firstPrice) * 100;
  const isPositive = trendPercent > 0;

  return (
    <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
            isPositive ? "bg-green-900/30" : "bg-red-900/30"
          }`}>
            <span className={`text-sm font-semibold ${
              isPositive ? "text-green-400" : "text-red-400"
            }`}>
              {isPositive ? "+" : ""}{trendPercent.toFixed(1)}%
            </span>
            <span className="text-gray-400 text-xs">trend</span>
          </div>
        </div>
        <p className="text-gray-400 text-sm">
          Tracking {data.length} months of market activity
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
          />
          <YAxis
            yAxisId="price"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          {showDaysOnMarket && (
            <YAxis
              yAxisId="days"
              orientation="right"
              stroke="#9CA3AF"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              label={{ value: "Days", angle: -90, position: "insideRight", fill: "#9CA3AF" }}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="line"
            formatter={(value) => <span className="text-gray-300">{value}</span>}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="avgPrice"
            stroke="#3B82F6"
            strokeWidth={3}
            name="Avg Price"
            dot={{ fill: "#3B82F6", r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="medianPrice"
            stroke="#10B981"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Median Price"
            dot={{ fill: "#10B981", r: 3 }}
          />
          {showDaysOnMarket && (
            <Line
              yAxisId="days"
              type="monotone"
              dataKey="avgDaysOnMarket"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Avg Days on Market"
              dot={{ fill: "#F59E0B", r: 3 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
