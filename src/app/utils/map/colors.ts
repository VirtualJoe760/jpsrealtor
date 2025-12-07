// Color calculation utilities for map boundaries and clusters
// Handles activity-based coloring for regions, counties, cities

/**
 * Formats a price value for display
 * @param price Price value
 * @returns Formatted string (e.g., "$1.5m", "$450k", or "—")
 */
export function formatPrice(price?: number): string {
  if (!price) return "—";
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}k`;
  return `$${price}`;
}

/**
 * Calculates color based on listing activity/count
 * Uses percentile-based coloring:
 * - Zero listings: Gray
 * - Top 33% (High): Red
 * - Middle 33% (Medium): Yellow
 * - Bottom 33% (Low): Blue (light mode) or Green (dark mode)
 *
 * @param count Listing count for this boundary
 * @param allCounts Array of all counts for percentile calculation
 * @param isLight Whether using light theme
 * @returns Hex color code
 */
export function getActivityColor(
  count: number,
  allCounts: number[],
  isLight: boolean
): string {
  // Zero listings = gray
  if (count === 0) {
    const color = isLight ? '#9ca3af' : '#6b7280';
    console.log(`[colors] Zero activity - returning gray: ${color}`);
    return color;
  }

  // Filter out zeros for percentile calculation
  const nonZeroCounts = allCounts.filter(c => c > 0);
  if (nonZeroCounts.length === 0) {
    const color = isLight ? '#9ca3af' : '#6b7280';
    console.log(`[colors] No non-zero counts - returning gray: ${color}`);
    return color;
  }

  // Sort to find percentiles
  const sorted = [...nonZeroCounts].sort((a, b) => a - b);
  const percentile33 = sorted[Math.floor(sorted.length * 0.33)];
  const percentile66 = sorted[Math.floor(sorted.length * 0.66)];

  console.log(`[colors] Percentiles - 33rd: ${percentile33}, 66th: ${percentile66}, count: ${count}`);

  // Assign colors based on percentile
  if (count >= percentile66) {
    // High activity - RED
    const color = isLight ? '#ef4444' : '#f87171';
    console.log(`[colors] High activity (>= ${percentile66}) - RED: ${color}`);
    return color;
  } else if (count >= percentile33) {
    // Medium activity - YELLOW
    const color = isLight ? '#eab308' : '#fbbf24';
    console.log(`[colors] Medium activity (>= ${percentile33}) - YELLOW: ${color}`);
    return color;
  } else {
    // Low activity - BLUE (light) or GREEN (dark)
    const color = isLight ? '#3b82f6' : '#22c55e';
    console.log(`[colors] Low activity (< ${percentile33}) - ${isLight ? 'BLUE' : 'GREEN'}: ${color}`);
    return color;
  }
}

/**
 * Generates fill color with opacity for polygons
 * @param baseColor Hex color code
 * @param opacity Opacity value (0-1)
 * @returns RGBA color string
 */
export function colorWithOpacity(baseColor: string, opacity: number): string {
  // Convert hex to RGB
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const rgba = `rgba(${r}, ${g}, ${b}, ${opacity})`;
  console.log(`[colors] Applied opacity ${opacity} to ${baseColor} -> ${rgba}`);

  return rgba;
}

/**
 * Gets stroke color for polygon borders
 * Returns darker version for light mode, lighter for dark mode
 * @param isLight Whether using light theme
 * @returns Hex color code
 */
export function getStrokeColor(isLight: boolean): string {
  return isLight ? '#1f2937' : '#d1d5db';
}

/**
 * Gets hover state color for boundaries
 * @param isLight Whether using light theme
 * @returns Hex color code
 */
export function getHoverColor(isLight: boolean): string {
  return isLight ? '#3b82f6' : '#60a5fa';
}

/**
 * Color palette for different boundary types
 */
export const BOUNDARY_COLORS = {
  region: {
    light: '#8b5cf6', // purple
    dark: '#a78bfa',
  },
  county: {
    light: '#06b6d4', // cyan
    dark: '#22d3ee',
  },
  city: {
    light: '#10b981', // green
    dark: '#34d399',
  },
} as const;

/**
 * Gets boundary color based on type and theme
 * @param type Boundary type
 * @param isLight Whether using light theme
 * @returns Hex color code
 */
export function getBoundaryColor(
  type: 'region' | 'county' | 'city',
  isLight: boolean
): string {
  const color = BOUNDARY_COLORS[type][isLight ? 'light' : 'dark'];
  console.log(`[colors] Boundary color for ${type} (${isLight ? 'light' : 'dark'}): ${color}`);
  return color;
}
