// src/lib/ui/theme-styles.ts
// Centralized theme-aware styling utilities for UI consistency

/**
 * Get glassmorphism card styles based on theme
 */
export function getGlassCardStyles(isLight: boolean): string {
  return isLight
    ? 'bg-white/80 backdrop-blur-md border border-gray-300 shadow-md'
    : 'bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 shadow-xl';
}

/**
 * Get standard text color based on theme
 */
export function getTextStyles(isLight: boolean) {
  return {
    primary: isLight ? 'text-gray-900' : 'text-zinc-100',
    secondary: isLight ? 'text-gray-700' : 'text-zinc-300',
    tertiary: isLight ? 'text-gray-600' : 'text-zinc-400',
    muted: isLight ? 'text-gray-500' : 'text-zinc-500',
  };
}

/**
 * Get input field styles based on theme
 */
export function getInputStyles(isLight: boolean): string {
  return isLight
    ? 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
    : 'bg-zinc-800/50 border-zinc-700 text-white placeholder-zinc-500 focus:ring-purple-500 focus:border-purple-500';
}

/**
 * Get button styles based on theme and variant
 */
export function getButtonStyles(isLight: boolean, variant: 'primary' | 'secondary' | 'ghost' = 'primary'): string {
  if (variant === 'primary') {
    return isLight
      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg'
      : 'bg-gradient-to-r from-purple-500 to-emerald-500 hover:from-purple-600 hover:to-emerald-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.5)]';
  } else if (variant === 'secondary') {
    return isLight
      ? 'bg-gray-200 hover:bg-gray-300 text-gray-900'
      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700';
  } else {
    return isLight
      ? 'bg-transparent hover:bg-gray-100 text-gray-700'
      : 'bg-transparent hover:bg-zinc-800 text-zinc-300';
  }
}

/**
 * Get chart colors based on theme
 */
export function getChartColors(isLight: boolean) {
  return {
    primary: isLight ? '#3b82f6' : '#a855f7', // blue / purple
    secondary: isLight ? '#8b5cf6' : '#10b981', // violet / emerald
    tertiary: isLight ? '#06b6d4' : '#f59e0b', // cyan / amber
    grid: isLight ? '#e5e7eb' : '#3f3f46',
    text: isLight ? '#374151' : '#d4d4d8',
    tooltip: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(24, 24, 27, 0.95)',
    tooltipBorder: isLight ? '#d1d5db' : '#52525b',
  };
}

/**
 * Get error state styles
 */
export function getErrorStyles(isLight: boolean): string {
  return isLight
    ? 'bg-red-50 border border-red-300 text-red-600'
    : 'bg-red-500/10 border border-red-500/50 text-red-400';
}

/**
 * Get success state styles
 */
export function getSuccessStyles(isLight: boolean): string {
  return isLight
    ? 'bg-green-50 border border-green-300 text-green-600'
    : 'bg-green-500/10 border border-green-500/50 text-green-400';
}

/**
 * Get skeleton loader styles
 */
export function getSkeletonStyles(isLight: boolean): string {
  return isLight
    ? 'bg-gray-200 animate-pulse'
    : 'bg-zinc-800 animate-pulse';
}

/**
 * Get divider styles
 */
export function getDividerStyles(isLight: boolean): string {
  return isLight ? 'border-gray-200' : 'border-zinc-800';
}

/**
 * Standard spacing classes for consistency
 */
export const spacing = {
  card: 'p-4 md:p-6 lg:p-8',
  section: 'mb-6 md:mb-8',
  gap: 'gap-4 md:gap-6',
};

/**
 * Standard animation variants for Framer Motion
 */
export const animationVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  stagger: {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  },
};

/**
 * Get background gradient for pages
 */
export function getPageBackground(isLight: boolean): string {
  return isLight
    ? 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
    : 'bg-gradient-to-br from-black via-zinc-900 to-zinc-900';
}
