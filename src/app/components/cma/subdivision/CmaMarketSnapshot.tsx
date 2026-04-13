"use client";

import React from "react";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Home,
  BarChart3,
  ArrowUpDown,
} from "lucide-react";
import { useTheme } from "@/app/contexts/ThemeContext";

interface CmaStats {
  totals: {
    active: number;
    underContract: number;
    pending: number;
    closedSampled: number;
    closedAllTime: number;
  };
  closed: {
    count: number;
    sampleStartDate: string;
    sampleEndDate: string;
    minSalePrice: number;
    maxSalePrice: number;
    avgSalePrice: number;
    medianSalePrice: number;
    avgSalePpsf: number;
    medianSalePpsf: number;
    avgSqft: number;
    medianSqft: number;
    avgDaysOnMarket: number;
    avgSaleToListRatio: number;
    avgPriceReductionPct: number;
  };
  [key: string]: unknown;
}

function formatPrice(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(2).replace(/0+$/, "")}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return `$${value.toLocaleString()}`;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  isLight: boolean;
}

function StatCard({ icon: Icon, label, value, isLight }: StatCardProps) {
  return (
    <div
      className={`rounded-xl p-4 flex flex-col gap-2 ${
        isLight
          ? "bg-white/70 border border-gray-200 shadow-sm"
          : "bg-white/5 border border-white/10"
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`w-4 h-4 ${isLight ? "text-blue-600" : "text-blue-400"}`}
        />
        <span
          className={`text-xs font-medium ${
            isLight ? "text-gray-500" : "text-gray-400"
          }`}
        >
          {label}
        </span>
      </div>
      <span
        className={`text-lg font-semibold ${
          isLight ? "text-gray-900" : "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export default function CmaMarketSnapshot({
  cmaStats,
}: {
  cmaStats: CmaStats;
}) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === "lightgradient";

  const { closed, totals } = cmaStats;

  const cards = [
    {
      icon: DollarSign,
      label: "Avg Sale Price",
      value: formatPrice(closed.avgSalePrice),
    },
    {
      icon: TrendingUp,
      label: "Avg $/SqFt",
      value: `$${Math.round(closed.avgSalePpsf).toLocaleString()}`,
    },
    {
      icon: Clock,
      label: "Avg Days on Market",
      value: `${Math.round(closed.avgDaysOnMarket)}`,
    },
    {
      icon: Home,
      label: "Active Inventory",
      value: `${totals.active}`,
    },
    {
      icon: BarChart3,
      label: "Sale-to-List Ratio",
      value: `${Math.round(closed.avgSaleToListRatio * 100)}%`,
    },
    {
      icon: ArrowUpDown,
      label: "Price Range",
      value: `${formatPrice(closed.minSalePrice)} – ${formatPrice(closed.maxSalePrice)}`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} isLight={isLight} />
      ))}
    </div>
  );
}
