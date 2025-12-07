'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/contexts/ThemeContext';
import { useState, useEffect } from 'react';

interface HoverStatsOverlayProps {
  data: {
    name: string;
    count: number;
    avgPrice?: number;
    medianPrice?: number;
    minPrice: number;
    maxPrice: number;
    type: 'county' | 'city' | 'region';
  } | null;
  californiaStats?: {
    count: number;
    medianPrice: number;
    minPrice: number;
    maxPrice: number;
  };
  contextualBoundary?: {
    name: string;
    count: number;
    avgPrice?: number;
    medianPrice?: number;
    minPrice: number;
    maxPrice: number;
    type: 'county' | 'city' | 'region' | 'california';
  } | null;
}

export default function HoverStatsOverlay({ data, californiaStats = { count: 0, medianPrice: 0, minPrice: 0, maxPrice: 0 }, contextualBoundary }: HoverStatsOverlayProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotating messages for default state (no hover)
  const defaultMessages = [
    'Hover over regions to explore',
    'Scroll to zoom in and reveal listings'
  ];

  // Auto-rotate messages every 3 seconds when not hovering
  useEffect(() => {
    if (!data) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % defaultMessages.length);
      }, 3000);

      return () => clearInterval(interval);
    } else {
      // Reset to first message when hovering
      setMessageIndex(0);
    }
  }, [data]);

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      const millions = price / 1000000;
      return millions >= 10 ? `$${millions.toFixed(1)}M` : `$${millions.toFixed(2)}M`;
    }
    if (price >= 1000) {
      const thousands = price / 1000;
      return thousands >= 10 ? `$${thousands.toFixed(0)}K` : `$${thousands.toFixed(1)}K`;
    }
    return `$${price.toLocaleString()}`;
  };

  // Priority: Hover > Contextual Boundary > California Default
  const displayData = data || contextualBoundary || null;

  // Check if we're showing California default (no hover, no contextual boundary)
  const isCaliforniaDefault = !data && !contextualBoundary;

  return (
    <div className="fixed top-0 left-0 right-0 md:top-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto z-50 pointer-events-none">
      {/* Mobile: Always visible card container */}
      <div
        className={`
          w-full px-6 py-4 md:w-auto md:px-8 md:py-5 md:rounded-2xl backdrop-blur-xl
          flex flex-col items-center justify-center
          border-b md:border-b-0
          ${isLight
            ? 'bg-gradient-to-b from-white/95 to-white/90 shadow-lg shadow-blue-500/10 md:border border-gray-200/50 md:border-b'
            : 'bg-gradient-to-b from-black/90 to-black/85 shadow-xl shadow-emerald-500/30 md:border border-emerald-700/40 md:border-b'
          }
        `}
      >
        {/* Desktop: Animate entire content. Mobile: Keep visible, only animate inner text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={displayData?.name || 'california'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.15,
              ease: 'easeInOut'
            }}
            className="md:block"
          >
            {/* Area Name */}
            <h1
              className={`
                text-xl md:text-3xl font-bold mb-1 md:mb-2 text-center tracking-tight
                ${isLight
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-900'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200'
                }
              `}
            >
              {displayData?.name || 'Explore California'}
            </h1>

            {/* Stats Grid - Fixed height container to prevent box resize */}
            {isCaliforniaDefault && californiaStats && californiaStats.count > 0 ? (
              /* California default state - show California-wide stats (no price range) */
              <div className="flex items-center gap-4 md:gap-8">
                {/* Listing Count */}
                <div className="text-center">
                  <div className={`text-2xl md:text-4xl font-extrabold tracking-tight ${
                    isLight
                      ? 'text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-blue-800'
                      : 'text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-200'
                  }`}>
                    {californiaStats.count.toLocaleString()}
                  </div>
                  <div className={`text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-1 ${
                    isLight ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    Listings
                  </div>
                </div>

                <div className={`w-px h-12 md:h-14 ${isLight ? 'bg-gradient-to-b from-transparent via-gray-300 to-transparent' : 'bg-gradient-to-b from-transparent via-emerald-800/50 to-transparent'}`} />

                {/* Median Price */}
                <div className="text-center">
                  <div className={`text-xl md:text-3xl font-bold tracking-tight ${
                    isLight ? 'text-blue-700' : 'text-emerald-300'
                  }`}>
                    {formatPrice(californiaStats.medianPrice)}
                  </div>
                  <div className={`text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-1 ${
                    isLight ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    Median Price
                  </div>
                </div>
              </div>
            ) : displayData && displayData.count === 0 && !data ? (
              /* Default state with rotating messages */
              <div className="text-center py-2 min-h-[3.5rem] flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={messageIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className={`text-base md:text-lg font-semibold ${isLight ? 'text-gray-600' : 'text-gray-400'}`}
                  >
                    {defaultMessages[messageIndex]}
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : displayData && displayData.count === 0 ? (
              /* Zero listings on hover */
              <div className="text-center py-2 min-h-[3.5rem] flex items-center justify-center">
                <div className={`text-base md:text-lg font-semibold ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Scroll to zoom in and reveal listings
                </div>
              </div>
            ) : displayData ? (
              <div className="flex items-center gap-4 md:gap-8">
                {/* Listing Count */}
                <div className="text-center">
                  <div className={`text-2xl md:text-4xl font-extrabold tracking-tight ${
                    isLight
                      ? 'text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-blue-800'
                      : 'text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-200'
                  }`}>
                    {displayData.count.toLocaleString()}
                  </div>
                  <div className={`text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-1 ${
                    isLight ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    Listings
                  </div>
                </div>

                <div className={`w-px h-12 md:h-14 ${isLight ? 'bg-gradient-to-b from-transparent via-gray-300 to-transparent' : 'bg-gradient-to-b from-transparent via-emerald-800/50 to-transparent'}`} />

                {/* Median Price */}
                <div className="text-center">
                  <div className={`text-xl md:text-3xl font-bold tracking-tight ${
                    isLight ? 'text-blue-700' : 'text-emerald-300'
                  }`}>
                    {formatPrice(displayData.medianPrice || displayData.avgPrice || 0)}
                  </div>
                  <div className={`text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-1 ${
                    isLight ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    Median Price
                  </div>
                </div>

                <div className={`w-px h-12 md:h-14 ${isLight ? 'bg-gradient-to-b from-transparent via-gray-300 to-transparent' : 'bg-gradient-to-b from-transparent via-emerald-800/50 to-transparent'}`} />

                {/* Price Range */}
                <div className="text-center">
                  <div className={`text-base md:text-xl font-bold tracking-tight ${
                    isLight ? 'text-gray-800' : 'text-gray-100'
                  }`}>
                    {formatPrice(displayData.minPrice)} - {formatPrice(displayData.maxPrice)}
                  </div>
                  <div className={`text-[10px] md:text-xs font-semibold uppercase tracking-wider mt-1 ${
                    isLight ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    Price Range
                  </div>
                </div>
              </div>
            ) : null}

            {/* Area Type Badge - Hidden on mobile */}
            {displayData && (
              <div
                className={`
                  hidden md:flex items-center justify-center mt-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                  ${isLight
                    ? 'bg-blue-100/80 text-blue-700 border border-blue-200/50'
                    : 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                  }
                `}
              >
                {displayData.type}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
