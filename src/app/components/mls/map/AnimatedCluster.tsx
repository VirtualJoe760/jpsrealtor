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

  // Pin dimensions based on size - INCREASED for better visibility (especially for colorblind users)
  const baseSizeMultiplier = 1.8; // Increased from 1.0 to make markers 80% larger
  const pinWidth = size * 1.2 * baseSizeMultiplier;
  const pinHeight = size * 1.5 * baseSizeMultiplier;
  const photoSize = size * 0.9 * baseSizeMultiplier;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all hover:scale-110 active:scale-95 relative"
      style={{
        zIndex: 1000,
        width: pinWidth,
        height: pinHeight,
      }}
    >
      {/* Pin drop container */}
      <div className="relative flex flex-col items-center">
        {/* Pin head with photo or gradient - ENHANCED for colorblind visibility */}
        <div
          className={`relative rounded-t-full rounded-b-none overflow-hidden ${
            isLight
              ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl hover:shadow-2xl'
              : 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-xl hover:shadow-2xl'
          }`}
          style={{
            width: photoSize,
            height: photoSize,
            border: '4px solid white', // Increased from 3px to 4px for stronger border
            boxShadow: isLight
              ? '0 6px 20px rgba(0,0,0,0.3), 0 0 0 3px rgba(16, 185, 129, 0.4), 0 2px 8px rgba(16, 185, 129, 0.5)' // Stronger multi-layer shadow
              : '0 6px 20px rgba(0,0,0,0.5), 0 0 0 3px rgba(16, 185, 129, 0.5), 0 2px 8px rgba(16, 185, 129, 0.6)',
          }}
        >
          {/* Photo (if available) */}
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={locationLabel || 'Location'}
              fill
              className="object-cover"
              sizes={`${photoSize}px`}
            />
          ) : (
            // Default gradient background with home icon
            <div className="w-full h-full flex items-center justify-center">
              <svg
                className="w-1/2 h-1/2 text-white opacity-70"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
          )}

          {/* Overlay with count */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end justify-center pb-1">
            <span className="text-white font-bold text-xs drop-shadow-lg">
              {displayCount}
            </span>
          </div>
        </div>

        {/* Pin point (teardrop bottom) */}
        <div
          className={`${
            isLight
              ? 'bg-gradient-to-b from-emerald-500 to-emerald-700'
              : 'bg-gradient-to-b from-emerald-600 to-emerald-800'
          }`}
          style={{
            width: 0,
            height: 0,
            borderLeft: `${photoSize / 6}px solid transparent`,
            borderRight: `${photoSize / 6}px solid transparent`,
            borderTop: `${photoSize / 3}px solid ${isLight ? '#10b981' : '#059669'}`,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          }}
        />

        {/* Location label with ENHANCED drop shadow and stroke for better visibility */}
        {/* Hide labels for city clusters to prevent overlapping - cities are too dense */}
        {locationLabel && clusterType !== 'city' && (
          <div
            className="absolute left-1/2 transform -translate-x-1/2 text-center whitespace-nowrap font-bold transition-all hover:scale-105 pointer-events-none"
            style={{
              top: pinHeight + 6,
              fontSize: Math.max(14, size * 0.35 * baseSizeMultiplier), // Increased font size
              maxWidth: pinWidth * 3,
              paddingTop: '4px', // Add top padding to prevent clipping
              paddingBottom: '4px', // Add bottom padding to prevent clipping
              lineHeight: '1.4', // Increase line height for better spacing
              overflow: 'visible', // Changed from 'hidden' to prevent clipping
              color: isLight ? '#1f2937' : '#ffffff',
              textShadow: isLight
                ? '0 3px 6px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3), -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, -1px 0 0 #fff, 1px 0 0 #fff, 0 -1px 0 #fff, 0 1px 0 #fff' // Stronger stroke
                : '0 4px 8px rgba(0,0,0,0.9), 0 2px 4px rgba(0,0,0,0.7), -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -1px 0 0 #000, 1px 0 0 #000, 0 -1px 0 #000, 0 1px 0 #000',
              filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.6))', // Stronger shadow
            }}
          >
            {locationLabel}
          </div>
        )}
      </div>
    </div>
  );
}
