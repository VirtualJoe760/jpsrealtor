// src/app/tutorial/TutorialLauncher.tsx
// Component placed on each page to automatically load and launch the correct tutorial

'use client';

import { useEffect, useRef } from 'react';
import { useTutorialContext } from './TutorialProvider';
import { useTutorialManager } from './useTutorialManager';
import { getTutorialSteps, getTutorialTitle } from './joyrideSteps';
import type { TutorialPage } from './joyrideSteps';

interface TutorialLauncherProps {
  page: TutorialPage;
  /**
   * Delay before starting tutorial (ms)
   * Allows page elements to render before tutorial starts
   */
  delay?: number;
  /**
   * Force tutorial to run even if user has completed it
   */
  forceRun?: boolean;
  /**
   * Custom steps to use instead of default page steps
   */
  customSteps?: any[];
}

/**
 * TutorialLauncher Component
 *
 * Place this component on any page to automatically launch its tutorial:
 *
 * @example
 * ```tsx
 * // In your page component
 * import { TutorialLauncher } from '@/app/tutorial/TutorialLauncher';
 *
 * export default function MapPage() {
 *   return (
 *     <>
 *       <TutorialLauncher page="map" delay={800} />
 *       {/* Rest of your page content *\/}
 *     </>
 *   );
 * }
 * ```
 */
export function TutorialLauncher({
  page,
  delay = 1000,
  forceRun = false,
  customSteps,
}: TutorialLauncherProps) {
  const { startTutorial, isRunning } = useTutorialContext();
  const tutorialManager = useTutorialManager();
  const hasLaunched = useRef(false);

  useEffect(() => {
    // Prevent multiple launches
    if (hasLaunched.current) return;
    if (isRunning) return;

    // Check if tutorial should show
    const shouldShow = forceRun || tutorialManager.shouldShowTutorial(page);

    if (!shouldShow) {
      console.log(`[TutorialLauncher] Skipping tutorial for ${page} - already completed`);
      return;
    }

    // Wait for page elements to render
    const timer = setTimeout(() => {
      console.log(`[TutorialLauncher] Launching tutorial for ${page}`);
      hasLaunched.current = true;

      // Get steps
      const steps = customSteps || getTutorialSteps(page);

      if (steps.length === 0) {
        console.warn(`[TutorialLauncher] No steps found for page: ${page}`);
        return;
      }

      // Start the tutorial
      startTutorial(page, steps);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [page, delay, forceRun, customSteps, tutorialManager, startTutorial, isRunning]);

  /**
   * Listen for manual trigger events
   * Allows relaunching tutorial via triggerTutorial() function
   */
  useEffect(() => {
    const handleTriggerEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ page: TutorialPage }>;

      // Only respond to events for this page
      if (customEvent.detail.page !== page) return;

      console.log(`[TutorialLauncher] Manual trigger received for ${page}`);

      const steps = customSteps || getTutorialSteps(page);
      startTutorial(page, steps);
    };

    window.addEventListener('jps-tutorial-trigger', handleTriggerEvent);

    return () => {
      window.removeEventListener('jps-tutorial-trigger', handleTriggerEvent);
    };
  }, [page, customSteps, startTutorial]);

  // This component renders nothing
  return null;
}

/**
 * Hook version of TutorialLauncher for more control
 *
 * @example
 * ```tsx
 * function MyPage() {
 *   const { launchTutorial, relaunchTutorial } = useTutorialLauncher('map');
 *
 *   return (
 *     <div>
 *       <button onClick={relaunchTutorial}>Show Tutorial Again</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTutorialLauncher(page: TutorialPage) {
  const { startTutorial } = useTutorialContext();
  const tutorialManager = useTutorialManager();

  const launchTutorial = (customSteps?: any[]) => {
    const steps = customSteps || getTutorialSteps(page);
    startTutorial(page, steps);
  };

  const relaunchTutorial = () => {
    tutorialManager.relaunchTutorial(page);
    const steps = getTutorialSteps(page);
    startTutorial(page, steps);
  };

  return {
    launchTutorial,
    relaunchTutorial,
    shouldShow: tutorialManager.shouldShowTutorial(page),
    isCompleted: tutorialManager.getTutorialFlags()[page],
  };
}

/**
 * Component for Help Menu button to relaunch tutorial
 *
 * @example
 * ```tsx
 * // In your help menu or settings
 * <TutorialRelaunchButton page="map" />
 * ```
 */
interface TutorialRelaunchButtonProps {
  page: TutorialPage;
  className?: string;
  children?: React.ReactNode;
}

export function TutorialRelaunchButton({
  page,
  className = '',
  children,
}: TutorialRelaunchButtonProps) {
  const { relaunchTutorial } = useTutorialLauncher(page);
  const title = getTutorialTitle(page);

  return (
    <button
      onClick={relaunchTutorial}
      className={className || 'px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors'}
      aria-label={`Relaunch ${title} tutorial`}
    >
      {children || `Show ${title} Tutorial`}
    </button>
  );
}

/**
 * Hook to get tutorial progress across all pages
 * Useful for dashboard or settings page
 */
export function useTutorialProgress() {
  const tutorialManager = useTutorialManager();
  const flags = tutorialManager.getTutorialFlags();

  const total = Object.keys(flags).length;
  const completed = Object.values(flags).filter(Boolean).length;
  const percentage = Math.round((completed / total) * 100);

  return {
    total,
    completed,
    percentage,
    flags,
    hasCompletedAny: tutorialManager.hasCompletedAnyTutorial(),
    resetAll: tutorialManager.resetAllTutorials,
  };
}

/**
 * Component to display tutorial progress
 * Shows completion percentage and allows reset
 */
export function TutorialProgressIndicator() {
  const { percentage, completed, total, resetAll } = useTutorialProgress();

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-2">
          <span>Tutorial Progress</span>
          <span className="font-semibold">{percentage}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
          {completed} of {total} tutorials completed
        </p>
      </div>
      {completed > 0 && (
        <button
          onClick={resetAll}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
        >
          Reset All
        </button>
      )}
    </div>
  );
}
