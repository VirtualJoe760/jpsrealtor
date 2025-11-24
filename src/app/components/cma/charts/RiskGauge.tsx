'use client';

// src/app/components/cma/charts/RiskGauge.tsx
// Risk visualization with semicircle gauge

import { useTheme } from '@/app/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { RiskResult } from '@/lib/cma/riskEngine';

interface RiskGaugeProps {
  risk: RiskResult;
  className?: string;
  compact?: boolean;
  showRecommendations?: boolean;
}

export default function RiskGauge({
  risk,
  className = '',
  compact = false,
  showRecommendations = true,
}: RiskGaugeProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Determine color based on risk level
  const getRiskColor = () => {
    if (risk.label === 'Low') return isLight ? '#10b981' : '#34d399'; // green
    if (risk.label === 'Moderate') return isLight ? '#f59e0b' : '#fbbf24'; // yellow
    return isLight ? '#ef4444' : '#f87171'; // red
  };

  const riskColor = getRiskColor();

  // Prepare gauge data (semicircle)
  const gaugeData = [
    { name: 'Score', value: risk.score },
    { name: 'Remaining', value: 100 - risk.score },
  ];

  const COLORS = [riskColor, isLight ? '#e5e7eb' : '#374151'];

  // Get icon based on risk level
  const RiskIcon = risk.label === 'Low' ? Shield : risk.label === 'Moderate' ? AlertCircle : AlertTriangle;

  if (compact) {
    return (
      <div className={className}>
        <div className="mb-3">
          <div className={`text-sm font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
            Risk Assessment
          </div>
          <div className={`text-xs ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            {risk.label} Risk
          </div>
        </div>

        <div className="relative flex items-center justify-center" style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="85%"
                startAngle={180}
                endAngle={0}
                innerRadius="60%"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '35%' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="text-center"
            >
              <div className="text-3xl font-bold" style={{ color: riskColor }}>
                {risk.score}
              </div>
              <div className={`text-xs mt-0.5 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                {risk.label}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className={`rounded-lg border p-6 ${
        isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
      } ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <RiskIcon className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
        <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-900' : 'text-white'}`}>
          Market Risk Assessment
        </h3>
      </div>

      {/* Gauge Chart */}
      <div className="relative flex items-center justify-center" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="70%"
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
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '35%' }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3, type: 'spring' }}
            className="text-center"
          >
            <div className="text-5xl font-bold mb-1" style={{ color: riskColor }}>
              {risk.score}
            </div>
            <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              out of 100
            </div>
          </motion.div>
        </div>
      </div>

      {/* Risk Level Badge */}
      <div className="flex justify-center mb-6">
        <div
          className="px-4 py-2 rounded-full font-semibold text-sm"
          style={{
            backgroundColor: `${riskColor}20`,
            color: riskColor,
          }}
        >
          {risk.label} Risk
        </div>
      </div>

      {/* Interpretation */}
      <div className={`mb-6 p-4 rounded-lg ${
        isLight ? 'bg-gray-50' : 'bg-gray-900/50'
      }`}>
        <p className={`text-sm leading-relaxed ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          {risk.interpretation}
        </p>
      </div>

      {/* Risk Factors */}
      {Object.keys(risk.factors).length > 0 && (
        <div className={`mb-6 pb-6 border-b ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          <div className={`text-xs font-semibold mb-3 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Risk Factors:
          </div>
          <div className="space-y-2">
            {Object.entries(risk.factors)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([name, value]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                      {name}
                    </span>
                    <span className={`text-xs font-semibold ${
                      value > 60
                        ? isLight ? 'text-red-600' : 'text-red-400'
                        : value > 30
                          ? isLight ? 'text-yellow-600' : 'text-yellow-400'
                          : isLight ? 'text-green-600' : 'text-green-400'
                    }`}>
                      {value.toFixed(0)}
                    </span>
                  </div>
                  <div className={`w-full h-1.5 rounded-full overflow-hidden ${
                    isLight ? 'bg-gray-200' : 'bg-gray-700'
                  }`}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${value}%`,
                        backgroundColor: value > 60
                          ? isLight ? '#ef4444' : '#f87171'
                          : value > 30
                            ? isLight ? '#f59e0b' : '#fbbf24'
                            : isLight ? '#10b981' : '#34d399',
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && risk.recommendations.length > 0 && (
        <div>
          <div className={`text-xs font-semibold mb-3 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            Recommendations:
          </div>
          <ul className="space-y-2">
            {risk.recommendations.slice(0, 4).map((recommendation, index) => (
              <li
                key={index}
                className={`text-xs flex items-start gap-2 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}
              >
                <span
                  className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: riskColor }}
                />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className={`mt-6 p-3 rounded-lg flex items-start gap-2 ${
        isLight
          ? 'bg-yellow-50 border border-yellow-200'
          : 'bg-yellow-900/20 border border-yellow-700/30'
      }`}>
        <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isLight ? 'text-yellow-600' : 'text-yellow-400'}`} />
        <p className={`text-xs ${isLight ? 'text-yellow-800' : 'text-yellow-300'}`}>
          <strong>Disclaimer:</strong> Risk assessment is based on available market data and should be used
          as one factor in investment decisions. Consult with real estate and financial professionals.
        </p>
      </div>
    </motion.div>
  );
}
