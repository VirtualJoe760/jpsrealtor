/**
 * Tutorial Positioning Constants
 * Centralized positioning logic for avatars across all tutorial steps
 */

import { AvatarPosition } from '../types';

/**
 * Desktop Avatar Positions by Step Index
 * FIXED: Toasty stays at bottom-right (bottom-4 right-4) for steps 3-6
 * Speech bubble positioning is handled separately
 */
export const desktopAvatarPositions: Record<number, AvatarPosition> = {
  0: {
    // Welcome
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-16 left-80',
    mirror: false,
  },
  1: {
    // Search input
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-16 left-80',
    mirror: false,
  },
  2: {
    // Scroll step - moved down to give bubble space
    vertical: 'top',
    horizontal: 'left',
    classes: 'top-[20rem] left-80',
    mirror: false,
  },
  3: {
    // Results toggle - bottom-right
    vertical: 'bottom',
    horizontal: 'right',
    classes: 'bottom-4 right-4', // FIXED: Keep at bottom
    mirror: true,
  },
  4: {
    // List view button - FIXED: stay at bottom-right
    vertical: 'bottom',
    horizontal: 'right',
    classes: 'bottom-4 right-4', // FIXED: Was bottom-48, now stays at bottom
    mirror: true,
  },
  5: {
    // Sort dropdown - FIXED: stay at bottom-right
    vertical: 'bottom',
    horizontal: 'right',
    classes: 'bottom-4 right-4', // FIXED: Was bottom-48, now stays at bottom
    mirror: true,
  },
  6: {
    // View listing - keep in BOTTOM-LEFT CORNER
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-8 left-8', // Keep in corner, don't block content
    mirror: false, // Don't mirror - point right at View button
  },
  7: {
    // Swipe right
    vertical: 'bottom',
    horizontal: 'right',
    classes: 'bottom-16 right-80',
    mirror: true,
  },
  8: {
    // Swipe left
    vertical: 'bottom',
    horizontal: 'right',
    classes: 'bottom-16 right-80',
    mirror: true,
  },
  9: {
    // Close listing panel - point to X button at top-right of panel
    vertical: 'bottom',
    horizontal: 'right',
    classes: 'bottom-8 right-8', // Bottom-right, pointing up-left to X button
    mirror: true,
  },
  10: {
    // Map mode - point UP to top toggle button
    vertical: 'top',
    horizontal: 'right',
    classes: 'top-40 right-20', // Further below top toggle, pointing up
    mirror: false,
  },
  11: {
    // Map filters - keep in bottom-left corner (SWAPPED with search)
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-8 left-8',
    mirror: false,
  },
  12: {
    // Map search - position below search bar on right side, point UP
    vertical: 'top',
    horizontal: 'right',
    classes: 'top-32 right-20', // Below the map search bar, pointing up
    mirror: false,
  },
  13: {
    // Back to chat - point UP to top toggle
    vertical: 'top',
    horizontal: 'left',
    classes: 'top-24 left-20', // Below top toggle, pointing up
    mirror: false,
  },
  14: {
    // New chat
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-16 left-80',
    mirror: false,
  },
  15: {
    // Completion
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-16 left-80',
    mirror: false,
  },
};

/**
 * Mobile Avatar Positions by Step Index
 * Simpler positioning for mobile devices
 */
export const mobileAvatarPositions: Record<number, AvatarPosition> = {
  0: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  1: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  2: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  3: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  4: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  5: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  6: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  7: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  8: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  9: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  10: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  11: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  12: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  13: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  14: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
  15: {
    vertical: 'bottom',
    horizontal: 'left',
    classes: 'bottom-24 left-6',
    mirror: false,
  },
};

/**
 * Get avatar position for a specific step
 */
export function getAvatarPosition(stepIndex: number, isMobile: boolean): AvatarPosition {
  const positions = isMobile ? mobileAvatarPositions : desktopAvatarPositions;
  return positions[stepIndex] || positions[0]; // Fallback to step 0 position
}

/**
 * Avatar Size by Step and Screen Width
 * Returns size in pixels
 */
export function getAvatarSize(stepIndex: number, screenWidth: number): number {
  const isScrollStep = stepIndex === 2;

  if (screenWidth < 768) {
    // Mobile
    return isScrollStep ? 120 : 180;
  } else if (screenWidth < 1920) {
    // Laptop/MacBook - REDUCED from 560 to 280 for better visibility
    return isScrollStep ? 280 : 280;
  } else {
    // Large screens
    return isScrollStep ? 500 : 720;
  }
}

/**
 * Check if avatar should be mirrored on this step
 */
export function shouldMirrorAvatar(
  stepIndex: number,
  isMobile: boolean,
  avatarMirrorOnFlip: boolean
): boolean {
  if (!avatarMirrorOnFlip) return false;

  const position = getAvatarPosition(stepIndex, isMobile);
  return position.mirror || false;
}
