'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';

interface HoverStatsOverlayProps {
  data: {
    name: string;
    count: number;
    avgPrice: number;
    minPrice: number;
    maxPrice: number;
    type: 'county' | 'city' | 'region';
  } | null;
}

export default function HoverStatsOverlay({ data }: HoverStatsOverlayProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(2)}M`;
    }
    return `$${(price / 1000).toLocaleString()}`;
  };

  // Always show card with default message when no data
  const displayData = data || {
    name: 'Explore California',
    count: 0,
    avgPrice: 0,
    minPrice: 0,
    maxPrice: 0,
    type: 'region' as const
  };

  return (
    <div className="fixed md:top-6 md:bottom-auto bottom-6 top-auto left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={displayData.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.15,
              ease: 'easeInOut'
            }}
            className={`
              px-6 py-4 rounded-2xl backdrop-blur-md
              ${isLight
                ? 'bg-white/95 shadow-xl shadow-indigo-500/20 border border-indigo-100'
                : 'bg-gray-900/95 shadow-2xl shadow-indigo-500/30 border border-indigo-800/50'
              }
            `}
          >
            {/* Area Name */}
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`
                text-2xl font-bold mb-3 text-center
                ${isLight ? 'text-gray-900' : 'text-white'}
              `}
            >
              {displayData.name}
            </motion.h1>

            {/* Stats Grid */}
            {displayData.count === 0 ? (
              /* No listings message or default message */
              <div className="text-center py-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={data ? 'zero-listings' : 'default'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: 'easeInOut' }}
                    className={`text-lg font-semibold ${isLight ? 'text-gray-600' : 'text-gray-400'}`}
                  >
                    {data ? 'Scroll to zoom in and reveal listings' : 'Hover over regions to explore'}
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                {/* Listing Count */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <div className={`text-3xl font-bold ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                    {displayData.count.toLocaleString()}
                  </div>
                  <div className={`text-xs font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Listings
                  </div>
                </motion.div>

                <div className={`w-px h-12 ${isLight ? 'bg-gray-300' : 'bg-gray-700'}`} />

                {/* Average Price */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center"
                >
                  <div className={`text-2xl font-bold ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                    {formatPrice(displayData.avgPrice)}
                  </div>
                  <div className={`text-xs font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Avg Price
                  </div>
                </motion.div>

                <div className={`w-px h-12 ${isLight ? 'bg-gray-300' : 'bg-gray-700'}`} />

                {/* Price Range */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-center"
                >
                  <div className={`text-lg font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
                    {formatPrice(displayData.minPrice)} - {formatPrice(displayData.maxPrice)}
                  </div>
                  <div className={`text-xs font-medium ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                    Price Range
                  </div>
                </motion.div>
              </div>
            )}

            {/* Area Type Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className={`
                mt-3 text-center text-xs font-medium uppercase tracking-wider
                ${isLight ? 'text-indigo-600/70' : 'text-indigo-400/70'}
              `}
            >
              {displayData.type}
            </motion.div>
          </motion.div>
      </AnimatePresence>
    </div>
  );
}
