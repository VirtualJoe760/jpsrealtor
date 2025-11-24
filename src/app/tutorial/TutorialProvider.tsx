// src/app/tutorial/TutorialProvider.tsx
// Top-level provider to orchestrate React Joyride with theme-aware styling

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, Step, Styles } from 'react-joyride';
import { useTheme } from '@/app/contexts/ThemeContext';
import type { TutorialPage } from './joyrideSteps';
import { useTutorialManager } from './useTutorialManager';

// ============================================================================
// CONTEXT DEFINITION
// ============================================================================

interface TutorialContextValue {
  startTutorial: (page: TutorialPage, steps: Step[]) => void;
  stopTutorial: () => void;
  isRunning: boolean;
  currentPage: TutorialPage | null;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export function useTutorialContext() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorialContext must be used within TutorialProvider');
  }
  return context;
}

// ============================================================================
// THEME-AWARE JOYRIDE STYLES
// ============================================================================

function getLightThemeStyles(): Styles {
  return {
    options: {
      arrowColor: 'rgba(255, 255, 255, 0.95)',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      overlayColor: 'rgba(0, 0, 0, 0.4)',
      primaryColor: '#3b82f6', // Blue accent
      textColor: '#1f2937',
      zIndex: 10000,
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderRadius: '16px',
      border: '1px solid rgba(209, 213, 219, 0.3)',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      padding: '20px',
      maxWidth: '420px',
    },
    tooltipContainer: {
      textAlign: 'left' as const,
    },
    tooltipTitle: {
      color: '#1f2937',
      fontSize: '18px',
      fontWeight: '700',
      marginBottom: '8px',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    },
    tooltipContent: {
      color: '#4b5563',
      fontSize: '14px',
      lineHeight: '1.6',
      padding: '8px 0',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    },
    tooltipFooter: {
      marginTop: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    buttonNext: {
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
    },
    buttonBack: {
      backgroundColor: 'transparent',
      color: '#6b7280',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '600',
      border: '1px solid #d1d5db',
      cursor: 'pointer',
      marginRight: '8px',
    },
    buttonSkip: {
      backgroundColor: 'transparent',
      color: '#9ca3af',
      fontSize: '13px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
    },
    buttonClose: {
      color: '#6b7280',
      width: '28px',
      height: '28px',
      padding: '4px',
    },
    beacon: {
      backgroundColor: '#3b82f6',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
      boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.8)',
      animation: 'joyride-beacon-pulse 1.5s infinite',
    },
    beaconInner: {
      backgroundColor: '#3b82f6',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
    },
    beaconOuter: {
      backgroundColor: 'rgba(59, 130, 246, 0.4)',
      border: '2px solid #3b82f6',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
    },
    spotlight: {
      backgroundColor: 'transparent',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
    },
  };
}

function getDarkThemeStyles(): Styles {
  return {
    options: {
      arrowColor: 'rgba(24, 24, 27, 0.95)',
      backgroundColor: 'rgba(24, 24, 27, 0.95)',
      overlayColor: 'rgba(0, 0, 0, 0.7)',
      primaryColor: '#a855f7', // Purple accent
      textColor: '#f4f4f5',
      zIndex: 10000,
    },
    tooltip: {
      backgroundColor: 'rgba(24, 24, 27, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      border: '1px solid rgba(168, 85, 247, 0.3)',
      boxShadow: '0 0 30px rgba(168, 85, 247, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      padding: '20px',
      maxWidth: '420px',
    },
    tooltipContainer: {
      textAlign: 'left' as const,
    },
    tooltipTitle: {
      color: '#f4f4f5',
      fontSize: '18px',
      fontWeight: '700',
      marginBottom: '8px',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
      textShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
    },
    tooltipContent: {
      color: '#d4d4d8',
      fontSize: '14px',
      lineHeight: '1.6',
      padding: '8px 0',
      fontFamily: 'var(--font-inter), system-ui, sans-serif',
    },
    tooltipFooter: {
      marginTop: '16px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    buttonNext: {
      background: 'linear-gradient(135deg, #a855f7 0%, #10b981 100%)',
      color: '#ffffff',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 0 20px rgba(168, 85, 247, 0.5), 0 4px 6px -1px rgba(168, 85, 247, 0.4)',
    },
    buttonBack: {
      backgroundColor: 'transparent',
      color: '#a1a1aa',
      borderRadius: '8px',
      padding: '10px 20px',
      fontSize: '14px',
      fontWeight: '600',
      border: '1px solid #3f3f46',
      cursor: 'pointer',
      marginRight: '8px',
    },
    buttonSkip: {
      backgroundColor: 'transparent',
      color: '#71717a',
      fontSize: '13px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
    },
    buttonClose: {
      color: '#a1a1aa',
      width: '28px',
      height: '28px',
      padding: '4px',
    },
    beacon: {
      backgroundColor: '#a855f7',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
      boxShadow: '0 0 0 0 rgba(168, 85, 247, 0.8), 0 0 30px rgba(168, 85, 247, 0.6)',
      animation: 'joyride-beacon-pulse 1.5s infinite',
    },
    beaconInner: {
      backgroundColor: '#a855f7',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      boxShadow: '0 0 10px rgba(168, 85, 247, 0.8)',
    },
    beaconOuter: {
      backgroundColor: 'rgba(168, 85, 247, 0.3)',
      border: '2px solid #a855f7',
      borderRadius: '50%',
      width: '36px',
      height: '36px',
      boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
    },
    spotlight: {
      backgroundColor: 'transparent',
      border: '2px solid #a855f7',
      borderRadius: '8px',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 40px rgba(168, 85, 247, 0.4)',
    },
  };
}

// ============================================================================
// TUTORIAL PROVIDER COMPONENT
// ============================================================================

interface TutorialProviderProps {
  children: React.ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const tutorialManager = useTutorialManager();

  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentPage, setCurrentPage] = useState<TutorialPage | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  // Get theme-aware styles
  const joyrideStyles = isLight ? getLightThemeStyles() : getDarkThemeStyles();

  /**
   * Start tutorial for a specific page
   */
  const startTutorial = useCallback((page: TutorialPage, pageSteps: Step[]) => {
    console.log(`[TutorialProvider] Starting tutorial for: ${page}`);
    setCurrentPage(page);
    setSteps(pageSteps);
    setStepIndex(0);
    setIsRunning(true);
  }, []);

  /**
   * Stop tutorial
   */
  const stopTutorial = useCallback(() => {
    console.log('[TutorialProvider] Stopping tutorial');
    setIsRunning(false);
    setSteps([]);
    setCurrentPage(null);
    setStepIndex(0);
  }, []);

  /**
   * Handle Joyride callback events
   */
  const handleJoyrideCallback = useCallback(
    (data: CallBackProps) => {
      const { status, type, index, action } = data;

      console.log(`[TutorialProvider] Joyride event:`, { status, type, index, action });

      // Update step index
      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        setStepIndex(index + (action === 'prev' ? -1 : 1));
      }

      // Handle completion or skip
      if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
        console.log(`[TutorialProvider] Tutorial ${status} for page: ${currentPage}`);

        if (currentPage) {
          if (status === STATUS.FINISHED) {
            tutorialManager.completeTutorial(currentPage);
          } else if (status === STATUS.SKIPPED) {
            tutorialManager.skipTutorial(currentPage);
          }
        }

        stopTutorial();
      }

      // Handle manual close
      if (action === 'close') {
        console.log(`[TutorialProvider] Tutorial closed by user for page: ${currentPage}`);
        if (currentPage) {
          tutorialManager.skipTutorial(currentPage);
        }
        stopTutorial();
      }
    },
    [currentPage, tutorialManager, stopTutorial]
  );

  /**
   * Listen for custom tutorial trigger events
   */
  useEffect(() => {
    const handleTriggerEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ page: TutorialPage }>;
      const { page } = customEvent.detail;
      console.log(`[TutorialProvider] Received trigger event for page: ${page}`);

      // The TutorialLauncher will handle loading the steps
      // This is just for logging/debugging
    };

    window.addEventListener('jps-tutorial-trigger', handleTriggerEvent);

    return () => {
      window.removeEventListener('jps-tutorial-trigger', handleTriggerEvent);
    };
  }, []);

  const contextValue: TutorialContextValue = {
    startTutorial,
    stopTutorial,
    isRunning,
    currentPage,
  };

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
      <Joyride
        steps={steps}
        run={isRunning}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        scrollToFirstStep
        disableScrolling={false}
        disableOverlayClose={false}
        spotlightClicks={false}
        hideCloseButton={false}
        callback={handleJoyrideCallback}
        styles={joyrideStyles}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tutorial',
        }}
        floaterProps={{
          disableAnimation: false,
          hideArrow: false,
        }}
      />
    </TutorialContext.Provider>
  );
}

// ============================================================================
// EXPORT HOOK FOR CONVENIENCE
// ============================================================================

export { useTutorialContext as useTutorial };
