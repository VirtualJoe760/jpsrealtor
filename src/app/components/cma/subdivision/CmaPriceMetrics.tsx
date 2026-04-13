"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/components/ui/chart";
import type { ChartConfig } from "@/app/components/ui/chart";
import { useTheme } from "@/app/contexts/ThemeContext";

interface CmaPriceMetricsProps {
  active: {
    minListPrice: number;
    medianListPrice: number;
    maxListPrice: number;
    [key: string]: unknown;
  };
  closed: {
    minSalePrice: number;
    medianSalePrice: number;
    maxSalePrice: number;
    [key: string]: unknown;
  };
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

const chartConfig = {
  activePrice: { label: "Active (List)", color: "#3b82f6" },
  closedPrice: { label: "Closed (Sale)", color: "#10b981" },
} satisfies ChartConfig;

export default function CmaPriceMetrics({
  active,
  closed,
}: CmaPriceMetricsProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const data = [
    {
      label: "Min",
      activePrice: active.minListPrice,
      closedPrice: closed.minSalePrice,
    },
    {
      label: "Median",
      activePrice: active.medianListPrice,
      closedPrice: closed.medianSalePrice,
    },
    {
      label: "Max",
      activePrice: active.maxListPrice,
      closedPrice: closed.maxSalePrice,
    },
  ];

  return (
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
        Price Spread
      </h4>

      <ChartContainer config={chartConfig} className="h-[260px] w-full">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="fillActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-activePrice)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--color-activePrice)" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fillClosed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-closedPrice)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--color-closedPrice)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isLight ? "#e5e7eb" : "#374151"}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{
              fontSize: 12,
              fill: isLight ? "#6b7280" : "#9ca3af",
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={{
              fontSize: 11,
              fill: isLight ? "#6b7280" : "#9ca3af",
            }}
            width={65}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => [formatCurrency(value as number)]}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="activePrice"
            stroke="var(--color-activePrice)"
            strokeWidth={2}
            fill="url(#fillActive)"
          />
          <Area
            type="monotone"
            dataKey="closedPrice"
            stroke="var(--color-closedPrice)"
            strokeWidth={2}
            fill="url(#fillClosed)"
          />
        </AreaChart>
      </ChartContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: "#3b82f6" }}
          />
          <span
            className={`text-xs ${
              isLight ? "text-gray-600" : "text-gray-400"
            }`}
          >
            Active (List)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: "#10b981" }}
          />
          <span
            className={`text-xs ${
              isLight ? "text-gray-600" : "text-gray-400"
            }`}
          >
            Closed (Sale)
          </span>
        </div>
      </div>
    </div>
  );
}
