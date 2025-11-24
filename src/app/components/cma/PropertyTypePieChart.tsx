// src/app/components/cma/PropertyTypePieChart.tsx
// Pie chart showing property type distribution

"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

export interface PropertyTypeData {
  type: string;
  count: number;
  avgPrice: number;
}

interface PropertyTypePieChartProps {
  data: PropertyTypeData[];
  title?: string;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function PropertyTypePieChart({
  data,
  title = "Property Type Distribution",
}: PropertyTypePieChartProps) {
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.count / totalCount) * 100).toFixed(1);
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-1">{data.type}</p>
          <p className="text-blue-400 text-sm">{data.count} properties</p>
          <p className="text-gray-400 text-xs">{percentage}% of total</p>
          <p className="text-green-400 text-xs mt-1">
            Avg: ${data.avgPrice.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap gap-3 justify-center mt-4">
        {payload.map((entry: any, index: number) => {
          const percentage = ((entry.payload.count / totalCount) * 100).toFixed(0);
          return (
            <div
              key={`legend-${index}`}
              className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-300 text-sm">{entry.value}</span>
              <span className="text-gray-500 text-xs">({percentage}%)</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <PieChartIcon className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm">
          Total: {totalCount} properties across {data.length} types
        </p>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
