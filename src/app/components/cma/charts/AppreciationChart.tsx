'use client';

// src/app/components/cma/charts/AppreciationChart.tsx
// Chart component for property appreciation forecast visualization

import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { AppreciationForecast } from '@/lib/cma/cmaTypes';

interface AppreciationChartProps {
  appreciation: AppreciationForecast;
  subjectAddress?: string;
  className?: string;
}

export default function AppreciationChart({
  appreciation,
  subjectAddress,
  className = ''
}: AppreciationChartProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Prepare chart data from appreciation history
  const chartData = appreciation.historyYears?.map((year) => ({
    year: year.year,
    value: year.medianPrice,
    growth: year.growth ? year.growth * 100 : 0,
  })) || [];

  // Add projected years if available
  const projectedData = appreciation.projected5Year
    ? [...chartData, {
        year: new Date().getFullYear() + 5,
        value: appreciation.projected5Year,
        growth: appreciation.cagr5 ? appreciation.cagr5 * 100 : 0,
        isProjected: true,
      }]
    : chartData;

  // Theme-aware colors
  const primaryColor = isLight ? '#3b82f6' : '#60a5fa';
  const secondaryColor = isLight ? '#10b981' : '#34d399';
  const gridColor = isLight ? '#e5e7eb' : '#374151';
  const textColor = isLight ? '#374151' : '#d1d5db';
  const tooltipBg = isLight ? '#ffffff' : '#1f2937';
  const tooltipBorder = isLight ? '#e5e7eb' : '#374151';

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const isProjected = data.isProjected;

    return (
      <div
        className="rounded-lg shadow-lg border p-3"
        style={{
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
        }}
      >
        <div className={`text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          {data.year} {isProjected && '(Projected)'}
        </div>
        <div className={`text-xs ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          <div className="flex items-center justify-between gap-4 mb-1">
            <span>Median Price:</span>
            <span className="font-semibold">${data.value.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Growth Rate:</span>
            <span className={`font-semibold ${data.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {data.growth >= 0 ? '+' : ''}{data.growth.toFixed(2)}%
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
          <TrendingUp className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Appreciation Forecast
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <Calendar className={`w-12 h-12 mb-3 ${isLight ? 'text-gray-400' : 'text-gray-600'}`} />
          <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            No historical appreciation data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-lg border p-6 ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Appreciation Forecast
          </h3>
        </div>

        {/* Key Metrics */}
        {appreciation.cagr5 && (
          <div className="text-right">
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              5-Year CAGR
            </div>
            <div className={`text-xl font-bold ${appreciation.cagr5 >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {appreciation.cagr5 >= 0 ? '+' : ''}{(appreciation.cagr5 * 100).toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      {/* Subject Address */}
      {subjectAddress && (
        <div className={`text-sm mb-4 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
          {subjectAddress}
        </div>
      )}

      {/* Chart */}
      <div className="w-full" style={{ height: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={projectedData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="appreciationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              strokeOpacity={0.3}
            />

            <XAxis
              dataKey="year"
              stroke={textColor}
              tick={{ fill: textColor, fontSize: 12 }}
              tickLine={{ stroke: gridColor }}
            />

            <YAxis
              stroke={textColor}
              tick={{ fill: textColor, fontSize: 12 }}
              tickLine={{ stroke: gridColor }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{
                fontSize: '12px',
                color: textColor,
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              name="Median Price"
              stroke={primaryColor}
              strokeWidth={2}
              fill="url(#appreciationGradient)"
              dot={{
                fill: primaryColor,
                r: 4,
                strokeWidth: 2,
                stroke: tooltipBg,
              }}
              activeDot={{
                r: 6,
                fill: primaryColor,
                strokeWidth: 2,
                stroke: tooltipBg,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
        {appreciation.cagr1 !== undefined && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              1-Year CAGR
            </div>
            <div className={`text-sm font-semibold ${appreciation.cagr1 >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {appreciation.cagr1 >= 0 ? '+' : ''}{(appreciation.cagr1 * 100).toFixed(2)}%
            </div>
          </div>
        )}

        {appreciation.cagr3 !== undefined && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              3-Year CAGR
            </div>
            <div className={`text-sm font-semibold ${appreciation.cagr3 >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {appreciation.cagr3 >= 0 ? '+' : ''}{(appreciation.cagr3 * 100).toFixed(2)}%
            </div>
          </div>
        )}

        {appreciation.projected5Year && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              5-Year Projection
            </div>
            <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              ${appreciation.projected5Year.toLocaleString()}
            </div>
          </div>
        )}

        {chartData.length > 0 && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Data Points
            </div>
            <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {chartData.length} {chartData.length === 1 ? 'year' : 'years'}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
