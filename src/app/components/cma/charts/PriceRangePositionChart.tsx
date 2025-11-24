'use client';

// src/app/components/cma/charts/PriceRangePositionChart.tsx
// Visual chart showing subject property position within price range

import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { TrendingUp, Target } from 'lucide-react';

interface PriceRangePositionChartProps {
  estimatedValue: number;
  lowRange?: number;
  highRange?: number;
  avgPrice?: number;
  subjectAddress?: string;
  className?: string;
}

export default function PriceRangePositionChart({
  estimatedValue,
  lowRange,
  highRange,
  avgPrice,
  subjectAddress,
  className = ''
}: PriceRangePositionChartProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Calculate range or use defaults
  const low = lowRange || estimatedValue * 0.9;
  const high = highRange || estimatedValue * 1.1;
  const range = high - low;

  // Calculate position percentage
  const estimatedPosition = ((estimatedValue - low) / range) * 100;
  const avgPosition = avgPrice ? ((avgPrice - low) / range) * 100 : null;

  // Theme-aware colors
  const rangeColor = isLight ? '#e5e7eb' : '#374151';
  const estimatedColor = isLight ? '#3b82f6' : '#60a5fa';
  const avgColor = isLight ? '#10b981' : '#34d399';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className={`rounded-lg border p-6 ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Target className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
        <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
          Price Range Position
        </h3>
      </div>

      {/* Subject Address */}
      {subjectAddress && (
        <div className={`text-sm mb-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
          {subjectAddress}
        </div>
      )}

      {/* Price Range Bar */}
      <div className="space-y-6">
        {/* Labels */}
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Low Range
            </div>
            <div className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              ${low.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              High Range
            </div>
            <div className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              ${high.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Range Visualization */}
        <div className="relative">
          {/* Background Range Bar */}
          <div
            className="w-full h-3 rounded-full"
            style={{ backgroundColor: rangeColor }}
          />

          {/* Gradient Overlay */}
          <div
            className="absolute top-0 left-0 w-full h-3 rounded-full opacity-50"
            style={{
              background: `linear-gradient(to right, ${isLight ? '#fca5a5' : '#ef4444'}, ${isLight ? '#fde047' : '#fbbf24'}, ${isLight ? '#86efac' : '#34d399'})`
            }}
          />

          {/* Estimated Value Marker */}
          <motion.div
            initial={{ scale: 0, x: '-50%' }}
            animate={{ scale: 1, x: '-50%' }}
            transition={{ duration: 0.5, delay: 0.6, type: 'spring' }}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: `${estimatedPosition}%` }}
          >
            <div
              className="w-6 h-6 rounded-full border-4 shadow-lg"
              style={{
                backgroundColor: estimatedColor,
                borderColor: isLight ? '#ffffff' : '#1f2937'
              }}
            />
            <div className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className={`text-xs font-semibold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                Estimated
              </div>
              <div className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                ${estimatedValue.toLocaleString()}
              </div>
            </div>
          </motion.div>

          {/* Average Price Marker (if available) */}
          {avgPrice && avgPosition !== null && (
            <motion.div
              initial={{ scale: 0, x: '-50%' }}
              animate={{ scale: 1, x: '-50%' }}
              transition={{ duration: 0.5, delay: 0.7, type: 'spring' }}
              className="absolute -top-12"
              style={{ left: `${avgPosition}%` }}
            >
              <div className="flex flex-col items-center">
                <div className={`text-xs font-semibold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                  Market Avg
                </div>
                <div className={`text-sm font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  ${avgPrice.toLocaleString()}
                </div>
              </div>
              <div
                className="w-4 h-4 rounded-full border-4 mt-1 mx-auto"
                style={{
                  backgroundColor: avgColor,
                  borderColor: isLight ? '#ffffff' : '#1f2937'
                }}
              />
            </motion.div>
          )}
        </div>

        {/* Position Indicator */}
        <div className="mt-16">
          <div className={`text-center p-4 rounded-lg ${isLight ? 'bg-gray-100' : 'bg-gray-700/50'}`}>
            <div className={`text-xs mb-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              Position in Range
            </div>
            <div className={`text-2xl font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
              {estimatedPosition.toFixed(0)}%
            </div>
            <div className={`text-xs mt-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              {estimatedPosition < 33 ? 'Lower Third' : estimatedPosition < 67 ? 'Middle Third' : 'Upper Third'}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-2 gap-4 mt-6 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
        <div>
          <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Range Spread
          </div>
          <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            ${range.toLocaleString()}
          </div>
        </div>

        <div>
          <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Spread %
          </div>
          <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            {((range / estimatedValue) * 100).toFixed(1)}%
          </div>
        </div>

        {avgPrice && (
          <>
            <div>
              <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                vs Market Avg
              </div>
              <div className={`text-sm font-semibold ${
                estimatedValue > avgPrice ? 'text-green-500' : estimatedValue < avgPrice ? 'text-red-500' : isLight ? 'text-gray-900' : 'text-white'
              }`}>
                {estimatedValue > avgPrice ? '+' : ''}{((estimatedValue - avgPrice) / avgPrice * 100).toFixed(1)}%
              </div>
            </div>

            <div>
              <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Difference
              </div>
              <div className={`text-sm font-semibold ${
                estimatedValue > avgPrice ? 'text-green-500' : estimatedValue < avgPrice ? 'text-red-500' : isLight ? 'text-gray-900' : 'text-white'
              }`}>
                {estimatedValue > avgPrice ? '+' : ''}${(estimatedValue - avgPrice).toLocaleString()}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className={`mt-6 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: estimatedColor }} />
            <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Estimated Value</span>
          </div>
          {avgPrice && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: avgColor }} />
              <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Market Average</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-2 rounded" style={{
              background: `linear-gradient(to right, ${isLight ? '#fca5a5' : '#ef4444'}, ${isLight ? '#fde047' : '#fbbf24'}, ${isLight ? '#86efac' : '#34d399'})`
            }} />
            <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>Price Range</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
