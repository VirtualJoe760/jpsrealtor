// Panel layout utilities

import { OPTIMAL_PANEL_WIDTH, PANEL_MIN_WIDTH, PANEL_MAX_WIDTH } from '../constants';

/**
 * Get optimal panel width based on viewport size
 */
export function getOptimalPanelWidth(): number {
  if (typeof window === 'undefined') return 900;

  const w = window.innerWidth;

  if (w < 640) return w; // Mobile: full width
  if (w < 1024) return OPTIMAL_PANEL_WIDTH.sm;
  if (w < 1280) return OPTIMAL_PANEL_WIDTH.md;
  if (w < 1536) return OPTIMAL_PANEL_WIDTH.lg;
  if (w < 1920) return OPTIMAL_PANEL_WIDTH.xl;

  return OPTIMAL_PANEL_WIDTH['2xl'];
}

/**
 * Constrain panel width within min/max bounds
 */
export function constrainPanelWidth(width: number): number {
  return Math.max(PANEL_MIN_WIDTH, Math.min(PANEL_MAX_WIDTH, width));
}

/**
 * Calculate new panel width from drag distance
 */
export function calculatePanelWidth(
  currentWidth: number,
  dragStartX: number,
  currentX: number
): number {
  const delta = dragStartX - currentX;
  const newWidth = currentWidth + delta;
  return constrainPanelWidth(newWidth);
}

/**
 * Check if panel should be full width (mobile)
 */
export function isMobileView(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 640;
}
