"use client";

import React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/app/components/ui/chart";
import type { ChartConfig } from "@/app/components/ui/chart";
import { useTheme } from "@/app/contexts/ThemeContext";

interface SaleComp {
  address: string;
  closeDate: string;
  closePrice: number;
  listPrice: number;
  originalListPrice: number;
  livingArea: number;
  bedsTotal: number;
  bathsTotal: number;
  daysOnMarket: number;
}

interface CmaSalesTimelineProps {
  topComps: SaleComp[];
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

const chartConfig = {
  listPrice: {
    label: "List Price",
    color: "hsl(217, 91%, 60%)",
  },
  salePrice: {
    label: "Sale Price",
    color: "hsl(160, 84%, 39%)",
  },
} satisfies ChartConfig;

export default function CmaSalesTimeline({ topComps }: CmaSalesTimelineProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  if (!topComps || topComps.length < 2) return null;

  // Take the 12 most recent, sort oldest→newest for the chart
  const recent = [...topComps]
    .filter((c) => c.closeDate && c.closePrice && c.listPrice)
    .sort(
      (a, b) =>
        new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime()
    )
    .slice(0, 12)
    .reverse();

  if (recent.length < 2) return null;

  const data = recent.map((comp) => ({
    date: new Date(comp.closeDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "2-digit",
    }),
    address: comp.address,
    listPrice: comp.listPrice,
    salePrice: comp.closePrice,
    sqft: comp.livingArea,
    beds: comp.bedsTotal,
    baths: comp.bathsTotal,
    dom: comp.daysOnMarket,
  }));

  return (
    <div
      className={`rounded-xl p-4 md:p-6 ${
        isLight
          ? "bg-white/70 border border-gray-200 shadow-sm"
          : "bg-white/5 border border-white/10"
      }`}
    >
      <h4
        className={`text-sm font-semibold mb-1 ${
          isLight ? "text-gray-700" : "text-gray-300"
        }`}
      >
        Sales Timeline
      </h4>
      <p
        className={`text-xs mb-4 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Last {recent.length} sales — list price vs sale price at close
      </p>

      <ChartContainer config={chartConfig} className="h-[320px] w-full">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, bottom: 5, left: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isLight ? "#e5e7eb" : "#374151"}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fill: isLight ? "#6b7280" : "#9ca3af" }}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tickLine={false}
            axisLine={false}
            width={60}
            tick={{ fontSize: 10, fill: isLight ? "#9ca3af" : "#6b7280" }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const d = payload?.[0]?.payload;
                  if (d?.address) {
                    return `${d.address} — ${d.date}`;
                  }
                  return String(_);
                }}
                formatter={(value, name) => {
                  const label =
                    name === "listPrice" ? "List Price" : "Sale Price";
                  return [formatCurrency(value as number), label];
                }}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            type="monotone"
            dataKey="listPrice"
            stroke="var(--color-listPrice)"
            strokeWidth={2}
            dot={{
              r: 4,
              fill: "var(--color-listPrice)",
              stroke: isLight ? "#fff" : "#111",
              strokeWidth: 2,
            }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="salePrice"
            stroke="var(--color-salePrice)"
            strokeWidth={2}
            dot={{
              r: 4,
              fill: "var(--color-salePrice)",
              stroke: isLight ? "#fff" : "#111",
              strokeWidth: 2,
            }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
