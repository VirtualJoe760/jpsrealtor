"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/components/ui/chart";
import type { ChartConfig } from "@/app/components/ui/chart";
import { useTheme } from "@/app/contexts/ThemeContext";

interface BySubType {
  subType: string;
  activeCount: number;
  closedCount: number;
  medianSalePrice: number;
  avgSalePpsf: number;
  avgDom: number;
  avgSaleToListRatio: number;
}

interface CmaSubTypeBreakdownProps {
  bySubType: BySubType[];
}

const PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

function formatPrice(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function buildChartConfig(items: { name: string }[]): ChartConfig {
  const config: ChartConfig = {};
  items.forEach((item, i) => {
    config[item.name] = {
      label: item.name,
      color: PALETTE[i % PALETTE.length],
    };
  });
  return config;
}

export default function CmaSubTypeBreakdown({
  bySubType,
}: CmaSubTypeBreakdownProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const pieData = bySubType
    .filter((s) => s.activeCount > 0)
    .map((s) => ({ name: s.subType, value: s.activeCount }));

  const barData = bySubType
    .filter((s) => s.medianSalePrice > 0)
    .map((s) => ({ name: s.subType, medianSalePrice: s.medianSalePrice }));

  if (bySubType.length === 0) return null;

  const pieConfig = buildChartConfig(pieData);

  // Bar config: one entry per subtype for coloring
  const barConfig: ChartConfig = {};
  barData.forEach((item, i) => {
    barConfig[item.name] = {
      label: item.name,
      color: PALETTE[i % PALETTE.length],
    };
  });
  barConfig.medianSalePrice = { label: "Median Sale Price" };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Donut chart - active count distribution */}
      <div
        className={`rounded-xl p-4 ${
          isLight
            ? "bg-white/70 border border-gray-200 shadow-sm"
            : "bg-white/5 border border-white/10"
        }`}
      >
        <h4
          className={`text-sm font-semibold mb-3 ${
            isLight ? "text-gray-700" : "text-gray-300"
          }`}
        >
          Active Listings by Type
        </h4>
        {pieData.length > 0 ? (
          <ChartContainer config={pieConfig} className="h-[260px] w-full">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={PALETTE[i % PALETTE.length]}
                  />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            </PieChart>
          </ChartContainer>
        ) : (
          <p
            className={`text-sm text-center py-10 ${
              isLight ? "text-gray-400" : "text-gray-500"
            }`}
          >
            No active listings data
          </p>
        )}
        {/* Legend */}
        {pieData.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
            {pieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: PALETTE[i % PALETTE.length] }}
                />
                <span
                  className={`text-xs ${
                    isLight ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bar chart - median sale price */}
      <div
        className={`rounded-xl p-4 ${
          isLight
            ? "bg-white/70 border border-gray-200 shadow-sm"
            : "bg-white/5 border border-white/10"
        }`}
      >
        <h4
          className={`text-sm font-semibold mb-3 ${
            isLight ? "text-gray-700" : "text-gray-300"
          }`}
        >
          Median Sale Price by Type
        </h4>
        {barData.length > 0 ? (
          <ChartContainer config={barConfig} className="h-[260px] w-full">
            <BarChart data={barData}>
              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 11,
                  fill: isLight ? "#6b7280" : "#9ca3af",
                }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatPrice}
                tick={{
                  fontSize: 11,
                  fill: isLight ? "#6b7280" : "#9ca3af",
                }}
                width={70}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [
                      formatPrice(value as number),
                      "Median Price",
                    ]}
                  />
                }
              />
              <Bar dataKey="medianSalePrice" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={PALETTE[i % PALETTE.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <p
            className={`text-sm text-center py-10 ${
              isLight ? "text-gray-400" : "text-gray-500"
            }`}
          >
            No closed sales data
          </p>
        )}
      </div>
    </div>
  );
}
