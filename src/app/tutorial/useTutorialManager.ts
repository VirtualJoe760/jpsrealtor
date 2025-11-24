// src/app/tutorial/useTutorialManager.ts
// Hook to manage tutorial state with localStorage persistence

import { useState, useEffect, useCallback } from 'react';
import type { TutorialPage } from './joyrideSteps';

const STORAGE_KEY = 'jps_tutorial_v2';

export interface TutorialFlags {
  map: boolean;
  cma: boolean;
  listing: boolean;
  subdivision: boolean;
  dashboard: boolean;
  chat: boolean;
}

export interface TutorialManager {
  // Check if tutorial should show for a page
  shouldShowTutorial: (page: TutorialPage) => boolean;

  // Mark tutorial as completed/dismissed
  completeTutorial: (page: TutorialPage) => void;

  // Skip tutorial for a page
  skipTutorial: (page: TutorialPage) => void;

  // Relaunch tutorial manually (from Help menu)
  relaunchTutorial: (page: TutorialPage) => void;

  // Reset all tutorials (clear localStorage)
  resetAllTutorials: () => void;

  // Get current tutorial flags
  getTutorialFlags: () => TutorialFlags;

  // Check if user has completed any tutorial
  hasCompletedAnyTutorial: () => boolean;
}

/**
 * Custom hook to manage tutorial state across the application
 */
export function useTutorialManager(): TutorialManager {
  const [tutorialFlags, setTutorialFlags] = useState<TutorialFlags>({
    map: false,
    cma: false,
    listing: false,
    subdivision: false,
    dashboard: false,
    chat: false,
  });

  // Load tutorial flags from localStorage on mount
  useEffect(() => {
    loadTutorialFlags();
  }, []);

  /**
   * Load tutorial flags from localStorage
   */
  const loadTutorialFlags = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTutorialFlags((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('[TutorialManager] Failed to load tutorial flags:', error);
    }
  }, []);

  /**
   * Save tutorial flags to localStorage
   */
  const saveTutorialFlags = useCallback((flags: TutorialFlags) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
      setTutorialFlags(flags);
    } catch (error) {
      console.error('[TutorialManager] Failed to save tutorial flags:', error);
    }
  }, []);

  /**
   * Check if tutorial should show for a specific page
   * Tutorial shows ONLY if flag is false (never shown before)
   */
  const shouldShowTutorial = useCallback(
    (page: TutorialPage): boolean => {
      // Don't show if already completed
      if (tutorialFlags[page]) return false;

      // Check if this is first visit to the page
      // If flag is false, it means user hasn't seen it yet
      return !tutorialFlags[page];
    },
    [tutorialFlags]
  );

  /**
   * Mark tutorial as completed for a specific page
   */
  const completeTutorial = useCallback(
    (page: TutorialPage) => {
      console.log(`[TutorialManager] Completing tutorial for: ${page}`);
      const newFlags = { ...tutorialFlags, [page]: true };
      saveTutorialFlags(newFlags);
    },
    [tutorialFlags, saveTutorialFlags]
  );

  /**
   * Skip tutorial for a specific page (same as complete)
   */
  const skipTutorial = useCallback(
    (page: TutorialPage) => {
      console.log(`[TutorialManager] Skipping tutorial for: ${page}`);
      const newFlags = { ...tutorialFlags, [page]: true };
      saveTutorialFlags(newFlags);
    },
    [tutorialFlags, saveTutorialFlags]
  );

  /**
   * Relaunch tutorial manually (force show even if completed)
   * This temporarily sets the flag to false to trigger the tutorial
   */
  const relaunchTutorial = useCallback(
    (page: TutorialPage) => {
      console.log(`[TutorialManager] Relaunching tutorial for: ${page}`);
      // Temporarily set to false to trigger tutorial
      const newFlags = { ...tutorialFlags, [page]: false };
      setTutorialFlags(newFlags);

      // Don't persist this change - it's just for this session
      // The tutorial will save the flag as true when completed
    },
    [tutorialFlags]
  );

  /**
   * Reset all tutorials (clear localStorage)
   */
  const resetAllTutorials = useCallback(() => {
    console.log('[TutorialManager] Resetting all tutorials');
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setTutorialFlags({
      map: false,
      cma: false,
      listing: false,
      subdivision: false,
      dashboard: false,
      chat: false,
    });
  }, []);

  /**
   * Get current tutorial flags
   */
  const getTutorialFlags = useCallback((): TutorialFlags => {
    return tutorialFlags;
  }, [tutorialFlags]);

  /**
   * Check if user has completed any tutorial
   */
  const hasCompletedAnyTutorial = useCallback((): boolean => {
    return Object.values(tutorialFlags).some((flag) => flag === true);
  }, [tutorialFlags]);

  return {
    shouldShowTutorial,
    completeTutorial,
    skipTutorial,
    relaunchTutorial,
    resetAllTutorials,
    getTutorialFlags,
    hasCompletedAnyTutorial,
  };
}

/**
 * Helper hook to check if this is user's first visit to the app
 */
export function useIsFirstVisit(): boolean {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(STORAGE_KEY);
    setIsFirstVisit(!stored);
  }, []);

  return isFirstVisit;
}

/**
 * Helper to manually trigger tutorial for a page
 * Can be called from Help menu or button
 */
export function triggerTutorial(page: TutorialPage): void {
  if (typeof window === 'undefined') return;

  // Dispatch custom event that TutorialLauncher will listen to
  const event = new CustomEvent('jps-tutorial-trigger', {
    detail: { page }
  });
  window.dispatchEvent(event);
}

/**
 * Get tutorial progress percentage
 */
export function getTutorialProgress(flags: TutorialFlags): number {
  const totalTutorials = Object.keys(flags).length;
  const completedTutorials = Object.values(flags).filter((f) => f === true).length;
  return Math.round((completedTutorials / totalTutorials) * 100);
}
