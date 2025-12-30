"use client";

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { UseTutorial, AvatarConfig } from '../types';
import { getAvatarConfig } from '../avatars/registry';

/**
 * Chat Tutorial Hook
 * Manages tutorial state and provides controls
 * Avatar-agnostic design - loads user's preferred avatar from session
 */
export function useChatTutorial(): UseTutorial {
  const { data: session } = useSession();

  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [waitingForQuery, setWaitingForQuery] = useState(false);
  const [waitingForResults, setWaitingForResults] = useState(false);
  const [waitingForListView, setWaitingForListView] = useState(false);
  const [waitingForViewListing, setWaitingForViewListing] = useState(false);
  const [waitingForPanelClose, setWaitingForPanelClose] = useState(false);
  const [waitingForMapToggle, setWaitingForMapToggle] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [avatar, setAvatar] = useState<AvatarConfig | null>(null);

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

  // Load user's avatar configuration
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      const avatarId = user.tutorialAvatarId || 'toasty';
      const userRoles = user.roles || [];

      console.log(`[Tutorial] Loading avatar: ${avatarId} for user roles:`, userRoles);

      const avatarConfig = getAvatarConfig(avatarId, userRoles);
      setAvatar(avatarConfig);

      console.log(`[Tutorial] Avatar loaded:`, avatarConfig.name);
    } else {
      // Not logged in - use default avatar
      const avatarConfig = getAvatarConfig('toasty', []);
      setAvatar(avatarConfig);
    }
  }, [session]);

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
    }
  }, [waitingForResults]);

  const onListViewSelected = useCallback(() => {
    if (waitingForListView) {
      console.log('🎓 [Tutorial] List view selected, auto-advancing to next step');
      setWaitingForListView(false);
      // Auto-advance to next step
      setTimeout(() => setStepIndex(prev => prev + 1), 300);
    }
  }, [waitingForListView]);

  const onViewListingClicked = useCallback(() => {
    if (waitingForViewListing) {
      console.log('🎓 [Tutorial] View listing clicked, auto-advancing to next step');
      setWaitingForViewListing(false);
      // Auto-advance to next step
      setTimeout(() => setStepIndex(prev => prev + 1), 300);
    }
  }, [waitingForViewListing]);

  const onPanelClosed = useCallback(() => {
    if (waitingForPanelClose) {
      console.log('🎓 [Tutorial] Listing panel closed, auto-advancing to next step');
      setWaitingForPanelClose(false);
      // Auto-advance to next step
      setTimeout(() => setStepIndex(prev => prev + 1), 300);
    }
  }, [waitingForPanelClose]);

  const onMapToggleClicked = useCallback(() => {
    if (waitingForMapToggle) {
      console.log('🎓 [Tutorial] Map toggle clicked, auto-advancing to next step');
      setWaitingForMapToggle(false);
      // Auto-advance to next step
      setTimeout(() => setStepIndex(prev => prev + 1), 300);
    }
  }, [waitingForMapToggle]);

  const onSwipeRightClicked = useCallback(() => {
    // Step 7 - swipe right (not blocking, but auto-advance if clicked)
    if (run && stepIndex === 7) {
      console.log('🎓 [Tutorial] Swipe right clicked, auto-advancing to next step');
      setTimeout(() => setStepIndex(prev => prev + 1), 300);
    }
  }, [run, stepIndex]);

  const onSwipeLeftClicked = useCallback(() => {
    // Step 8 - swipe left (not blocking, but auto-advance if clicked)
    if (run && stepIndex === 8) {
      console.log('🎓 [Tutorial] Swipe left clicked, auto-advancing to next step');
      setTimeout(() => setStepIndex(prev => prev + 1), 300);
    }
  }, [run, stepIndex]);

  const onFiltersClicked = useCallback(() => {
    // Step 11 - map filters (not blocking, but auto-advance if clicked)
    if (run && stepIndex === 11) {
      console.log('🎓 [Tutorial] Map filters clicked, auto-advancing to next step');
      setTimeout(() => setStepIndex(prev => prev + 1), 300);
    }
  }, [run, stepIndex]);

  const onMapSearchClicked = useCallback(() => {
    // Step 12 - map search (not blocking, but auto-advance if clicked)
    if (run && stepIndex === 12) {
      console.log('🎓 [Tutorial] Map search clicked, auto-advancing to next step');
      setTimeout(() => setStepIndex(prev => prev + 1), 300);
    }
  }, [run, stepIndex]);

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

  // Enable view listing waiting when entering step 6
  useEffect(() => {
    if (run && stepIndex === 6) {
      setWaitingForViewListing(true);
    }
  }, [run, stepIndex]);

  // Enable panel close waiting when entering step 9
  useEffect(() => {
    if (run && stepIndex === 9) {
      setWaitingForPanelClose(true);
    }
  }, [run, stepIndex]);

  // Enable map toggle waiting when entering step 10
  useEffect(() => {
    if (run && stepIndex === 10) {
      setWaitingForMapToggle(true);
    }
  }, [run, stepIndex]);

  // Scroll detection for step 2
  useEffect(() => {
    if (!run || stepIndex !== 2) {
      setHasScrolledToBottom(false);
      setIsScrolling(false);
      return;
    }

    console.log('🎓 [Tutorial] Step 2 scroll detection initialized');

    // Don't allow scrolling until AI has finished responding
    if (waitingForResults) {
      console.log('🎓 [Tutorial] ⏳ Waiting for AI to finish before allowing scroll detection');
      return;
    }

    const handleScroll = () => {
      const chatContainer = document.querySelector('[data-page="chat"]');
      if (!chatContainer) return;

      const { scrollTop, scrollHeight, clientHeight } = chatContainer as HTMLElement;

      // User started scrolling
      if (scrollTop > 10 && !isScrolling) {
        console.log('🎓 [Tutorial] User started scrolling, hiding tutorial');
        setIsScrolling(true);
      }

      // Check if scrolled to bottom (generous threshold)
      const remaining = scrollHeight - (scrollTop + clientHeight);
      const scrolledToBottom = remaining <= 200;

      if (scrolledToBottom && !hasScrolledToBottom) {
        console.log('🎓 [Tutorial] ✅ User scrolled to bottom! Advancing to next step');
        setHasScrolledToBottom(true);
        setIsScrolling(false);
        setTimeout(() => {
          nextStep();
        }, 500);
      }
    };

    const chatContainer = document.querySelector('[data-page="chat"]');
    if (chatContainer) {
      chatContainer.addEventListener('scroll', handleScroll);
      return () => chatContainer.removeEventListener('scroll', handleScroll);
    }
  }, [run, stepIndex, hasScrolledToBottom, isScrolling, waitingForResults, nextStep]);

  // Return default avatar if not loaded yet
  if (!avatar) {
    return {
      run: false,
      stepIndex: 0,
      hasSeenTutorial: true,
      isMobile: false,
      waitingForQuery: false,
      waitingForResults: false,
      waitingForListView: false,
      waitingForViewListing: false,
      waitingForPanelClose: false,
      waitingForMapToggle: false,
      hasScrolledToBottom: false,
      isScrolling: false,
      avatar: getAvatarConfig('toasty', []), // Fallback
      startTutorial: () => {},
      stopTutorial: () => {},
      completeTutorial: () => {},
      resetTutorial: () => {},
      nextStep: () => {},
      prevStep: () => {},
      onQuerySent: () => {},
      onResultsReceived: () => {},
      onListViewSelected: () => {},
      onViewListingClicked: () => {},
      onPanelClosed: () => {},
      onMapToggleClicked: () => {},
      onSwipeRightClicked: () => {},
      onSwipeLeftClicked: () => {},
      onFiltersClicked: () => {},
      onMapSearchClicked: () => {},
    };
  }

  return {
    run,
    stepIndex,
    hasSeenTutorial,
    isMobile,
    waitingForQuery,
    waitingForResults,
    waitingForListView,
    waitingForViewListing,
    waitingForPanelClose,
    waitingForMapToggle,
    hasScrolledToBottom,
    isScrolling,
    avatar,
    startTutorial,
    stopTutorial,
    completeTutorial,
    resetTutorial,
    nextStep,
    prevStep,
    onQuerySent,
    onResultsReceived,
    onListViewSelected,
    onViewListingClicked,
    onPanelClosed,
    onMapToggleClicked,
    onSwipeRightClicked,
    onSwipeLeftClicked,
    onFiltersClicked,
    onMapSearchClicked,
  };
}
