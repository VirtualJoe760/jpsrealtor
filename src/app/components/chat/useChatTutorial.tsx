"use client";

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Custom Chat Tutorial System with Toasty
 * No React Joyride - fully custom implementation
 */

export interface TutorialStep {
  id: number;
  target?: string; // CSS selector for element to highlight
  fromToasty: boolean; // True if speech bubble comes from Toasty
  content: {
    title: string;
    message: string;
    bullets?: string[];
  };
  showAutoFill?: boolean; // Show auto-fill button
  blockNext?: boolean; // Block next button until action completed
  waitForScroll?: boolean; // Wait for user to scroll to bottom
  hideOverlay?: boolean; // Don't show dark backdrop overlay
  placement?: 'top' | 'bottom' | 'left' | 'right'; // Where to position bubble relative to target
}

export function useChatTutorial() {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [waitingForQuery, setWaitingForQuery] = useState(false);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [waitingForListView, setWaitingForListView] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);

  // Detect mobile device
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  // Check if user has seen tutorial
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('chatTutorialCompleted');
      setHasSeenTutorial(seen === 'true');
    }
  }, []);

  const startTutorial = useCallback(() => {
    console.log('🎓 [Tutorial] Starting tutorial');
    setRun(true);
    setStepIndex(0);
  }, []);

  const stopTutorial = useCallback(() => {
    setRun(false);
  }, []);

  const completeTutorial = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatTutorialCompleted', 'true');
      setHasSeenTutorial(true);
    }
    setRun(false);
  }, []);

  const resetTutorial = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chatTutorialCompleted');
      setHasSeenTutorial(false);
    }
  }, []);

  const nextStep = useCallback(() => {
    setStepIndex(prev => prev + 1);
  }, []);

  const prevStep = useCallback(() => {
    setStepIndex(prev => Math.max(0, prev - 1));
  }, []);

  const onQuerySent = useCallback(() => {
    if (waitingForQuery) {
      setWaitingForQuery(false);
      setWaitingForResults(true);
    }
  }, [waitingForQuery]);

  const onResultsReceived = useCallback(() => {
    if (waitingForResults) {
      console.log('🎓 [Tutorial] AI finished responding, user can now scroll');
      setWaitingForResults(false);
      // Don't auto-advance - let user scroll to bottom naturally on step 2
    }
  }, [waitingForResults]);

  const onListViewSelected = useCallback(() => {
    if (waitingForListView) {
      console.log('🎓 [Tutorial] List view selected, enabling Next button');
      setWaitingForListView(false);
    }
  }, [waitingForListView]);

  // Enable interactive mode when entering step 1
  useEffect(() => {
    if (run && stepIndex === 1) {
      setWaitingForQuery(true);
    }
  }, [run, stepIndex]);

  // Enable list view waiting when entering step 4
  useEffect(() => {
    if (run && stepIndex === 4) {
      setWaitingForListView(true);
    }
  }, [run, stepIndex]);

  // Scroll detection for step 2 (scroll to read step)
  useEffect(() => {
    if (!run || stepIndex !== 2) {
      setHasScrolledToBottom(false);
      setIsScrolling(false);
      return;
    }

    console.log('🎓 [Tutorial] Step 2 scroll detection initialized', {
      run,
      stepIndex,
      waitingForResults,
      hasScrolledToBottom,
      isScrolling
    });

    // Don't allow scrolling until AI has finished responding
    if (waitingForResults) {
      console.log('🎓 [Tutorial] ⏳ Waiting for AI to finish before allowing scroll detection');
      return;
    }

    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      // Find the chat messages container
      const chatContainer = document.querySelector('[data-page="chat"]');
      if (!chatContainer) {
        console.log('🎓 [Tutorial] ❌ Chat container not found');
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = chatContainer as HTMLElement;

      console.log('🎓 [Tutorial] Scroll event:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        bottom: scrollTop + clientHeight,
        remaining: scrollHeight - (scrollTop + clientHeight)
      });

      // User started scrolling - hide tutorial
      if (scrollTop > 10 && !isScrolling) {
        console.log('🎓 [Tutorial] User started scrolling, hiding tutorial');
        setIsScrolling(true);
      }

      // Check if scrolled to bottom (generous threshold of 200px)
      const remaining = scrollHeight - (scrollTop + clientHeight);
      const scrolledToBottom = remaining <= 200; // 200px threshold

      console.log('🎓 [Tutorial] Remaining scroll:', remaining, 'Scrolled to bottom:', scrolledToBottom);

      if (scrolledToBottom && !hasScrolledToBottom) {
        console.log('🎓 [Tutorial] ✅ User scrolled to bottom! Advancing to next step');
        setHasScrolledToBottom(true);
        setIsScrolling(false);
        // Auto-advance after a short delay
        setTimeout(() => {
          console.log('🎓 [Tutorial] Calling nextStep() from step 2 to step 3');
          nextStep();
        }, 500);
      }
    };

    const chatContainer = document.querySelector('[data-page="chat"]');
    if (chatContainer) {
      console.log('🎓 [Tutorial] ✅ Chat container found, attaching scroll listener');
      chatContainer.addEventListener('scroll', handleScroll);

      // Initial check - maybe already at bottom
      const { scrollTop, scrollHeight, clientHeight } = chatContainer as HTMLElement;
      console.log('🎓 [Tutorial] Initial scroll position:', {
        scrollTop,
        scrollHeight,
        clientHeight,
        remaining: scrollHeight - (scrollTop + clientHeight)
      });

      return () => {
        console.log('🎓 [Tutorial] Removing scroll listener');
        chatContainer.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimeout);
      };
    } else {
      console.log('🎓 [Tutorial] ❌ Chat container not found when trying to attach listener');
    }
  }, [run, stepIndex, hasScrolledToBottom, isScrolling, waitingForResults, nextStep]);

  return {
    run,
    stepIndex,
    hasSeenTutorial,
    isMobile,
    waitingForQuery,
    waitingForResults,
    waitingForListView,
    hasScrolledToBottom,
    isScrolling,
    startTutorial,
    stopTutorial,
    completeTutorial,
    resetTutorial,
    nextStep,
    prevStep,
    onQuerySent,
    onResultsReceived,
    onListViewSelected,
  };
}

/**
 * Desktop Tutorial Steps
 */
export const desktopTutorialSteps: TutorialStep[] = [
  {
    id: 0,
    fromToasty: true,
    content: {
      title: "Hi! I'm Toasty! 🐕",
      message: "I'm Joe's dog, and I'm here to help you learn how to find your dream home! This will only take 1 minute. Let's go!",
    },
  },
  {
    id: 1,
    target: '[data-tour="chat-input"]',
    fromToasty: false,
    placement: 'top',
    showAutoFill: true,
    blockNext: true,
    content: {
      title: "Let's try a search together!",
      message: 'Type this in the box below: "show me homes in Indian Wells Country Club"',
    },
  },
  {
    id: 2,
    fromToasty: true,
    waitForScroll: true,
    hideOverlay: true,
    content: {
      title: "Great! The AI is responding! 🤖",
      message: "Scroll down to read the full response, then click Continue when you're ready!",
    },
  },
  {
    id: 3,
    target: '[data-tour="results-view-toggle"]',
    fromToasty: false,
    placement: 'left',
    content: {
      title: "Good job! You found homes! 🏡",
      message: "You can control how you view the results:",
      bullets: [
        "List View - See all properties at once",
        "Carousel View - Swipe through them one by one",
        "Use the sort options to organize by price, size, or date"
      ],
    },
  },
  {
    id: 4,
    target: '[data-tour="list-view-button"]',
    fromToasty: false,
    placement: 'left',
    blockNext: true,
    content: {
      title: "Switch to List View! 📋",
      message: "Click the 'List' button to see all properties in a vertical list format!",
    },
  },
  {
    id: 5,
    target: '[data-tour="sort-dropdown"]',
    fromToasty: false,
    placement: 'left',
    content: {
      title: "Sort your results! 🔢",
      message: "You can organize listings by price, size, or other features using this dropdown!",
    },
  },
  {
    id: 6,
    target: '[data-tour="view-listing-button"]',
    fromToasty: false,
    placement: 'top',
    content: {
      title: "Let's explore a listing! 🏠",
      message: "Click 'View Details' on any property to see more information and photos!",
    },
  },
  {
    id: 7,
    target: '[data-tour="swipe-right-button"]',
    fromToasty: false,
    placement: 'top',
    content: {
      title: "Love it? Save it! ❤️",
      message: "Swipe right or click this heart to add listings to your favorites!",
    },
  },
  {
    id: 8,
    target: '[data-tour="swipe-left-button"]',
    fromToasty: false,
    placement: 'top',
    content: {
      title: "Not interested? Skip it! 👎",
      message: "Swipe left or click X to remove listings from your queue.",
    },
  },
  {
    id: 9,
    target: '[data-tour="map-mode-button"]',
    fromToasty: false,
    placement: 'right',
    content: {
      title: "See everything on a map! 🗺️",
      message: "Click here to view all listings on an interactive map!",
    },
  },
  {
    id: 10,
    target: '[data-tour="map-search-button"]',
    fromToasty: false,
    placement: 'bottom',
    content: {
      title: "Search on the map! 🔍",
      message: "Use this search to find specific addresses or areas while in map mode!",
    },
  },
  {
    id: 11,
    target: '[data-tour="map-filters-button"]',
    fromToasty: false,
    placement: 'bottom',
    content: {
      title: "Filter your results! 🎛️",
      message: "Click here to refine listings by price, beds, baths, and more!",
    },
  },
  {
    id: 12,
    target: '[data-tour="map-mode-button"]',
    fromToasty: false,
    placement: 'right',
    content: {
      title: "Back to chat view! 💬",
      message: "Click the chat button to return to your conversation with the AI!",
    },
  },
  {
    id: 13,
    target: '[data-tour="new-chat-button"]',
    fromToasty: false,
    placement: 'left',
    content: {
      title: "Start fresh anytime! ✨",
      message: "Click 'New Chat' to begin a completely new conversation and search!",
    },
  },
  {
    id: 14,
    fromToasty: true,
    content: {
      title: "You're a pro now! I'm so proud! 💜",
      message: "You now know how to:",
      bullets: [
        "Search for homes with AI",
        "View and sort results",
        "Save favorite listings",
        "Use the interactive map",
        "Apply filters and start new searches",
      ],
    },
  },
];

/**
 * Mobile Tutorial Steps
 */
export const mobileTutorialSteps: TutorialStep[] = [
  {
    id: 0,
    fromToasty: true,
    content: {
      title: "Hi! I'm Toasty! 🐕",
      message: "I'm Joe's dog, and I'll help you find your dream home! This will only take 1 minute!",
    },
  },
  {
    id: 1,
    target: '[data-tour="chat-input"]',
    fromToasty: false,
    placement: 'top',
    showAutoFill: true,
    blockNext: true,
    content: {
      title: "Let's try a search!",
      message: 'Type: "show me homes in Indian Wells Country Club"',
    },
  },
  {
    id: 2,
    fromToasty: true,
    waitForScroll: true,
    hideOverlay: true,
    content: {
      title: "AI is responding! 🤖",
      message: "Scroll down to read the response, then click Continue!",
    },
  },
  {
    id: 3,
    target: '[data-tour="results-view-toggle"]',
    fromToasty: false,
    placement: 'left',
    content: {
      title: "You found homes! 🏡",
      message: "Control your view:",
      bullets: [
        "List - All properties",
        "Carousel - Swipe through",
        "Sort by price, size, or date"
      ],
    },
  },
  {
    id: 4,
    target: '[data-tour="list-view-button"]',
    fromToasty: false,
    placement: 'left',
    blockNext: true,
    content: {
      title: "Switch to List View! 📋",
      message: "Tap 'List' to see all properties in a list!",
    },
  },
  {
    id: 5,
    target: '[data-tour="sort-dropdown"]',
    fromToasty: false,
    placement: 'left',
    content: {
      title: "Sort results! 🔢",
      message: "Organize listings by price, size, or features!",
    },
  },
  {
    id: 6,
    target: '[data-tour="view-listing-button"]',
    fromToasty: false,
    placement: 'top',
    content: {
      title: "Explore a listing! 🏠",
      message: "Tap 'View Details' to see more info and photos!",
    },
  },
  {
    id: 7,
    target: '[data-tour="swipe-right-button"]',
    fromToasty: false,
    placement: 'top',
    content: {
      title: "Love it? Save it! ❤️",
      message: "Tap the heart to add to favorites!",
    },
  },
  {
    id: 8,
    target: '[data-tour="swipe-left-button"]',
    fromToasty: false,
    placement: 'top',
    content: {
      title: "Not interested? Skip it! 👎",
      message: "Tap X to remove from your queue.",
    },
  },
  {
    id: 9,
    target: '[data-tour="mobile-map-button"]',
    fromToasty: false,
    placement: 'top',
    content: {
      title: "View on map! 🗺️",
      message: "Tap here to see listings on a map!",
    },
  },
  {
    id: 10,
    target: '[data-tour="map-search-button"]',
    fromToasty: false,
    placement: 'bottom',
    content: {
      title: "Search the map! 🔍",
      message: "Find specific addresses or areas!",
    },
  },
  {
    id: 11,
    target: '[data-tour="map-filters-button"]',
    fromToasty: false,
    placement: 'bottom',
    content: {
      title: "Filter results! 🎛️",
      message: "Refine by price, beds, baths, and more!",
    },
  },
  {
    id: 12,
    target: '[data-tour="mobile-map-button"]',
    fromToasty: false,
    placement: 'top',
    content: {
      title: "Back to chat! 💬",
      message: "Tap chat to return to your AI conversation!",
    },
  },
  {
    id: 13,
    target: '[data-tour="new-chat-button"]',
    fromToasty: false,
    placement: 'left',
    content: {
      title: "Start fresh! ✨",
      message: "Tap 'New Chat' to begin a new search!",
    },
  },
  {
    id: 14,
    fromToasty: true,
    content: {
      title: "You're a pro! 💜",
      message: "You now know how to:",
      bullets: ["Search with AI", "Sort & view results", "Save favorites", "Use maps & filters"],
    },
  },
];

/**
 * Get tutorial steps based on device
 */
export function getTutorialSteps(isMobile: boolean): TutorialStep[] {
  return isMobile ? mobileTutorialSteps : desktopTutorialSteps;
}

/**
 * Toasty Mascot Component - displays in bottom-left corner
 */
interface ToastyMascotProps {
  stepIndex: number;
  isMobile: boolean;
}

const toastyImages = {
  0: '/images/toast/edited/hi.png',          // Welcome
  1: '/images/toast/edited/whats-up.png',    // Search input
  2: '/images/toast/edited/good-girl.png',   // Scroll step
  3: '/images/toast/edited/huh.png',         // Results toggle
  4: '/images/toast/edited/huh.png',         // List view button
  5: '/images/toast/edited/what.png',        // Sort dropdown
  6: '/images/toast/edited/what.png',        // View listing
  7: '/images/toast/edited/good-girl.png',   // Swipe right
  8: '/images/toast/edited/what.png',        // Swipe left
  9: '/images/toast/edited/whats-up.png',    // Map mode
  10: '/images/toast/edited/huh.png',        // Map search
  11: '/images/toast/edited/what.png',       // Map filters
  12: '/images/toast/edited/whats-up.png',   // Back to chat
  13: '/images/toast/edited/huh.png',        // New chat
  14: '/images/toast/edited/love-you.png',   // Completion
};

export function ToastyMascot({ stepIndex, isMobile }: ToastyMascotProps) {
  const imageUrl = toastyImages[stepIndex as keyof typeof toastyImages] || toastyImages[0];
  const [mounted, setMounted] = useState(false);

  // Responsive sizing based on screen width (smaller on scroll step)
  const [size, setSize] = useState(280);

  useEffect(() => {
    setMounted(true);
    const updateSize = () => {
      // Make Toasty smaller on step 2 (scroll step)
      const isScrollStep = stepIndex === 2;

      if (window.innerWidth < 768) {
        // Mobile
        setSize(isScrollStep ? 120 : 180);
      } else if (window.innerWidth < 1920) {
        // MacBook/Laptop
        setSize(isScrollStep ? 350 : 560);
      } else {
        // Large screens
        setSize(isScrollStep ? 500 : 840);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [stepIndex]);

  // Get position based on step - Toasty jumps around the screen!
  const getPositionClasses = () => {
    if (isMobile) {
      return 'bottom-24 left-6'; // Mobile stays consistent
    }

    // Desktop positioning varies by step
    switch (stepIndex) {
      case 0: // Welcome
        return 'bottom-16 left-80';
      case 1: // Search input
        return 'bottom-16 left-80';
      case 2: // Scroll step
        return 'top-[20rem] left-80';
      case 3: // Results toggle - bottom-right
        return 'bottom-4 right-4';
      case 4: // List view button - higher for bubble
        return 'bottom-48 right-4';
      case 5: // Sort dropdown - stay on right, higher for bubble
        return 'bottom-48 right-4';
      case 6: // View listing - stay on right, higher for bubble
        return 'bottom-48 right-4';
      case 7: // Swipe right
        return 'bottom-16 right-80';
      case 8: // Swipe left
        return 'bottom-16 right-80';
      case 9: // Map mode
        return 'bottom-16 left-80';
      case 10: // Map search - top area
        return 'top-20 left-80';
      case 11: // Map filters - top area
        return 'top-20 left-80';
      case 12: // Back to chat
        return 'bottom-16 left-80';
      case 13: // New chat
        return 'bottom-16 left-80';
      case 14: // Completion
        return 'bottom-16 left-80';
      default:
        return 'bottom-16 left-80';
    }
  };

  // Check if image should be mirrored (flipped horizontally)
  const shouldMirror = () => {
    return stepIndex === 3 || stepIndex === 4 || stepIndex === 5 || stepIndex === 6 || stepIndex === 7 || stepIndex === 8; // Mirror for right-side positions
  };

  if (!mounted) return null;

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`fixed ${getPositionClasses()} pointer-events-none`}
      style={{ zIndex: 999999 }} // Extremely high to appear above sidebar
    >
      <Image
        src={imageUrl}
        alt="Toasty the dog"
        width={size}
        height={size}
        className={`object-contain drop-shadow-2xl ${shouldMirror() ? 'scale-x-[-1]' : ''}`}
        priority
      />
    </motion.div>
  );

  return createPortal(content, document.body);
}

/**
 * Speech Bubble Component - appears near Toasty or points to UI elements
 */
interface SpeechBubbleProps {
  step: TutorialStep;
  isMobile: boolean;
  isLight: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  canGoNext: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  onAutoFill?: () => void;
}

export function SpeechBubble({
  step,
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
    if (step.fromToasty) {
      // Determine Toasty's position and size for this step
      const isScrollStep = step.waitForScroll;
      const stepId = step.id;

      // Get Toasty size based on step and screen size
      let toastySize = 280;
      if (window.innerWidth < 768) {
        toastySize = isScrollStep ? 120 : 180;
      } else if (window.innerWidth < 1920) {
        toastySize = isScrollStep ? 350 : 560;
      } else {
        toastySize = isScrollStep ? 500 : 840;
      }

      // Determine Toasty's position based on step
      let toastyTop = 0;
      let toastyLeft = 0;
      let toastyRight = 0;
      let toastyBottom = 0;
      let isOnRight = false;
      let isOnTop = false;

      if (isMobile) {
        // Mobile: always bottom-left
        toastyBottom = 96; // bottom-24
        toastyLeft = 24; // left-6
      } else {
        // Desktop: varies by step
        switch (stepId) {
          case 2: // Top-left (moved down for bubble visibility)
            isOnTop = true;
            toastyTop = 320; // top-[20rem] = 320px (moved down from top-20)
            toastyLeft = 320; // left-80
            break;
          case 3: // Bottom-right (aligned with right edge)
            isOnRight = true;
            toastyBottom = 16; // bottom-4
            toastyRight = 16; // right-4
            break;
          case 4: // List view button - higher for bubble
            isOnRight = true;
            toastyBottom = 192; // bottom-48 (higher for bubble space)
            toastyRight = 16; // right-4
            break;
          case 5: // Sort dropdown - stay on right, higher for bubble
            isOnRight = true;
            toastyBottom = 192; // bottom-48 (higher for bubble space)
            toastyRight = 16; // right-4
            break;
          case 6: // View listing - stay on right, higher for bubble
            isOnRight = true;
            toastyBottom = 192; // bottom-48 (higher for bubble space)
            toastyRight = 16; // right-4
            break;
          case 7: // Swipe right
          case 8: // Swipe left
            isOnRight = true;
            toastyBottom = 64; // bottom-16
            toastyRight = 320; // right-80
            break;
          case 10: // Map search
          case 11: // Map filters
            isOnTop = true;
            toastyTop = 80; // top-20
            toastyLeft = 320; // left-80
            break;
          default: // Bottom-left (steps 0, 1, 9, 12, 13, 14)
            toastyBottom = 64; // bottom-16
            toastyLeft = 320; // left-80
        }
      }

      // Calculate bubble position - always ABOVE Toasty's head with arrow pointing down
      let bubbleTop = 0;
      let bubbleLeft = 0;
      const arrow: 'top' | 'bottom' | 'left' | 'right' = 'bottom'; // Always point down at Toasty
      const bubbleWidth = isMobile ? 320 : 420;
      const bubbleHeight = 250; // Approximate bubble height

      if (isOnTop) {
        // Toasty is at top of screen - bubble goes above her
        bubbleTop = toastyTop - bubbleHeight - 20;
        if (isOnRight) {
          // Top-right: center bubble above Toasty
          bubbleLeft = window.innerWidth - toastyRight - toastySize / 2 - bubbleWidth / 2;
        } else {
          // Top-left: center bubble above Toasty
          bubbleLeft = toastyLeft + toastySize / 2 - bubbleWidth / 2;
        }
      } else {
        // Toasty is at bottom of screen - bubble goes above her
        const toastyTopPosition = window.innerHeight - toastyBottom - toastySize;
        bubbleTop = toastyTopPosition - bubbleHeight - 20;
        if (isOnRight) {
          // Bottom-right: center bubble above Toasty
          bubbleLeft = window.innerWidth - toastyRight - toastySize / 2 - bubbleWidth / 2;
        } else {
          // Bottom-left: center bubble above Toasty
          bubbleLeft = toastyLeft + toastySize / 2 - bubbleWidth / 2;
        }
      }

      setPosition({ top: bubbleTop, left: bubbleLeft });
      setArrowPosition(arrow);
    } else if (step.target) {
      // Position near target element
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        const bubbleWidth = isMobile ? 320 : 420;
        const bubbleHeight = 200; // approximate

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

        setPosition({ top, left });
        setArrowPosition(arrow);
      }
    }
  }, [step, isMobile]);

  if (!mounted) return null;

  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`fixed ${isMobile ? 'max-w-[320px]' : 'max-w-[420px]'} rounded-[20px] shadow-2xl p-6 ${
        isLight ? 'bg-white border border-gray-200' : 'bg-gray-800 border border-gray-700'
      }`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000000, // Extremely high to appear above sidebar
      }}
    >
      {/* Arrow */}
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

      {/* Auto-fill button */}
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

/**
 * Tutorial Overlay Component - dark backdrop with optional spotlight on target
 */
interface TutorialOverlayProps {
  target?: string;
}

interface TutorialOverlayComponentProps extends TutorialOverlayProps {
  hideOverlay?: boolean;
}

export function TutorialOverlay({ target, hideOverlay }: TutorialOverlayComponentProps) {
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (target) {
      const element = document.querySelector(target);
      if (element) {
        setHighlightRect(element.getBoundingClientRect());
      }
    } else {
      setHighlightRect(null);
    }
  }, [target]);

  if (!mounted) return null;

  const content = (
    <>
      {/* Dark backdrop - hidden on scroll step */}
      {!hideOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 pointer-events-none"
          style={{ zIndex: 999997 }} // Below Toasty but above everything else
        />
      )}

      {/* Spotlight on target element */}
      {target && highlightRect && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 999998 }}
        >
          {/* Highlight ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute border-4 border-emerald-400 rounded-xl shadow-2xl"
            style={{
              top: highlightRect.top - 8,
              left: highlightRect.left - 8,
              width: highlightRect.width + 16,
              height: highlightRect.height + 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            }}
          />
        </div>
      )}
    </>
  );

  return createPortal(content, document.body);
}
