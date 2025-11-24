// src/app/components/cma/PricePerSqftScatter.tsx
// Scatter plot analyzing price per square foot

"use client";

import React from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Cell } from "recharts";
import { Maximize2 } from "lucide-react";

export interface PricePerSqftData {
  address: string;
  sqft: number;
  price: number;
  pricePerSqft: number;
  beds: number;
  baths: number;
  isSubject?: boolean;
}

interface PricePerSqftScatterProps {
  data: PricePerSqftData[];
  title?: string;
}

export default function PricePerSqftScatter({
  data,
  title = "Price per Square Foot Analysis",
}: PricePerSqftScatterProps) {
  // Calculate averages
  const avgPricePerSqft =
    data.reduce((sum, item) => sum + item.pricePerSqft, 0) / data.length;
  const avgSqft = data.reduce((sum, item) => sum + item.sqft, 0) / data.length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-1 text-sm">
            {data.address.split(",")[0]}
          </p>
          <p className="text-blue-400 text-xs">
            Price: ${data.price.toLocaleString()}
          </p>
          <p className="text-green-400 text-xs">
            {data.sqft.toLocaleString()} sqft
          </p>
          <p className="text-yellow-400 text-xs">
            ${data.pricePerSqft.toFixed(0)}/sqft
          </p>
          <p className="text-gray-400 text-xs">
            {data.beds}bd / {data.baths}ba
          </p>
          {data.isSubject && (
            <p className="text-purple-400 text-xs mt-1">📍 Subject Property</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Format data for scatter chart
  const scatterData = data.map((item) => ({
    ...item,
    x: item.sqft,
    y: item.price,
    z: item.pricePerSqft,
  }));

  return (
    <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Maximize2 className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-400">Avg $/sqft:</span>
            <span className="text-white font-semibold ml-2">
              ${avgPricePerSqft.toFixed(0)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Avg Size:</span>
            <span className="text-white font-semibold ml-2">
              {avgSqft.toLocaleString(undefined, { maximumFractionDigits: 0 })} sqft
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            type="number"
            dataKey="x"
            name="Square Feet"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            label={{
              value: "Square Feet",
              position: "insideBottom",
              offset: -10,
              fill: "#9CA3AF",
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Price"
            stroke="#9CA3AF"
            tick={{ fill: "#9CA3AF", fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            label={{
              value: "Price",
              angle: -90,
              position: "insideLeft",
              fill: "#9CA3AF",
            }}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          <Scatter name="Properties" data={scatterData} fill="#3B82F6">
            {scatterData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isSubject ? "#A78BFA" : "#3B82F6"}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4 flex gap-4 justify-center text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-gray-400">Comparable Properties</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
          <span className="text-gray-400">Subject Property</span>
        </div>
      </div>

      <p className="text-center text-gray-500 text-xs mt-3">
        Bubble size represents price per sqft value
      </p>
    </div>
  );
}
