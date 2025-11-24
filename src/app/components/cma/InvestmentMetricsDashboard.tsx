// src/app/components/cma/InvestmentMetricsDashboard.tsx
// Dashboard displaying investment analysis metrics

"use client";

import React from "react";
import { DollarSign, TrendingUp, Home, Calculator, Check, X } from "lucide-react";

export interface InvestmentMetrics {
  capRate?: number; // Cap Rate (%)
  cashOnCashReturn?: number; // Cash-on-Cash Return (%)
  grossRentMultiplier?: number; // GRM
  debtServiceCoverageRatio?: number; // DSCR
  onePercentRule?: boolean; // Does monthly rent >= 1% of purchase price?
  estimatedMonthlyRent?: number;
  purchasePrice: number;
  downPayment?: number;
  annualExpenses?: number;
}

interface InvestmentMetricsDashboardProps {
  metrics: InvestmentMetrics;
  title?: string;
}

export default function InvestmentMetricsDashboard({
  metrics,
  title = "Investment Analysis",
}: InvestmentMetricsDashboardProps) {
  const MetricCard = ({
    icon: Icon,
    label,
    value,
    subtitle,
    color = "blue",
    goodThreshold,
  }: {
    icon: any;
    label: string;
    value: string | number;
    subtitle?: string;
    color?: "blue" | "green" | "yellow" | "red" | "purple";
    goodThreshold?: { value: number; isGood: (val: number, threshold: number) => boolean };
  }) => {
    const colorClasses = {
      blue: "bg-blue-900/20 border-blue-700/30 text-blue-400",
      green: "bg-green-900/20 border-green-700/30 text-green-400",
      yellow: "bg-yellow-900/20 border-yellow-700/30 text-yellow-400",
      red: "bg-red-900/20 border-red-700/30 text-red-400",
      purple: "bg-purple-900/20 border-purple-700/30 text-purple-400",
    };

    const numericValue = typeof value === "number" ? value : parseFloat(value.toString());
    const isGood =
      goodThreshold && !isNaN(numericValue)
        ? goodThreshold.isGood(numericValue, goodThreshold.value)
        : null;

    return (
      <div className={`relative border rounded-xl p-4 ${colorClasses[color]}`}>
        {isGood !== null && (
          <div className="absolute top-2 right-2">
            {isGood ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <X className="w-4 h-4 text-red-400" />
            )}
          </div>
        )}
        <div className="flex items-start gap-3">
          <Icon className="w-5 h-5 mt-1" />
          <div className="flex-1">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm">
          Key investment metrics for ${metrics.purchasePrice.toLocaleString()}
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Cap Rate */}
        {metrics.capRate !== undefined && (
          <MetricCard
            icon={TrendingUp}
            label="Capitalization Rate"
            value={`${metrics.capRate.toFixed(2)}%`}
            subtitle="Annual return on investment"
            color="blue"
            goodThreshold={{
              value: 5,
              isGood: (val, threshold) => val >= threshold,
            }}
          />
        )}

        {/* Cash-on-Cash Return */}
        {metrics.cashOnCashReturn !== undefined && (
          <MetricCard
            icon={DollarSign}
            label="Cash-on-Cash Return"
            value={`${metrics.cashOnCashReturn.toFixed(2)}%`}
            subtitle="Return on cash invested"
            color="green"
            goodThreshold={{
              value: 8,
              isGood: (val, threshold) => val >= threshold,
            }}
          />
        )}

        {/* GRM */}
        {metrics.grossRentMultiplier !== undefined && (
          <MetricCard
            icon={Home}
            label="Gross Rent Multiplier"
            value={metrics.grossRentMultiplier.toFixed(2)}
            subtitle="Price ÷ annual rent"
            color="yellow"
            goodThreshold={{
              value: 15,
              isGood: (val, threshold) => val <= threshold,
            }}
          />
        )}

        {/* DSCR */}
        {metrics.debtServiceCoverageRatio !== undefined && (
          <MetricCard
            icon={Calculator}
            label="DSCR"
            value={metrics.debtServiceCoverageRatio.toFixed(2)}
            subtitle="Debt service coverage ratio"
            color="purple"
            goodThreshold={{
              value: 1.25,
              isGood: (val, threshold) => val >= threshold,
            }}
          />
        )}

        {/* Monthly Rent */}
        {metrics.estimatedMonthlyRent !== undefined && (
          <MetricCard
            icon={DollarSign}
            label="Est. Monthly Rent"
            value={`$${metrics.estimatedMonthlyRent.toLocaleString()}`}
            subtitle="Market rental estimate"
            color="green"
          />
        )}

        {/* 1% Rule */}
        {metrics.onePercentRule !== undefined && (
          <MetricCard
            icon={metrics.onePercentRule ? Check : X}
            label="1% Rule"
            value={metrics.onePercentRule ? "Passes ✓" : "Fails ✗"}
            subtitle="Monthly rent ≥ 1% of price"
            color={metrics.onePercentRule ? "green" : "red"}
          />
        )}
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Good Investment Indicators */}
        <div className="bg-green-900/10 border border-green-700/20 rounded-lg p-4">
          <p className="text-green-400 font-semibold mb-2 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" /> Good Investment Indicators
          </p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Cap Rate: ≥ 5% (higher is better)</li>
            <li>• Cash-on-Cash: ≥ 8% (higher is better)</li>
            <li>• GRM: ≤ 15 (lower is better)</li>
            <li>• DSCR: ≥ 1.25 (higher is better)</li>
            <li>• 1% Rule: Monthly rent ≥ 1% of purchase price</li>
          </ul>
        </div>

        {/* Calculation Notes */}
        <div className="bg-blue-900/10 border border-blue-700/20 rounded-lg p-4">
          <p className="text-blue-400 font-semibold mb-2 text-sm flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Calculation Notes
          </p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Cap Rate = (Annual Rent - Expenses) ÷ Price</li>
            <li>• Cash-on-Cash = Annual Cash Flow ÷ Down Payment</li>
            <li>• GRM = Purchase Price ÷ Annual Rent</li>
            <li>• DSCR = Net Operating Income ÷ Debt Service</li>
            <li>• Estimates based on market comparables</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
