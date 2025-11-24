// src/components/ui/error-state.tsx
// Polished error states with theme support and retry functionality

'use client';

import { motion } from 'framer-motion';
import { useTheme } from '@/app/contexts/ThemeContext';
import { getErrorStyles, getGlassCardStyles, spacing, animationVariants } from '@/lib/ui/theme-styles';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  showIcon?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
  showIcon = true,
}: ErrorStateProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const errorStyles = getErrorStyles(isLight);
  const cardStyles = getGlassCardStyles(isLight);

  return (
    <motion.div
      className={`${cardStyles} ${errorStyles} rounded-xl ${spacing.card} ${className}`}
      variants={animationVariants.slideUp}
      initial="initial"
      animate="animate"
    >
      <div className="flex items-start gap-4">
        {showIcon && (
          <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <h3 className="font-semibold mb-1">{title}</h3>
          <p className="text-sm opacity-90">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function NoDataState({
  title = 'No data available',
  message,
  icon: Icon,
  action,
  actionLabel,
  className = '',
}: {
  title?: string;
  message: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: () => void;
  actionLabel?: string;
  className?: string;
}) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const cardStyles = getGlassCardStyles(isLight);
  const textColor = isLight ? 'text-gray-600' : 'text-zinc-400';

  const DisplayIcon = Icon || AlertCircle;

  return (
    <motion.div
      className={`${cardStyles} rounded-xl ${spacing.card} text-center ${className}`}
      variants={animationVariants.fadeIn}
      initial="initial"
      animate="animate"
    >
      <DisplayIcon className={`w-12 h-12 mx-auto mb-4 ${textColor}`} />
      <h3 className={`text-lg font-semibold mb-2 ${isLight ? 'text-gray-900' : 'text-zinc-100'}`}>
        {title}
      </h3>
      <p className={`text-sm ${textColor} mb-4`}>{message}</p>
      {action && actionLabel && (
        <button
          onClick={action}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isLight
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          }`}
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}

// Specific error states for common scenarios
export function NoCompsFoundError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="No Comparable Properties Found"
      message="We couldn't find any comparable properties in this area. Try adjusting your search criteria or expanding the search radius."
      onRetry={onRetry}
    />
  );
}

export function CMALoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Failed to Load CMA"
      message="There was an error loading the Comparative Market Analysis. Please try again."
      onRetry={onRetry}
    />
  );
}

export function ForecastDataError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="No Forecast Data Available"
      message="Unable to generate forecast data for this property. Historical data may be insufficient."
      onRetry={onRetry}
    />
  );
}

export function RiskModelError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="No Risk Model Available"
      message="Risk assessment could not be completed. This may be due to insufficient market data."
      onRetry={onRetry}
    />
  );
}

export function SubdivisionAnalyticsError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="No Subdivision Analytics"
      message="Unable to load analytics for this subdivision. Please try again later."
      onRetry={onRetry}
    />
  );
}

export function AIRequestError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="AI Could Not Interpret Request"
      message="We couldn't understand your request. Please try rephrasing or be more specific about what you're looking for."
      onRetry={onRetry}
    />
  );
}

export function MapLoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Map Failed to Load Listings"
      message="There was an error loading listings on the map. Please check your connection and try again."
      onRetry={onRetry}
    />
  );
}
