"use client";

import Image from "next/image";

interface AnimatedClusterProps {
  count: number;
  size: number;
  onClick?: () => void;
  isLight?: boolean;
  cityName?: string;
  subdivisionName?: string;
  countyName?: string;
  regionName?: string;
  photoUrl?: string;
  clusterType?: 'region' | 'county' | 'city' | 'subdivision';
}

/**
 * Abbreviate large numbers (e.g., 5950 → "5.9k", 1200000 → "1.2m")
 */
function abbreviateNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

export default function AnimatedCluster({
  count,
  size,
  onClick,
  isLight = false,
  cityName,
  subdivisionName,
  countyName,
  regionName,
  photoUrl,
  clusterType = 'city'
}: AnimatedClusterProps) {
  const displayCount = abbreviateNumber(count);
  const locationLabel = regionName || subdivisionName || cityName || countyName;

  // Modern circular cluster design - compact and clean
  const baseSizeMultiplier = 1.4; // Compact size for modern look
  const clusterSize = size * baseSizeMultiplier;

  // Size tiers for visual hierarchy
  const getSizeClass = () => {
    if (count > 100) return clusterSize * 1.3;
    if (count > 50) return clusterSize * 1.15;
    if (count > 20) return clusterSize * 1.0;
    return clusterSize * 0.9;
  };

  const finalSize = getSizeClass();

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all hover:scale-105 active:scale-95 relative"
      style={{
        zIndex: 1000,
        width: finalSize,
        height: finalSize,
      }}
    >
      {/* Modern circular cluster */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring with pulse animation */}
        <div
          className={`absolute inset-0 rounded-full ${
            isLight
              ? 'bg-emerald-500/20'
              : 'bg-emerald-400/20'
          }`}
          style={{
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />

        {/* Main cluster circle */}
        <div
          className={`relative rounded-full overflow-hidden flex items-center justify-center ${
            isLight
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg hover:shadow-xl'
              : 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-lg hover:shadow-xl'
          }`}
          style={{
            width: finalSize * 0.85,
            height: finalSize * 0.85,
            border: '3px solid white',
            boxShadow: isLight
              ? '0 4px 14px rgba(0,0,0,0.25), 0 0 0 2px rgba(16, 185, 129, 0.3)'
              : '0 4px 14px rgba(0,0,0,0.4), 0 0 0 2px rgba(16, 185, 129, 0.4)',
          }}
        >
          {/* Count display */}
          <div className="text-white font-bold flex flex-col items-center justify-center">
            <span style={{ fontSize: Math.max(12, finalSize * 0.25) }}>
              {displayCount}
            </span>
            {count > 10 && (
              <span className="text-[8px] opacity-75">listings</span>
            )}
          </div>
        </div>

        {/* Location label - only for larger regions */}
        {locationLabel && clusterType !== 'city' && count > 20 && (
          <div
            className="absolute left-1/2 transform -translate-x-1/2 text-center whitespace-nowrap font-bold pointer-events-none bg-white/90 dark:bg-gray-900/90 px-2 py-0.5 rounded-full shadow-sm"
            style={{
              top: finalSize + 4,
              fontSize: Math.max(10, finalSize * 0.2),
              color: isLight ? '#1f2937' : '#ffffff',
            }}
          >
            {locationLabel}
          </div>
        )}
      </div>
    </div>
  );
}
