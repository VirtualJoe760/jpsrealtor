'use client';

// src/app/components/cma/charts/PricePerSqftTrendChart.tsx
// Line chart showing price per square foot trends across comparables

import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Activity, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { CMAComp } from '@/lib/cma/cmaTypes';

interface PricePerSqftTrendChartProps {
  comps: CMAComp[];
  avgPricePerSqft?: number;
  className?: string;
}

export default function PricePerSqftTrendChart({
  comps,
  avgPricePerSqft,
  className = ''
}: PricePerSqftTrendChartProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Prepare chart data - sort by sold date or list date
  const chartData = comps
    .filter(comp => comp.pricePerSqft)
    .sort((a, b) => {
      const dateA = a.soldDate || a.listDate || '';
      const dateB = b.soldDate || b.listDate || '';
      return dateA.localeCompare(dateB);
    })
    .map((comp, index) => ({
      index: index + 1,
      pricePerSqft: comp.pricePerSqft,
      address: comp.address,
      sqft: comp.sqft,
      price: comp.price,
      date: comp.soldDate || comp.listDate,
    }));

  // Calculate trend
  const calculateTrend = () => {
    if (chartData.length < 2) return null;

    const firstValue = chartData[0].pricePerSqft;
    const lastValue = chartData[chartData.length - 1].pricePerSqft;
    const change = ((lastValue - firstValue) / firstValue) * 100;

    return {
      change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    };
  };

  const trend = calculateTrend();

  // Theme-aware colors
  const lineColor = isLight ? '#3b82f6' : '#60a5fa';
  const avgLineColor = isLight ? '#10b981' : '#34d399';
  const gridColor = isLight ? '#e5e7eb' : '#374151';
  const textColor = isLight ? '#374151' : '#d1d5db';
  const tooltipBg = isLight ? '#ffffff' : '#1f2937';
  const tooltipBorder = isLight ? '#e5e7eb' : '#374151';

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div
        className="rounded-lg shadow-lg border p-3"
        style={{
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
        }}
      >
        <div className={`text-sm font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-white'}`}>
          Comp #{data.index}
        </div>
        <div className={`text-xs ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          <div className="mb-2">
            <div className="font-medium truncate" style={{ maxWidth: '200px' }}>
              {data.address}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 mb-1">
            <span>Price/Sqft:</span>
            <span className="font-semibold text-blue-500">
              ${data.pricePerSqft.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 mb-1">
            <span>Price:</span>
            <span className="font-semibold">${data.price?.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Square Feet:</span>
            <span className="font-semibold">{data.sqft?.toLocaleString()}</span>
          </div>
          {data.date && (
            <div className={`mt-2 pt-2 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
              <div className="text-xs">
                {new Date(data.date).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Fallback UI if no data
  if (!chartData.length) {
    return (
      <div className={`rounded-lg border p-6 ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Activity className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Price Per Sqft Trend
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <TrendingUp className={`w-12 h-12 mb-3 ${isLight ? 'text-gray-400' : 'text-gray-600'}`} />
          <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            No price per square foot data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
      className={`rounded-lg border p-6 ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Price Per Sqft Trend
          </h3>
        </div>

        {/* Trend Indicator */}
        {trend && (
          <div className="text-right">
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Trend
            </div>
            <div className={`flex items-center gap-1 text-lg font-bold ${
              trend.direction === 'up' ? 'text-green-500' : trend.direction === 'down' ? 'text-red-500' : isLight ? 'text-gray-900' : 'text-white'
            }`}>
              <TrendingUp className={`w-4 h-4 ${trend.direction === 'down' ? 'rotate-180' : ''}`} />
              {trend.change >= 0 ? '+' : ''}{trend.change.toFixed(1)}%
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              strokeOpacity={0.3}
            />

            <XAxis
              dataKey="index"
              stroke={textColor}
              tick={{ fill: textColor, fontSize: 12 }}
              tickLine={{ stroke: gridColor }}
              label={{
                value: 'Comparable #',
                position: 'insideBottom',
                offset: -5,
                style: { fill: textColor, fontSize: 12 }
              }}
            />

            <YAxis
              stroke={textColor}
              tick={{ fill: textColor, fontSize: 12 }}
              tickLine={{ stroke: gridColor }}
              label={{
                value: '$/Sqft',
                angle: -90,
                position: 'insideLeft',
                style: { fill: textColor, fontSize: 12 }
              }}
              domain={['dataMin - 10', 'dataMax + 10']}
              tickFormatter={(value) => `$${value.toFixed(0)}`}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Average Reference Line */}
            {avgPricePerSqft && (
              <ReferenceLine
                y={avgPricePerSqft}
                stroke={avgLineColor}
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Avg: $${avgPricePerSqft.toFixed(2)}`,
                  position: 'right',
                  fill: avgLineColor,
                  fontSize: 12,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="pricePerSqft"
              stroke={lineColor}
              strokeWidth={3}
              dot={{
                fill: lineColor,
                r: 5,
                strokeWidth: 2,
                stroke: tooltipBg,
              }}
              activeDot={{
                r: 7,
                fill: lineColor,
                strokeWidth: 2,
                stroke: tooltipBg,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
        {avgPricePerSqft && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Average $/Sqft
            </div>
            <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              ${avgPricePerSqft.toFixed(2)}
            </div>
          </div>
        )}

        {chartData.length > 0 && (
          <>
            <div>
              <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Lowest $/Sqft
              </div>
              <div className={`text-sm font-semibold text-red-500`}>
                ${Math.min(...chartData.map(d => d.pricePerSqft)).toFixed(2)}
              </div>
            </div>

            <div>
              <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Highest $/Sqft
              </div>
              <div className={`text-sm font-semibold text-green-500`}>
                ${Math.max(...chartData.map(d => d.pricePerSqft)).toFixed(2)}
              </div>
            </div>

            <div>
              <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Data Points
              </div>
              <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {chartData.length}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className={`mt-4 text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5" style={{ backgroundColor: lineColor }} />
            <span>Price per Sqft</span>
          </div>
          {avgPricePerSqft && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-t-2 border-dashed" style={{ borderColor: avgLineColor }} />
              <span>Market Average</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
