"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/components/ui/chart";
import type { ChartConfig } from "@/app/components/ui/chart";
import { useTheme } from "@/app/contexts/ThemeContext";

interface CmaActiveVsClosedProps {
  active: {
    avgPrice: number;
    avgPricePerSqft: number;
    avgDom: number;
    [key: string]: unknown;
  };
  closed: {
    avgClosePrice: number;
    avgPricePerSqft: number;
    avgDom: number;
    [key: string]: unknown;
  };
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export default function CmaActiveVsClosed({
  active,
  closed,
}: CmaActiveVsClosedProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const metrics = [
    {
      title: "Avg Price",
      data: [
        { name: "Active", active: active.avgPrice, closed: closed.avgClosePrice },
      ],
      activeVal: active.avgPrice,
      closedVal: closed.avgClosePrice,
      tickFormat: (v: number) => formatCurrency(v),
    },
    {
      title: "Avg $/SqFt",
      data: [
        { name: "$/SqFt", active: Math.round(active.avgPricePerSqft), closed: Math.round(closed.avgPricePerSqft) },
      ],
      activeVal: Math.round(active.avgPricePerSqft),
      closedVal: Math.round(closed.avgPricePerSqft),
      tickFormat: (v: number) => `$${v}`,
    },
    {
      title: "Avg Days on Market",
      data: [
        { name: "DOM", active: Math.round(active.avgDom), closed: Math.round(closed.avgDom) },
      ],
      activeVal: Math.round(active.avgDom),
      closedVal: Math.round(closed.avgDom),
      tickFormat: (v: number) => `${v}`,
    },
  ];

  const chartConfig = {
    active: { label: "Active", color: isLight ? "#3b82f6" : "#60a5fa" },
    closed: { label: "Closed", color: isLight ? "#10b981" : "#34d399" },
  } satisfies ChartConfig;

  return (
    <div
      className={`rounded-xl p-4 ${
        isLight
          ? "bg-white/70 border border-gray-200 shadow-sm"
          : "bg-white/5 border border-white/10"
      }`}
    >
      <h4
        className={`text-sm font-semibold mb-4 ${
          isLight ? "text-gray-700" : "text-gray-300"
        }`}
      >
        Active vs Closed Comparison
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.title}>
            <p
              className={`text-xs font-medium text-center mb-2 ${
                isLight ? "text-gray-500" : "text-gray-400"
              }`}
            >
              {m.title}
            </p>
            <ChartContainer config={chartConfig} className="h-[180px] w-full">
              <BarChart data={m.data} barCategoryGap="30%">
                <XAxis dataKey="name" hide />
                <YAxis
                  tickFormatter={m.tickFormat}
                  tick={{ fontSize: 10, fill: isLight ? "#9ca3af" : "#6b7280" }}
                  width={55}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [m.tickFormat(value as number), ""]}
                    />
                  }
                />
                <Bar dataKey="active" fill="var(--color-active)" radius={[6, 6, 0, 0]} barSize={40} />
                <Bar dataKey="closed" fill="var(--color-closed)" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ChartContainer>
            {/* Values below chart */}
            <div className="flex justify-center gap-4 mt-1">
              <span className="text-xs font-semibold" style={{ color: isLight ? "#3b82f6" : "#60a5fa" }}>
                {m.tickFormat(m.activeVal)}
              </span>
              <span className="text-xs font-semibold" style={{ color: isLight ? "#10b981" : "#34d399" }}>
                {m.tickFormat(m.closedVal)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: isLight ? "#3b82f6" : "#60a5fa" }} />
          <span className={`text-xs ${isLight ? "text-gray-600" : "text-gray-400"}`}>Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: isLight ? "#10b981" : "#34d399" }} />
          <span className={`text-xs ${isLight ? "text-gray-600" : "text-gray-400"}`}>Closed</span>
        </div>
      </div>
    </div>
  );
}
