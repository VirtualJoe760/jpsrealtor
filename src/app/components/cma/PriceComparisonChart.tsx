// src/app/components/cma/PriceComparisonChart.tsx
// Bar chart comparing prices of comparable properties

"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Home, TrendingUp } from "lucide-react";

export interface ComparableProperty {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  pricePerSqft: number;
  daysOnMarket?: number;
  isSubject?: boolean; // Highlight the subject property
}

interface PriceComparisonChartProps {
  properties: ComparableProperty[];
  title?: string;
  subjectPropertyId?: string;
}

export default function PriceComparisonChart({
  properties,
  title = "Price Comparison Analysis",
}: PriceComparisonChartProps) {
  // Format data for chart
  const chartData = properties.map((prop) => ({
    name: prop.address.split(",")[0], // Short address
    price: prop.price,
    pricePerSqft: prop.pricePerSqft,
    isSubject: prop.isSubject || false,
  }));

  // Calculate statistics
  const avgPrice = properties.reduce((sum, p) => sum + p.price, 0) / properties.length;
  const minPrice = Math.min(...properties.map((p) => p.price));
  const maxPrice = Math.max(...properties.map((p) => p.price));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">{data.name}</p>
          <p className="text-blue-400 text-sm">
            Price: ${data.price.toLocaleString()}
          </p>
          <p className="text-gray-400 text-xs">
            ${data.pricePerSqft.toFixed(0)}/sqft
          </p>
          {data.isSubject && (
            <p className="text-purple-400 text-xs mt-1">📍 Subject Property</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Home className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-400">Avg Price:</span>
            <span className="text-white font-semibold ml-2">
              ${avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Range:</span>
            <span className="text-white font-semibold ml-2">
              ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="name"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
            formatter={(value) => <span className="text-gray-300">{value}</span>}
          />
          <Bar dataKey="price" name="List Price" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isSubject ? "#A78BFA" : "#3B82F6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex gap-4 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-gray-400">Comparable Properties</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-400 rounded"></div>
          <span className="text-gray-400">Subject Property</span>
        </div>
      </div>
    </div>
  );
}
