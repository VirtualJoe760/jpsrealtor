import type { LayoutState } from '../types';

const OPTIMAL_PANEL_WIDTH = {
  sm: 500,   // Small tablets
  md: 550,   // Medium tablets
  lg: 600,   // Laptops
  xl: 700,   // Larger laptops
  "2xl": 900, // Large desktop
};

export function getOptimalPanelWidth(): number {
  if (typeof window === 'undefined') return 900;
  const w = window.innerWidth;
  if (w < 640) return w; // Mobile: full width
  if (w < 1024) return OPTIMAL_PANEL_WIDTH.sm;
  if (w < 1280) return OPTIMAL_PANEL_WIDTH.md;
  if (w < 1536) return OPTIMAL_PANEL_WIDTH.lg;
  if (w < 1920) return OPTIMAL_PANEL_WIDTH.xl;
  return OPTIMAL_PANEL_WIDTH["2xl"];
}

export function calculateLayout(): LayoutState {
  const optimalWidth = getOptimalPanelWidth();
  const w = window.innerWidth;
  const left = w < 640 ? 0 : (w - optimalWidth) / 2; // Center on larger screens
  return { width: optimalWidth, left };
}
