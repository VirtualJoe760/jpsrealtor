'use client';

// src/app/components/cma/charts/ComparisonScatterChart.tsx
// Scatter chart comparing subject property against comparables

import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Maximize2, Home } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import type { CMASummary, CMAComp } from '@/lib/cma/cmaTypes';

interface ComparisonScatterChartProps {
  summary: CMASummary;
  comps: CMAComp[];
  subjectProperty?: {
    sqft?: number;
    price?: number;
  };
  className?: string;
}

export default function ComparisonScatterChart({
  summary,
  comps,
  subjectProperty,
  className = ''
}: ComparisonScatterChartProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Prepare chart data
  const chartData = comps
    .filter(comp => comp.sqft && comp.price)
    .map((comp) => ({
      sqft: comp.sqft,
      price: comp.price,
      pricePerSqft: comp.pricePerSqft,
      address: comp.address,
      isSubject: false,
    }));

  // Add subject property if available
  if (subjectProperty?.sqft && subjectProperty?.price) {
    chartData.push({
      sqft: subjectProperty.sqft,
      price: subjectProperty.price,
      pricePerSqft: subjectProperty.price / subjectProperty.sqft,
      address: 'Subject Property',
      isSubject: true,
    });
  } else if (summary.estimatedValue && summary.avgSqft) {
    chartData.push({
      sqft: summary.avgSqft,
      price: summary.estimatedValue,
      pricePerSqft: summary.estimatedValue / summary.avgSqft,
      address: 'Subject Property (Estimated)',
      isSubject: true,
    });
  }

  // Theme-aware colors
  const compColor = isLight ? '#3b82f6' : '#60a5fa';
  const subjectColor = isLight ? '#f97316' : '#f59e0b';
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
          {data.isSubject ? '🏠 Subject Property' : data.address}
        </div>
        <div className={`text-xs ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          <div className="flex items-center justify-between gap-4 mb-1">
            <span>Price:</span>
            <span className="font-semibold">${data.price.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4 mb-1">
            <span>Square Feet:</span>
            <span className="font-semibold">{data.sqft.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Price/Sqft:</span>
            <span className="font-semibold">${data.pricePerSqft.toFixed(2)}</span>
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
          <Maximize2 className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Property Comparison
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12">
          <Home className={`w-12 h-12 mb-3 ${isLight ? 'text-gray-400' : 'text-gray-600'}`} />
          <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            No comparable properties data available
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={`rounded-lg border p-6 ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <Maximize2 className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Property Comparison
          </h3>
        </div>

        {/* Comp Count */}
        <div className="text-right">
          <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Comparables
          </div>
          <div className={`text-xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {comps.length}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: '380px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              strokeOpacity={0.3}
            />

            <XAxis
              type="number"
              dataKey="sqft"
              name="Square Feet"
              stroke={textColor}
              tick={{ fill: textColor, fontSize: 12 }}
              tickLine={{ stroke: gridColor }}
              label={{
                value: 'Square Feet',
                position: 'insideBottom',
                offset: -5,
                style: { fill: textColor, fontSize: 12 }
              }}
              tickFormatter={(value) => `${(value / 1000).toFixed(1)}k`}
            />

            <YAxis
              type="number"
              dataKey="price"
              name="Price"
              stroke={textColor}
              tick={{ fill: textColor, fontSize: 12 }}
              tickLine={{ stroke: gridColor }}
              label={{
                value: 'Price',
                angle: -90,
                position: 'insideLeft',
                style: { fill: textColor, fontSize: 12 }
              }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{
                fontSize: '12px',
                color: textColor,
              }}
            />

            <Scatter
              name="Comparable Properties"
              data={chartData.filter(d => !d.isSubject)}
              fill={compColor}
            >
              {chartData.filter(d => !d.isSubject).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={compColor} />
              ))}
            </Scatter>

            <Scatter
              name="Subject Property"
              data={chartData.filter(d => d.isSubject)}
              fill={subjectColor}
              shape="star"
            >
              {chartData.filter(d => d.isSubject).map((entry, index) => (
                <Cell key={`cell-subject-${index}`} fill={subjectColor} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
        {summary.avgPrice && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Avg Comp Price
            </div>
            <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              ${summary.avgPrice.toLocaleString()}
            </div>
          </div>
        )}

        {summary.avgSqft && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Avg Square Feet
            </div>
            <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {summary.avgSqft.toLocaleString()}
            </div>
          </div>
        )}

        {summary.avgPricePerSqft && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Avg Price/Sqft
            </div>
            <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              ${summary.avgPricePerSqft.toFixed(2)}
            </div>
          </div>
        )}

        {summary.estimatedValue && (
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Estimated Value
            </div>
            <div className={`text-sm font-semibold text-blue-500`}>
              ${summary.estimatedValue.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {/* Legend Info */}
      <div className={`mt-4 text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: compColor }} />
            <span>Comparable Properties</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3" style={{
              backgroundColor: subjectColor,
              clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
            }} />
            <span>Subject Property</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
