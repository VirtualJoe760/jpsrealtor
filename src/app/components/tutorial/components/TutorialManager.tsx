"use client";

import { AnimatePresence } from 'framer-motion';
import { useTheme } from '@/app/contexts/ThemeContext';
import { UseTutorial } from '../types';
import { getTutorialSteps } from '../constants/steps';
import { AvatarMascot } from './AvatarMascot';
import { SpeechBubble } from './SpeechBubble';
import { TutorialOverlay } from './TutorialOverlay';

/**
 * Tutorial Manager Component
 * Orchestrates the entire tutorial experience
 * Renders avatar, speech bubbles, and overlays
 */

interface TutorialManagerProps {
  /** Tutorial state and controls from useChatTutorial hook */
  tutorial: UseTutorial;

  /** Auto-fill callback - receives step index for step-specific fills */
  onAutoFill?: (stepIndex: number) => void;

  /** Handle next step with custom logic */
  onNext?: () => void;

  /** Current chat message (for step 1 validation) */
  message?: string;
}

export function TutorialManager({ tutorial, onAutoFill, onNext, message }: TutorialManagerProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  // Get current step configuration
  const steps = getTutorialSteps(tutorial.isMobile);
  const currentStep = steps[tutorial.stepIndex];

  if (!currentStep) {
    console.error(`[TutorialManager] Step ${tutorial.stepIndex} not found`);
    return null;
  }

  /**
   * Handle Next button click
   * Implements step-specific logic
   */
  const handleNext = () => {
    if (onNext) {
      // Custom logic provided by parent
      onNext();
      return;
    }

    // Default logic
    if (tutorial.stepIndex === 15) {
      // Last step - complete tutorial
      tutorial.completeTutorial();
    } else if (tutorial.stepIndex === 2) {
      // Scroll step - user clicks Continue
      tutorial.nextStep();
    } else {
      tutorial.nextStep();
    }
  };

  /**
   * Determine if user can proceed to next step
   */
  const canGoNext = (): boolean => {
    // Step 1: Must have typed or auto-filled query
    if (tutorial.stepIndex === 1) {
      return (message?.trim().length ?? 0) > 0; // Enable Next when message has content
    }

    // Step 2: Must wait for AI results
    if (tutorial.stepIndex === 2) {
      return !tutorial.waitingForResults;
    }

    // Step 4: Must select list view
    if (tutorial.stepIndex === 4) {
      return !tutorial.waitingForListView;
    }

    // Step 6: Must click View button
    if (tutorial.stepIndex === 6) {
      return !tutorial.waitingForViewListing;
    }

    // Step 9: Must close listing panel
    if (tutorial.stepIndex === 9) {
      return !tutorial.waitingForPanelClose;
    }

    // Step 10: Must click map toggle
    if (tutorial.stepIndex === 10) {
      return !tutorial.waitingForMapToggle;
    }

    // All other steps: can proceed
    return true;
  };

  return (
    <AnimatePresence>
      {tutorial.run && (
        <>
          {/* Dark Backdrop + Spotlight Overlay */}
          <TutorialOverlay
            target={currentStep.target}
            hideOverlay={currentStep.hideOverlay}
          />

          {/* Avatar Mascot - hide while user is actively scrolling */}
          {!tutorial.isScrolling && (
            <AvatarMascot
              stepIndex={tutorial.stepIndex}
              isMobile={tutorial.isMobile}
              avatar={tutorial.avatar}
            />
          )}

          {/* Speech Bubble - hide while user is actively scrolling */}
          {!tutorial.isScrolling && (
            <SpeechBubble
              step={currentStep}
              avatar={tutorial.avatar}
              isMobile={tutorial.isMobile}
              isLight={isLight}
              onNext={handleNext}
              onPrev={tutorial.prevStep}
              onSkip={tutorial.completeTutorial}
              canGoNext={canGoNext()}
              isFirstStep={tutorial.stepIndex === 0}
              isLastStep={tutorial.stepIndex === 15}
              onAutoFill={onAutoFill ? () => onAutoFill(tutorial.stepIndex) : undefined}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
