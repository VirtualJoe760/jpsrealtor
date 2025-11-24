'use client';

// src/app/components/cma/charts/ConfidenceGauge.tsx
// Radial gauge component for confidence score visualization

import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Target, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ConfidenceGaugeProps {
  confidenceScore: number;
  compCount?: number;
  avgDaysOnMarket?: number;
  className?: string;
}

export default function ConfidenceGauge({
  confidenceScore,
  compCount,
  avgDaysOnMarket,
  className = ''
}: ConfidenceGaugeProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Normalize confidence score to 0-100
  const normalizedScore = Math.min(100, Math.max(0, confidenceScore * 100));

  // Determine confidence level and color
  const getConfidenceLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: isLight ? '#10b981' : '#34d399' };
    if (score >= 60) return { label: 'Good', color: isLight ? '#3b82f6' : '#60a5fa' };
    if (score >= 40) return { label: 'Fair', color: isLight ? '#f59e0b' : '#fbbf24' };
    return { label: 'Low', color: isLight ? '#ef4444' : '#f87171' };
  };

  const confidenceLevel = getConfidenceLevel(normalizedScore);

  // Prepare gauge data
  const gaugeData = [
    { name: 'Score', value: normalizedScore },
    { name: 'Remaining', value: 100 - normalizedScore }
  ];

  const COLORS = [confidenceLevel.color, isLight ? '#e5e7eb' : '#374151'];

  // Theme-aware colors
  const textColor = isLight ? '#374151' : '#d1d5db';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className={`rounded-lg border p-6 ${isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Target className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
        <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
          Confidence Score
        </h3>
      </div>

      {/* Gauge Chart */}
      <div className="relative flex items-center justify-center" style={{ height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius="70%"
              outerRadius="90%"
              dataKey="value"
              stroke="none"
            >
              {gaugeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Score Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '45%' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5, type: 'spring' }}
            className="text-center"
          >
            <div className="text-5xl font-bold" style={{ color: confidenceLevel.color }}>
              {normalizedScore.toFixed(0)}
            </div>
            <div className={`text-sm mt-1 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              out of 100
            </div>
          </motion.div>
        </div>
      </div>

      {/* Confidence Level Badge */}
      <div className="flex justify-center mb-6">
        <div
          className="px-4 py-2 rounded-full font-semibold text-sm"
          style={{
            backgroundColor: `${confidenceLevel.color}20`,
            color: confidenceLevel.color,
          }}
        >
          {confidenceLevel.label} Confidence
        </div>
      </div>

      {/* Supporting Metrics */}
      {(compCount !== undefined || avgDaysOnMarket !== undefined) && (
        <div className={`grid grid-cols-2 gap-4 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          {compCount !== undefined && (
            <div>
              <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Comparables Used
              </div>
              <div className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {compCount}
              </div>
            </div>
          )}

          {avgDaysOnMarket !== undefined && (
            <div>
              <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                Avg Days on Market
              </div>
              <div className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                {avgDaysOnMarket}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confidence Factors */}
      <div className={`mt-6 pt-6 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
        <div className={`text-xs font-semibold mb-3 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
          Confidence Factors:
        </div>
        <div className="space-y-2">
          <ConfidenceFactor
            label="Comparable Properties"
            value={compCount !== undefined ? compCount >= 5 ? 'Strong' : compCount >= 3 ? 'Good' : 'Limited' : 'N/A'}
            status={compCount !== undefined ? compCount >= 5 ? 'high' : compCount >= 3 ? 'medium' : 'low' : 'neutral'}
            isLight={isLight}
          />
          <ConfidenceFactor
            label="Market Activity"
            value={avgDaysOnMarket !== undefined ? avgDaysOnMarket <= 30 ? 'High' : avgDaysOnMarket <= 60 ? 'Moderate' : 'Low' : 'N/A'}
            status={avgDaysOnMarket !== undefined ? avgDaysOnMarket <= 30 ? 'high' : avgDaysOnMarket <= 60 ? 'medium' : 'low' : 'neutral'}
            isLight={isLight}
          />
          <ConfidenceFactor
            label="Data Recency"
            value={normalizedScore >= 70 ? 'Recent' : normalizedScore >= 50 ? 'Moderate' : 'Dated'}
            status={normalizedScore >= 70 ? 'high' : normalizedScore >= 50 ? 'medium' : 'low'}
            isLight={isLight}
          />
        </div>
      </div>

      {/* Info Note */}
      {normalizedScore < 60 && (
        <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 ${
          isLight ? 'bg-yellow-50 border border-yellow-200' : 'bg-yellow-900/20 border border-yellow-700/30'
        }`}>
          <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLight ? 'text-yellow-600' : 'text-yellow-400'}`} />
          <p className={`text-xs ${isLight ? 'text-yellow-800' : 'text-yellow-300'}`}>
            Lower confidence scores may indicate limited comparable data or market volatility.
            Consider additional research or professional appraisal.
          </p>
        </div>
      )}
    </motion.div>
  );
}

// Helper component for confidence factors
interface ConfidenceFactorProps {
  label: string;
  value: string;
  status: 'high' | 'medium' | 'low' | 'neutral';
  isLight: boolean;
}

function ConfidenceFactor({ label, value, status, isLight }: ConfidenceFactorProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'high':
        return isLight ? 'text-green-600' : 'text-green-400';
      case 'medium':
        return isLight ? 'text-blue-600' : 'text-blue-400';
      case 'low':
        return isLight ? 'text-orange-600' : 'text-orange-400';
      default:
        return isLight ? 'text-gray-600' : 'text-gray-400';
    }
  };

  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
        {label}
      </span>
      <span className={`text-xs font-semibold ${getStatusColor()}`}>
        {value}
      </span>
    </div>
  );
}
