"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { TutorialStep, AvatarConfig } from '../types';
import { getAvatarPosition, getAvatarSize } from '../constants/positioning';

/**
 * Speech Bubble Component
 * Displays tutorial instructions near avatar or target elements
 */

interface SpeechBubbleProps {
  /** Current tutorial step */
  step: TutorialStep;

  /** Avatar configuration */
  avatar: AvatarConfig;

  /** Is device mobile? */
  isMobile: boolean;

  /** Is light theme active? */
  isLight: boolean;

  /** Next step callback */
  onNext: () => void;

  /** Previous step callback */
  onPrev: () => void;

  /** Skip tutorial callback */
  onSkip: () => void;

  /** Can user proceed to next step? */
  canGoNext: boolean;

  /** Is this the first step? */
  isFirstStep: boolean;

  /** Is this the last step? */
  isLastStep: boolean;

  /** Auto-fill callback (step 1 only) */
  onAutoFill?: () => void;
}

export function SpeechBubble({
  step,
  avatar,
  isMobile,
  isLight,
  onNext,
  onPrev,
  onSkip,
  canGoNext,
  isFirstStep,
  isLastStep,
  onAutoFill,
}: SpeechBubbleProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('right');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      if (step.fromAvatar) {
        // Position speech bubble above avatar's head
        calculateAvatarBubblePosition();
      } else if (step.target) {
        // Position speech bubble near target element
        calculateTargetBubblePosition();
      }
    };

    // Initial position
    updatePosition();

    // Update on scroll and resize
    window.addEventListener('scroll', updatePosition, true); // Use capture to catch all scrolls
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [step, isMobile]);

  /**
   * Calculate bubble position when coming from avatar
   */
  const calculateAvatarBubblePosition = () => {
    const avatarPosition = getAvatarPosition(step.id, isMobile);
    const avatarSize = getAvatarSize(step.id, window.innerWidth);

    const bubbleWidth = isMobile ? 320 : 420;
    const bubbleHeight = 250; // Approximate

    let bubbleTop = 0;
    let bubbleLeft = 0;
    const arrow: 'top' | 'bottom' | 'left' | 'right' = 'bottom'; // Arrow points down at avatar

    // Parse avatar position classes to get pixel values
    const isOnRight = avatarPosition.horizontal === 'right';
    const isOnTop = avatarPosition.vertical === 'top';

    if (isOnTop) {
      // Avatar at top of screen - bubble goes above
      const topPx = parsePositionClass(avatarPosition.classes, 'top');
      bubbleTop = topPx - bubbleHeight - 20;

      if (isOnRight) {
        const rightPx = parsePositionClass(avatarPosition.classes, 'right');
        bubbleLeft = window.innerWidth - rightPx - avatarSize / 2 - bubbleWidth / 2;
      } else {
        const leftPx = parsePositionClass(avatarPosition.classes, 'left');
        bubbleLeft = leftPx + avatarSize / 2 - bubbleWidth / 2;
      }
    } else {
      // Avatar at bottom of screen - bubble goes above
      const bottomPx = parsePositionClass(avatarPosition.classes, 'bottom');
      const avatarTop = window.innerHeight - bottomPx - avatarSize;
      bubbleTop = avatarTop - bubbleHeight - 20;

      if (isOnRight) {
        const rightPx = parsePositionClass(avatarPosition.classes, 'right');
        bubbleLeft = window.innerWidth - rightPx - avatarSize / 2 - bubbleWidth / 2;
      } else {
        const leftPx = parsePositionClass(avatarPosition.classes, 'left');
        bubbleLeft = leftPx + avatarSize / 2 - bubbleWidth / 2;
      }
    }

    setPosition({ top: bubbleTop, left: bubbleLeft });
    setArrowPosition(arrow);
  };

  /**
   * Calculate bubble position when pointing to target element
   */
  const calculateTargetBubblePosition = () => {
    if (!step.target) return;

    const element = document.querySelector(step.target);
    if (!element) {
      console.warn(`[SpeechBubble] Target element not found: ${step.target}`);
      return;
    }

    const rect = element.getBoundingClientRect();
    console.log(`[SpeechBubble] Step ${step.id} - Target: ${step.target}, Rect:`, rect);
    const bubbleWidth = isMobile ? 320 : 420;
    const bubbleHeight = 200; // Approximate

    let top = 0;
    let left = 0;
    let arrow: 'top' | 'bottom' | 'left' | 'right' = 'top';

    switch (step.placement) {
      case 'top':
        // For chat input, move bubble higher to not cover it
        const extraOffset = step.target === '[data-tour="chat-input"]' ? 100 : 0;
        top = rect.top - bubbleHeight - 20 - extraOffset;
        left = rect.left + (rect.width / 2) - (bubbleWidth / 2);
        arrow = 'bottom';
        break;
      case 'bottom':
        top = rect.bottom + 20;
        left = rect.left + (rect.width / 2) - (bubbleWidth / 2);
        arrow = 'top';
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (bubbleHeight / 2);
        left = rect.left - bubbleWidth - 20;
        arrow = 'right';
        break;
      case 'right':
      default:
        top = rect.top + (rect.height / 2) - (bubbleHeight / 2);
        left = rect.right + 20;
        arrow = 'left';
        break;
    }

    // Bounds checking - keep bubble on screen
    const padding = 20;
    const maxLeft = window.innerWidth - bubbleWidth - padding;
    const maxTop = window.innerHeight - bubbleHeight - padding;

    // Clamp left position
    if (left < padding) {
      left = padding;
    } else if (left > maxLeft) {
      left = maxLeft;
    }

    // Clamp top position
    if (top < padding) {
      top = padding;
    } else if (top > maxTop) {
      top = maxTop;
    }

    console.log(`[SpeechBubble] Step ${step.id} - Final position:`, { top, left, arrow, placement: step.placement });
    setPosition({ top, left });
    setArrowPosition(arrow);
  };

  /**
   * Parse Tailwind position class to pixel value
   */
  const parsePositionClass = (classes: string, direction: 'top' | 'bottom' | 'left' | 'right'): number => {
    const match = classes.match(new RegExp(`${direction}-(\\d+|\\[([\\d.]+)rem\\])`));
    if (!match) return 0;

    if (match[2]) {
      // Format: top-[20rem]
      return parseFloat(match[2]) * 16; // Convert rem to px
    } else {
      // Format: top-16 (Tailwind spacing scale)
      const spacing: Record<string, number> = {
        '4': 16, '6': 24, '8': 32, '16': 64, '20': 80, '24': 96, '48': 192, '80': 320,
      };
      return spacing[match[1]] || 0;
    }
  };

  if (!mounted) return null;

  const content = (
    <motion.div
      key={`bubble-step-${step.id}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`fixed ${isMobile ? 'max-w-[320px]' : 'max-w-[420px]'} rounded-[20px] shadow-2xl p-6 ${
        isLight ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700'
      }`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000000, // Above everything
      }}
    >
      {/* Arrow pointing to avatar or target */}
      <div
        className={`absolute w-0 h-0 ${
          arrowPosition === 'left' ? '-left-3 top-1/2 -translate-y-1/2 border-t-[12px] border-b-[12px] border-r-[12px] border-t-transparent border-b-transparent' :
          arrowPosition === 'right' ? '-right-3 top-1/2 -translate-y-1/2 border-t-[12px] border-b-[12px] border-l-[12px] border-t-transparent border-b-transparent' :
          arrowPosition === 'top' ? '-top-3 left-1/2 -translate-x-1/2 border-l-[12px] border-r-[12px] border-b-[12px] border-l-transparent border-r-transparent' :
          '-bottom-3 left-1/2 -translate-x-1/2 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent'
        } ${
          isLight
            ? arrowPosition === 'left' ? 'border-r-white' :
              arrowPosition === 'right' ? 'border-l-white' :
              arrowPosition === 'top' ? 'border-b-white' :
              'border-t-white'
            : arrowPosition === 'left' ? 'border-r-gray-800' :
              arrowPosition === 'right' ? 'border-l-gray-800' :
              arrowPosition === 'top' ? 'border-b-gray-800' :
              'border-t-gray-800'
        }`}
      />

      {/* Content */}
      <h2 className={`text-xl font-bold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
        {step.content.title}
      </h2>
      <p className={`mb-3 ${step.waitForScroll ? 'animate-pulse font-semibold text-lg' : ''} ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
        {step.content.message}
      </p>
      {step.content.bullets && (
        <ul className={`list-disc ml-5 mb-4 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
          {step.content.bullets.map((bullet, i) => (
            <li key={i} className="text-sm">{bullet}</li>
          ))}
        </ul>
      )}

      {/* Auto-fill button (step 1 only) */}
      {step.showAutoFill && onAutoFill && (
        <button
          onClick={onAutoFill}
          className="w-full mb-4 px-4 py-3 rounded-lg font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all animate-pulse shadow-lg"
          style={{
            textShadow: '2px 2px 4px rgba(0,0,0,0.5), -1px -1px 0 rgba(255,255,255,0.3), 1px 1px 0 rgba(0,0,0,0.3)',
          }}
        >
          ✨ Auto-fill
        </button>
      )}

      {/* Navigation - hide for scroll steps */}
      {!step.waitForScroll && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onSkip}
            className={`text-sm ${isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={onPrev}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isLight
                    ? 'text-gray-700 hover:bg-gray-100'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                Back
              </button>
            )}
            <button
              onClick={onNext}
              disabled={!canGoNext}
              className={`px-6 py-2 rounded-xl font-semibold shadow-lg transition-all ${
                canGoNext
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* Continue button for scroll steps */}
      {step.waitForScroll && (
        <button
          onClick={onNext}
          className="w-full px-6 py-3 rounded-xl font-semibold shadow-lg transition-all bg-emerald-500 text-white hover:bg-emerald-600"
        >
          Continue
        </button>
      )}

      {/* Step indicator */}
      <div className={`mt-4 text-center text-xs ${isLight ? 'text-gray-400' : 'text-gray-500'}`}>
        Step {step.id + 1} of 15
      </div>
    </motion.div>
  );

  return createPortal(content, document.body);
}
