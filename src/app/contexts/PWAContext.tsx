"use client";

/**
 * PWAContext - Progressive Web App State Management
 *
 * Provides centralized PWA detection and state management across the application.
 * This eliminates duplicate detection logic in components and prevents layout shifts.
 *
 * Key Principles:
 * 1. Detect ONCE on initial mount (prevents layout shifts)
 * 2. Never re-check (display mode doesn't change during session)
 * 3. Provide rich state (not just boolean)
 * 4. Single source of truth for all components
 *
 * Enterprise Pattern:
 * Similar to how ThemeContext centralizes theme state, PWAContext centralizes
 * PWA-related state. Components consume via usePWA() hook instead of
 * duplicating detection logic.
 *
 * Usage:
 * ```tsx
 * import { usePWA } from '@/app/contexts/PWAContext';
 *
 * function MyComponent() {
 *   const { isStandalone, displayMode } = usePWA();
 *   // Use state without re-implementing detection
 * }
 * ```
 */

import React, { createContext, useContext, useState, ReactNode } from "react";

/**
 * Display modes as defined by CSS display-mode media query
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/@media/display-mode
 */
export type DisplayMode = 'browser' | 'standalone' | 'fullscreen' | 'minimal-ui';

/**
 * Platform detection for platform-specific behavior
 */
export type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

export interface PWAContextType {
  /**
   * True if app is running in standalone mode (installed as PWA)
   * Equivalent to (display-mode: standalone) CSS media query
   */
  isStandalone: boolean;

  /**
   * Current display mode from CSS media queries
   * - browser: Normal browser tab
   * - standalone: Installed PWA (most common)
   * - fullscreen: Fullscreen mode (rare)
   * - minimal-ui: Minimal browser UI (rare)
   */
  displayMode: DisplayMode;

  /**
   * True if app is installed (any display mode except browser)
   * Useful for showing "already installed" messages
   */
  isInstalled: boolean;

  /**
   * Detected platform for platform-specific behavior
   */
  platform: Platform;

  /**
   * True if running on iOS (Safari or installed PWA)
   */
  isIOS: boolean;

  /**
   * True if running on Android
   */
  isAndroid: boolean;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

/**
 * Detect display mode using CSS media queries
 * Returns the most specific match (priority: fullscreen > standalone > minimal-ui > browser)
 */
function detectDisplayMode(): DisplayMode {
  if (typeof window === 'undefined') return 'browser';

  // Check in order of specificity
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return 'fullscreen';
  }

  if (window.matchMedia('(display-mode: standalone)').matches) {
    return 'standalone';
  }

  if (window.matchMedia('(display-mode: minimal-ui)').matches) {
    return 'minimal-ui';
  }

  // iOS-specific standalone check (Safari doesn't support display-mode media query in older versions)
  if ((window.navigator as any).standalone === true) {
    return 'standalone';
  }

  // Android-specific check (launched from home screen)
  if (document.referrer.includes('android-app://')) {
    return 'standalone';
  }

  return 'browser';
}

/**
 * Detect platform from user agent
 */
function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';

  const ua = window.navigator.userAgent.toLowerCase();

  // iOS detection
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }

  // Android detection
  if (/android/.test(ua)) {
    return 'android';
  }

  // Desktop (Windows, Mac, Linux)
  if (/win|mac|linux/.test(ua)) {
    return 'desktop';
  }

  return 'unknown';
}

interface PWAProviderProps {
  children: ReactNode;
}

/**
 * PWA Context Provider
 *
 * Detects PWA state once on mount and provides it to all child components.
 * This prevents duplicate detection logic and layout shifts.
 *
 * IMPORTANT: Place this high in the component tree, ideally in ClientLayoutWrapper
 * or root layout, so all components have access to PWA state.
 */
export function PWAProvider({ children }: PWAProviderProps) {
  // Detect ONCE on mount using useState initializer
  // This ensures detection happens synchronously before first render,
  // preventing layout shifts from state updates
  const [pwaState] = useState<PWAContextType>(() => {
    const displayMode = detectDisplayMode();
    const platform = detectPlatform();

    console.log('[PWAContext] Initializing:', {
      displayMode,
      platform,
      isStandalone: displayMode === 'standalone',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
    });

    return {
      displayMode,
      isStandalone: displayMode === 'standalone',
      isInstalled: displayMode !== 'browser',
      platform,
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
    };
  });

  return <PWAContext.Provider value={pwaState}>{children}</PWAContext.Provider>;
}

/**
 * Hook to access PWA context
 *
 * @throws Error if used outside PWAProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isStandalone, isIOS } = usePWA();
 *
 *   if (isStandalone && isIOS) {
 *     // iOS PWA specific behavior
 *   }
 * }
 * ```
 */
export function usePWA() {
  const context = useContext(PWAContext);

  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }

  return context;
}

/**
 * Optional: Hook for conditional rendering based on PWA mode
 *
 * @example
 * ```tsx
 * function InstallPrompt() {
 *   const showPrompt = usePWAMode('browser');
 *   if (!showPrompt) return null;
 *   return <div>Install our app!</div>;
 * }
 * ```
 */
export function usePWAMode(mode: DisplayMode | DisplayMode[]): boolean {
  const { displayMode } = usePWA();

  if (Array.isArray(mode)) {
    return mode.includes(displayMode);
  }

  return displayMode === mode;
}

/**
 * Optional: Hook for platform-specific rendering
 *
 * @example
 * ```tsx
 * function ShareButton() {
 *   const isIOS = usePlatform('ios');
 *   return isIOS ? <IOSShareIcon /> : <AndroidShareIcon />;
 * }
 * ```
 */
export function usePlatform(platform: Platform | Platform[]): boolean {
  const { platform: currentPlatform } = usePWA();

  if (Array.isArray(platform)) {
    return platform.includes(currentPlatform);
  }

  return currentPlatform === platform;
}
