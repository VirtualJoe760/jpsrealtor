'use client';

// src/app/components/cma/charts/SubdivisionMarketCharts.tsx
// Comprehensive market charts for subdivision analytics

import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { MapPin, Home, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface SubdivisionMarketData {
  subdivisionName: string;
  totalListings: number;
  avgPrice: number;
  avgPricePerSqft: number;
  avgDaysOnMarket: number;
  priceHistory?: Array<{
    month: string;
    avgPrice: number;
  }>;
  statusBreakdown?: {
    active: number;
    pending: number;
    sold: number;
  };
  priceRanges?: Array<{
    range: string;
    count: number;
  }>;
}

interface SubdivisionMarketChartsProps {
  data: SubdivisionMarketData;
  className?: string;
}

export default function SubdivisionMarketCharts({
  data,
  className = ''
}: SubdivisionMarketChartsProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Theme-aware colors
  const primaryColor = isLight ? '#3b82f6' : '#60a5fa';
  const secondaryColor = isLight ? '#10b981' : '#34d399';
  const tertiaryColor = isLight ? '#f59e0b' : '#fbbf24';
  const gridColor = isLight ? '#e5e7eb' : '#374151';
  const textColor = isLight ? '#374151' : '#d1d5db';
  const tooltipBg = isLight ? '#ffffff' : '#1f2937';
  const tooltipBorder = isLight ? '#e5e7eb' : '#374151';

  // Status breakdown colors
  const statusColors = {
    active: isLight ? '#3b82f6' : '#60a5fa',
    pending: isLight ? '#f59e0b' : '#fbbf24',
    sold: isLight ? '#10b981' : '#34d399',
  };

  // Prepare status breakdown data
  const statusData = data.statusBreakdown ? [
    { name: 'Active', value: data.statusBreakdown.active, color: statusColors.active },
    { name: 'Pending', value: data.statusBreakdown.pending, color: statusColors.pending },
    { name: 'Sold', value: data.statusBreakdown.sold, color: statusColors.sold },
  ].filter(item => item.value > 0) : [];

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
          {data.month || data.range || data.name}
        </div>
        <div className={`text-xs ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          {data.avgPrice && (
            <div className="flex items-center justify-between gap-4">
              <span>Avg Price:</span>
              <span className="font-semibold">${data.avgPrice.toLocaleString()}</span>
            </div>
          )}
          {data.count !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span>Count:</span>
              <span className="font-semibold">{data.count}</span>
            </div>
          )}
          {data.value !== undefined && (
            <div className="flex items-center justify-between gap-4">
              <span>Listings:</span>
              <span className="font-semibold">{data.value}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`rounded-lg border ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} ${className}`}
    >
      {/* Header */}
      <div className="p-6 border-b" style={{ borderColor: isLight ? '#e5e7eb' : '#374151' }}>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
          <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {data.subdivisionName} Market Analytics
          </h3>
        </div>
        <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
          Comprehensive market data and trends
        </p>
      </div>

      {/* Key Metrics */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Home className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Total Listings
            </div>
          </div>
          <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {data.totalListings}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className={`w-4 h-4 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Avg Price
            </div>
          </div>
          <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            ${(data.avgPrice / 1000).toFixed(0)}k
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-4 h-4 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Avg $/Sqft
            </div>
          </div>
          <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            ${data.avgPricePerSqft.toFixed(0)}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-4 h-4 rounded-full ${isLight ? 'bg-orange-600' : 'bg-orange-400'}`} />
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Days on Market
            </div>
          </div>
          <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {data.avgDaysOnMarket}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6 p-6">
        {/* Price History Chart */}
        {data.priceHistory && data.priceHistory.length > 0 && (
          <div>
            <h4 className={`text-sm font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Price History
            </h4>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.priceHistory}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridColor}
                    strokeOpacity={0.3}
                  />

                  <XAxis
                    dataKey="month"
                    stroke={textColor}
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={{ stroke: gridColor }}
                  />

                  <YAxis
                    stroke={textColor}
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={{ stroke: gridColor }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  <Line
                    type="monotone"
                    dataKey="avgPrice"
                    stroke={primaryColor}
                    strokeWidth={2}
                    dot={{ fill: primaryColor, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Status Breakdown Chart */}
        {statusData.length > 0 && (
          <div>
            <h4 className={`text-sm font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Listing Status Breakdown
            </h4>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="80%"
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    labelLine={{ stroke: textColor }}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Price Range Distribution */}
        {data.priceRanges && data.priceRanges.length > 0 && (
          <div className="md:col-span-2">
            <h4 className={`text-sm font-semibold mb-4 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Price Range Distribution
            </h4>
            <div style={{ height: '250px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.priceRanges}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={gridColor}
                    strokeOpacity={0.3}
                  />

                  <XAxis
                    dataKey="range"
                    stroke={textColor}
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={{ stroke: gridColor }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />

                  <YAxis
                    stroke={textColor}
                    tick={{ fill: textColor, fontSize: 11 }}
                    tickLine={{ stroke: gridColor }}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  <Bar
                    dataKey="count"
                    fill={primaryColor}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {statusData.length > 0 && (
        <div className={`px-6 pb-6`}>
          <div className="flex items-center gap-4 flex-wrap text-xs">
            {statusData.map((status) => (
              <div key={status.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: status.color }} />
                <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>
                  {status.name}: {status.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
