'use client';

// src/app/components/cma/charts/CashflowBarChart.tsx
// Bar chart component for cashflow analysis visualization

import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { DollarSign, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import type { CashflowAnalysis } from '@/lib/cma/cmaTypes';

interface CashflowBarChartProps {
  cashflow: CashflowAnalysis;
  className?: string;
}

export default function CashflowBarChart({
  cashflow,
  className = ''
}: CashflowBarChartProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Prepare chart data
  const chartData = [
    {
      category: 'Income',
      amount: cashflow.monthlyRent || 0,
      isPositive: true,
    },
    {
      category: 'Mortgage',
      amount: -(cashflow.monthlyMortgage || 0),
      isNegative: true,
    },
    {
      category: 'Property Tax',
      amount: -(cashflow.monthlyPropertyTax || 0),
      isNegative: true,
    },
    {
      category: 'Insurance',
      amount: -(cashflow.monthlyInsurance || 0),
      isNegative: true,
    },
    {
      category: 'HOA',
      amount: -(cashflow.monthlyHOA || 0),
      isNegative: true,
    },
    {
      category: 'Maintenance',
      amount: -(cashflow.monthlyMaintenance || 0),
      isNegative: true,
    },
    {
      category: 'Net Cashflow',
      amount: cashflow.monthlyCashflow || 0,
      isNet: true,
    },
  ].filter(item => item.amount !== 0);

  // Theme-aware colors
  const positiveColor = isLight ? '#10b981' : '#34d399';
  const negativeColor = isLight ? '#ef4444' : '#f87171';
  const netPositiveColor = isLight ? '#3b82f6' : '#60a5fa';
  const netNegativeColor = isLight ? '#f97316' : '#fb923c';
  const gridColor = isLight ? '#e5e7eb' : '#374151';
  const textColor = isLight ? '#374151' : '#d1d5db';
  const tooltipBg = isLight ? '#ffffff' : '#1f2937';
  const tooltipBorder = isLight ? '#e5e7eb' : '#374151';

  // Get bar color based on type
  const getBarColor = (entry: typeof chartData[0]) => {
    if (entry.isNet) {
      return entry.amount >= 0 ? netPositiveColor : netNegativeColor;
    }
    return entry.isPositive ? positiveColor : negativeColor;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const absAmount = Math.abs(data.amount);

    return (
      <div
        className="rounded-lg shadow-lg border p-3"
        style={{
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
        }}
      >
        <div className={`text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          {data.category}
        </div>
        <div className={`text-xs ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          <div className="flex items-center justify-between gap-4">
            <span>Monthly:</span>
            <span className={`font-semibold ${
              data.isNet
                ? data.amount >= 0 ? 'text-blue-500' : 'text-orange-500'
                : data.isPositive ? 'text-green-500' : 'text-red-500'
            }`}>
              {data.amount >= 0 ? '' : '-'}${absAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 mt-1">
            <span>Annual:</span>
            <span className="font-semibold">
              {data.amount >= 0 ? '' : '-'}${(absAmount * 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Fallback UI if no data
  if (!chartData.length) {
    return (
      <div className={`rounded-lg border p-6 ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Cashflow Analysis
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <TrendingDown className={`w-12 h-12 mb-3 ${isLight ? 'text-gray-400' : 'text-gray-600'}`} />
          <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            No cashflow data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={`rounded-lg border p-6 ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <DollarSign className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Monthly Cashflow Analysis
          </h3>
        </div>

        {/* Net Cashflow */}
        {cashflow.monthlyCashflow !== undefined && (
          <div className="text-right">
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Net Cashflow
            </div>
            <div className={`text-xl font-bold ${
              cashflow.monthlyCashflow >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {cashflow.monthlyCashflow >= 0 ? '+' : '-'}${Math.abs(cashflow.monthlyCashflow).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              strokeOpacity={0.3}
            />

            <XAxis
              dataKey="category"
              stroke={textColor}
              tick={{ fill: textColor, fontSize: 11 }}
              tickLine={{ stroke: gridColor }}
              angle={-45}
              textAnchor="end"
              height={80}
            />

            <YAxis
              stroke={textColor}
              tick={{ fill: textColor, fontSize: 12 }}
              tickLine={{ stroke: gridColor }}
              tickFormatter={(value) => {
                const absValue = Math.abs(value);
                return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(1)}k`;
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            <Bar
              dataKey="amount"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
        {cashflow.capRate !== undefined && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Cap Rate
            </div>
            <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {(cashflow.capRate * 100).toFixed(2)}%
            </div>
          </div>
        )}

        {cashflow.cashOnCashReturn !== undefined && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Cash on Cash
            </div>
            <div className={`text-sm font-semibold ${cashflow.cashOnCashReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {(cashflow.cashOnCashReturn * 100).toFixed(2)}%
            </div>
          </div>
        )}

        {cashflow.annualCashflow !== undefined && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Annual Cashflow
            </div>
            <div className={`text-sm font-semibold ${cashflow.annualCashflow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {cashflow.annualCashflow >= 0 ? '+' : '-'}${Math.abs(cashflow.annualCashflow).toLocaleString()}
            </div>
          </div>
        )}

        {cashflow.monthlyRent !== undefined && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Monthly Rent
            </div>
            <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              ${cashflow.monthlyRent.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Color Legend */}
      <div className={`mt-4 text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: positiveColor }} />
            <span>Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: negativeColor }} />
            <span>Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: netPositiveColor }} />
            <span>Net Positive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: netNegativeColor }} />
            <span>Net Negative</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
