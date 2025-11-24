'use client';

// src/app/components/cma/CMAPreviewCard.tsx
// Preview card for saved CMAs

import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import type { SavedCMA } from '@/app/utils/cma/saveCMA';
import { formatCMAAge, isCMAStale } from '@/app/utils/cma/loadCMA';

export interface CMAPreviewCardProps {
  cma: SavedCMA;
  onClick?: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
}

export default function CMAPreviewCard({
  cma,
  onClick,
  onDelete,
  isSelected = false,
}: CMAPreviewCardProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const isStale = isCMAStale(cma.generatedAt);
  const age = formatCMAAge(cma.generatedAt);

  const { previewData } = cma;

  // Confidence level color
  const confidenceColor = previewData.confidenceScore
    ? previewData.confidenceScore >= 0.8
      ? 'text-green-600 dark:text-green-400'
      : previewData.confidenceScore >= 0.6
      ? 'text-yellow-600 dark:text-yellow-400'
      : 'text-red-600 dark:text-red-400'
    : 'text-gray-600 dark:text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ scale: 1.02 }}
      className={`
        relative rounded-lg border transition-all cursor-pointer
        ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800'
        }
        ${isStale ? 'opacity-75' : ''}
        hover:shadow-lg
      `}
      onClick={onClick}
    >
      {/* Stale indicator */}
      {isStale && (
        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
          Outdated
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {cma.subjectAddress || 'Unknown Address'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {age}
            </p>
          </div>

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Delete CMA"
            >
              <svg
                className="w-4 h-4 text-gray-500 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Estimated Value */}
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {previewData.estimatedValue
              ? `$${previewData.estimatedValue.toLocaleString()}`
              : 'N/A'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {previewData.valueRange}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
          {/* Confidence Score */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Confidence
            </div>
            <div className={`text-sm font-semibold ${confidenceColor}`}>
              {previewData.confidenceScore !== null
                ? `${Math.round(previewData.confidenceScore * 100)}%`
                : 'N/A'}
            </div>
          </div>

          {/* Comps Count */}
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Comparables
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {previewData.compCount}
            </div>
          </div>

          {/* CAGR (if available) */}
          {previewData.cagr5 !== null && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                5-Yr CAGR
              </div>
              <div
                className={`text-sm font-semibold ${
                  previewData.cagr5 >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {(previewData.cagr5 * 100).toFixed(2)}%
              </div>
            </div>
          )}

          {/* Cap Rate (if available) */}
          {previewData.capRate !== null && (
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Cap Rate
              </div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {(previewData.capRate * 100).toFixed(2)}%
              </div>
            </div>
          )}
        </div>

        {/* Subject Property ID (if available) */}
        {cma.subjectPropertyId && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Property ID: {cma.subjectPropertyId}
            </div>
          </div>
        )}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <motion.div
          layoutId="cma-selection"
          className="absolute inset-0 rounded-lg border-2 border-blue-500 pointer-events-none"
          initial={false}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      )}
    </motion.div>
  );
}
