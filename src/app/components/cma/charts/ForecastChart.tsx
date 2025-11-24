'use client';

// src/app/components/cma/charts/ForecastChart.tsx
// Forecast visualization with historical and projected values

import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ForecastResult } from '@/lib/cma/forecastEngine';

interface ForecastChartProps {
  forecast: ForecastResult;
  historicalData?: { year: number; value: number }[];
  subjectAddress?: string;
  className?: string;
  compact?: boolean;
}

export default function ForecastChart({
  forecast,
  historicalData = [],
  subjectAddress,
  className = '',
  compact = false,
}: ForecastChartProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Prepare chart data combining historical and forecast
  const chartData = [];

  // Add historical data
  historicalData.forEach((point) => {
    chartData.push({
      year: point.year,
      historical: point.value,
      forecast: null,
    });
  });

  // Add current year as bridge point
  const currentYear = new Date().getFullYear();
  chartData.push({
    year: currentYear,
    historical: forecast.currentValue,
    forecast: forecast.currentValue,
  });

  // Add forecast data
  forecast.forecastCurve.forEach((point) => {
    chartData.push({
      year: currentYear + point.year,
      historical: null,
      forecast: point.projectedValue,
    });
  });

  // Theme-aware colors
  const historicalColor = isLight ? '#3b82f6' : '#60a5fa'; // blue
  const forecastColor = isLight ? '#10b981' : '#34d399'; // emerald
  const gridColor = isLight ? '#e5e7eb' : '#374151';
  const textColor = isLight ? '#374151' : '#d1d5db';

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const isHistorical = data.historical !== null && data.historical !== undefined;
    const value = isHistorical ? data.historical : data.forecast;

    return (
      <div
        className={`rounded-lg border p-3 shadow-lg ${
          isLight
            ? 'bg-white border-gray-200'
            : 'bg-gray-800 border-gray-700'
        }`}
      >
        <p className={`font-semibold mb-1 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          {data.year}
        </p>
        <p className={`text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          {isHistorical ? 'Historical' : 'Projected'}: ${value?.toLocaleString()}
        </p>
      </div>
    );
  };

  if (compact) {
    return (
      <div className={className}>
        <div className="mb-3">
          <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Value Forecast
          </div>
          <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            {forecast.methodology.effectiveRate.toFixed(1)}% annual growth
          </div>
        </div>

        <div style={{ width: '100%', height: 180 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={forecastColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={forecastColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
              <XAxis
                dataKey="year"
                stroke={textColor}
                style={{ fontSize: '10px' }}
                tickFormatter={(value) => `'${value.toString().slice(-2)}`}
              />
              <YAxis
                stroke={textColor}
                style={{ fontSize: '10px' }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke={forecastColor}
                fill="url(#forecastGradient)"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="historical"
                stroke={historicalColor}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={`mt-2 text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
          5-yr projection: ${forecast.forecast5Year.projectedValue.toLocaleString()}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`rounded-lg border p-6 ${
        isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Value Forecast
            </h3>
          </div>
          {subjectAddress && (
            <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              {subjectAddress}
            </p>
          )}
        </div>

        <div className="text-right">
          <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {forecast.methodology.effectiveRate.toFixed(1)}%
          </div>
          <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Annual Growth
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="forecastGradientFull" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={forecastColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={forecastColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={historicalColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={historicalColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.3} />
            <XAxis
              dataKey="year"
              stroke={textColor}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke={textColor}
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: textColor }}
              iconType="line"
            />
            <Area
              type="monotone"
              dataKey="historical"
              stroke={historicalColor}
              fill="url(#historicalGradient)"
              strokeWidth={2}
              name="Historical Value"
            />
            <Area
              type="monotone"
              dataKey="forecast"
              stroke={forecastColor}
              fill="url(#forecastGradientFull)"
              strokeDasharray="5 5"
              strokeWidth={2}
              name="Projected Value"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast Milestones */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t ${
        isLight ? 'border-gray-200' : 'border-gray-700'
      }`}>
        <div>
          <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            1 Year
          </div>
          <div className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            ${forecast.forecast1Year.projectedValue.toLocaleString()}
          </div>
        </div>

        <div>
          <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            3 Years
          </div>
          <div className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            ${forecast.forecast3Year.projectedValue.toLocaleString()}
          </div>
        </div>

        <div>
          <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            5 Years
          </div>
          <div className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            ${forecast.forecast5Year.projectedValue.toLocaleString()}
          </div>
        </div>

        <div>
          <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            10 Years
          </div>
          <div className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            ${forecast.forecast10Year.projectedValue.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Methodology Note */}
      <div className={`mt-6 p-3 rounded-lg flex items-start gap-2 ${
        isLight
          ? 'bg-blue-50 border border-blue-200'
          : 'bg-blue-900/20 border border-blue-700/30'
      }`}>
        <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
        <p className={`text-xs ${isLight ? 'text-blue-800' : 'text-blue-300'}`}>
          <strong>Methodology:</strong> Forecast uses blended CAGR ({forecast.methodology.cagr5?.toFixed(1)}%)
          and recent momentum, dampened by volatility ({(forecast.methodology.volatilityDampening * 100).toFixed(0)}%).
          Projections are estimates and actual values may vary.
        </p>
      </div>
    </motion.div>
  );
}
