"use client";

/**
 * ThemeContext - Theme Management System
 *
 * This context manages the application's theme state, providing both light gradient
 * and dark (blackspace) theme options. Themes are persisted via cookies (for SSR)
 * and localStorage (for backup/backwards compatibility).
 *
 * CRITICAL: BACKGROUND & PADDING BEHAVIOR
 * ========================================
 *
 * Per MDN CSS Box Model: "Background colors extend through the padding area."
 *
 * This means that when a container has padding AND a background (like our gradient),
 * the background will be VISIBLE in the padded area, creating unwanted "white space"
 * or gradient bleed on the sides of the page.
 *
 * ⚠️ DO NOT apply padding to containers that sit directly against the body gradient!
 *
 * CORRECT PATTERN - Parent Wrapper with Padding:
 * ```tsx
 * // Main container - NO PADDING
 * <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-x-hidden pt-16 md:pt-0">
 *
 *   // Individual sections - WRAP with padding parent
 *   <div className="px-4 sm:px-6 lg:px-8">
 *     <YourComponent />
 *   </div>
 * </div>
 * ```
 *
 * INCORRECT PATTERN - Padding on Main Container:
 * ```tsx
 * // ❌ WRONG - Gradient will show through padding
 * <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 *   <YourComponent />
 * </div>
 * ```
 *
 * WHY THIS MATTERS:
 * - Body has gradient background (globals.css lines 124-135)
 * - Padding creates space between content and container edge
 * - Background fills that padding space, showing the gradient
 * - Result: Visible "white space" that looks like a layout bug
 *
 * SOLUTION:
 * 1. Remove padding from main containers that touch the body gradient
 * 2. Wrap individual sections (header, toolbar, content) in parent divs
 * 3. Apply padding to those parent wrappers: `px-4 sm:px-6 lg:px-8`
 * 4. This keeps content properly spaced WITHOUT exposing the background
 *
 * REFERENCE IMPLEMENTATION:
 * - See: src/app/agent/contacts/page.tsx (lines 19-87)
 * - See: src/app/components/crm/ContactsTab.tsx (lines 244-306)
 *
 * AFFECTED PAGES:
 * Any page that uses the gradient background and has full-width content containers.
 *
 * Last Updated: 2026-01-23
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { themes, getThemeClasses, type Theme, type ThemeName } from "@/app/themes/themes";

// Re-export types for convenience
export type { Theme, ThemeName };

interface ThemeContextType {
  currentTheme: ThemeName;
  theme: Theme;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Cookie name for theme persistence
const THEME_COOKIE_NAME = 'site-theme';

// Helper to set a cookie
function setThemeCookie(theme: ThemeName) {
  // Set cookie with 1 year expiry, accessible across the site
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

// Helper to get theme from cookie (client-side)
function getThemeFromCookie(): ThemeName | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${THEME_COOKIE_NAME}=([^;]+)`));
  const theme = match ? match[2] as ThemeName : null;
  return theme && themes[theme] ? theme : null;
}

// Helper function to get initial theme - checks cookie first, then localStorage
function getInitialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'lightgradient';

  try {
    // First check cookie (server can read this)
    const cookieTheme = getThemeFromCookie();
    if (cookieTheme) return cookieTheme;

    // Fallback to localStorage for backwards compatibility
    const savedTheme = localStorage.getItem("site-theme") as ThemeName | null;
    if (savedTheme && themes[savedTheme]) {
      // Migrate to cookie
      setThemeCookie(savedTheme);
      return savedTheme;
    }
  } catch (error) {
    console.error('Error reading theme:', error);
  }

  return 'lightgradient';
}

// Get initial theme from DOM (set by server/middleware)
function getServerRenderedTheme(): ThemeName | null {
  if (typeof document === 'undefined') return null;

  const html = document.documentElement;
  if (html.classList.contains('theme-blackspace')) return 'blackspace';
  if (html.classList.contains('theme-lightgradient')) return 'lightgradient';
  return null;
}

// ===================================
// THEME TRANSITION ANIMATIONS
// Two-Act System: Exit → Refresh → Enter
// ===================================

const ANIMATION_PAIRS = {
  'key-turn': { exit: 'key-lock', enter: 'key-unlock', duration: 300 },
  'french-doors': { exit: 'doors-close', enter: 'doors-open', duration: 500 },
  'blinds': { exit: 'blinds-close', enter: 'blinds-open', duration: 400 },
  'garage': { exit: 'garage-down', enter: 'garage-up', duration: 450 },
  'sliding-door': { exit: 'slide-close', enter: 'slide-open', duration: 450 },
  'property-card': { exit: 'card-flip-away', enter: 'card-flip-to', duration: 600 },
  'shutters': { exit: 'shutters-close', enter: 'shutters-open', duration: 500 },
  'curtains': { exit: 'curtains-close', enter: 'curtains-open', duration: 550 }
} as const;

type AnimationPairKey = keyof typeof ANIMATION_PAIRS;

/**
 * Select a random animation, avoiding repeats
 */
function selectRandomAnimation(): AnimationPairKey {
  const keys = Object.keys(ANIMATION_PAIRS) as AnimationPairKey[];
  const lastAnimation = localStorage.getItem('last-theme-animation') as AnimationPairKey | null;

  // Filter out the last animation to avoid repeats
  const availableKeys = lastAnimation
    ? keys.filter(k => k !== lastAnimation)
    : keys;

  const selectedKey = availableKeys[Math.floor(Math.random() * availableKeys.length)];

  // Save for next time
  localStorage.setItem('last-theme-animation', selectedKey);

  return selectedKey;
}

/**
 * Get theme color for overlay
 */
function getThemeColor(theme: ThemeName): string {
  return theme === 'blackspace' ? '#000000' : '#4f46e5';
}

/**
 * Play EXIT animation (closing the old theme)
 */
function playExitAnimation(
  animationKey: AnimationPairKey,
  backgroundColor: string
): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.style.backgroundColor = backgroundColor;
    overlay.setAttribute('data-animation', animationKey);
    overlay.setAttribute('data-phase', 'exit');

    const { exit, duration } = ANIMATION_PAIRS[animationKey];

    document.body.appendChild(overlay);

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      overlay.classList.add(exit);
      console.log(`[ThemeTransition] 🚪 EXIT: ${animationKey} (${duration}ms)`);
    });

    // Resolve after animation completes, but keep overlay for refresh
    setTimeout(() => {
      resolve();
    }, duration);
  });
}

/**
 * Play ENTER animation (opening the new theme)
 */
function playEnterAnimation(
  animationKey: AnimationPairKey,
  backgroundColor: string
): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'theme-transition-overlay';
    overlay.style.backgroundColor = backgroundColor;
    overlay.setAttribute('data-animation', animationKey);
    overlay.setAttribute('data-phase', 'enter');

    const { enter, duration } = ANIMATION_PAIRS[animationKey];

    document.body.appendChild(overlay);

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      overlay.classList.add(enter);
      console.log(`[ThemeTransition] 🔓 ENTER: ${animationKey} (${duration}ms)`);
    });

    // Remove overlay after animation completes
    setTimeout(() => {
      overlay.remove();
      resolve();
    }, duration);
  });
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeName;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  // Initialize with the server-provided theme to prevent hydration mismatch
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(initialTheme || 'lightgradient');
  const [mounted, setMounted] = useState(false);

  // After mount, sync with cookie/localStorage if needed (handles edge cases like stale props)
  useEffect(() => {
    setMounted(true);
    const storedTheme = getInitialTheme();
    // Only update if stored theme differs (e.g., user changed theme in another tab)
    if (storedTheme !== currentTheme) {
      setCurrentTheme(storedTheme);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply theme to document and persist
  useEffect(() => {
    if (!mounted) return;

    const theme = themes[currentTheme];
    const root = document.documentElement;
    const isLight = currentTheme === 'lightgradient';

    console.log('[ThemeContext] Applying theme:', currentTheme, '| isLight:', isLight);

    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Update theme classes on both html and body
    [document.documentElement, document.body].forEach(el => {
      el.className = el.className
        .split(" ")
        .filter((c) => !c.startsWith("theme-") && c !== "dark")
        .concat(`theme-${currentTheme}`)
        .concat(isLight ? [] : ["dark"]) // Add 'dark' class for Tailwind dark mode
        .join(" ");
    });

    // Detect if running as PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    console.log('[ThemeContext] Mode:', isStandalone ? 'PWA (standalone)' : 'Browser');

    // Only update meta tags in PWA mode - Safari browser ignores dynamic updates
    if (isStandalone) {
      const themeColor = isLight ? '#4f46e5' : '#000000'; // Indigo for light, black for dark
      // Light theme: 'default' (light status bar, no black overlay)
      // Dark theme: 'black' (opaque black status bar)
      const statusBarStyle = isLight ? 'default' : 'black';

      // Update theme-color meta tag (for Dynamic Island / status bar)
      // Remove and recreate to force Safari to recognize the change
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.remove();
      }
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      metaThemeColor.setAttribute('content', themeColor);
      document.head.appendChild(metaThemeColor);

      // Update iOS status bar style (PWA only)
      let metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (metaStatusBar) {
        metaStatusBar.remove();
      }
      metaStatusBar = document.createElement('meta');
      metaStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      metaStatusBar.setAttribute('content', statusBarStyle);
      document.head.appendChild(metaStatusBar);

      console.log('[ThemeContext] 🔄 Updated PWA meta tags:', { themeColor, statusBarStyle });
    } else {
      console.log('[ThemeContext] ⏭️  Skipped meta tag updates (browser mode - requires page refresh)');
    }

    // Persist to both cookie (for SSR) and localStorage (for backup)
    setThemeCookie(currentTheme);
    localStorage.setItem("site-theme", currentTheme);
  }, [currentTheme, mounted]);

  // Play ENTER animation on mount if coming from theme toggle
  useEffect(() => {
    if (!mounted) return;

    const animationKey = sessionStorage.getItem('theme-transition-pair') as AnimationPairKey | null;
    const timestamp = sessionStorage.getItem('theme-transition-timestamp');

    if (animationKey && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);

      // Only play if refresh happened within 5 seconds (prevent stale animations)
      if (age < 5000) {
        const newColor = getThemeColor(currentTheme);

        console.log(`[ThemeTransition] 🎬 Act 2: Playing ENTER animation`);

        playEnterAnimation(animationKey, newColor).then(() => {
          // Cleanup sessionStorage after animation completes
          sessionStorage.removeItem('theme-transition-pair');
          sessionStorage.removeItem('theme-transition-timestamp');
        });
      } else {
        // Clear stale data
        console.log('[ThemeTransition] ⏰ Stale animation data cleared (>5s old)');
        sessionStorage.removeItem('theme-transition-pair');
        sessionStorage.removeItem('theme-transition-timestamp');
      }
    }
  }, [mounted, currentTheme]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
  };

  const toggleTheme = async () => {
    const newTheme = currentTheme === "blackspace" ? "lightgradient" : "blackspace";
    const oldColor = getThemeColor(currentTheme);

    // Detect if running as PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');

    if (!isStandalone) {
      // Browser mode: Two-act animation system
      const selectedAnimation = selectRandomAnimation();

      // Save animation choice and timestamp to sessionStorage
      sessionStorage.setItem('theme-transition-pair', selectedAnimation);
      sessionStorage.setItem('theme-transition-timestamp', Date.now().toString());

      console.log(`[ThemeTransition] 🎬 Starting two-act transition: ${selectedAnimation}`);

      // Act 1: Play EXIT animation with old theme color
      await playExitAnimation(selectedAnimation, oldColor);

      // Update cookie for server-side rendering
      setThemeCookie(newTheme);

      // Trigger page refresh (Act 2 will play on mount)
      window.location.reload();
    } else {
      // PWA mode: Instant theme change (no refresh needed)
      console.log('[ThemeTransition] ⚡ PWA mode - instant theme change');
      setCurrentTheme(newTheme);
    }
  };

  const value: ThemeContextType = {
    currentTheme,
    theme: themes[currentTheme],
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Helper hook for theme-aware Tailwind classes
 * Returns pre-computed classes based on the current theme
 */
export function useThemeClasses() {
  const { currentTheme } = useTheme();
  return {
    ...getThemeClasses(currentTheme),
    currentTheme,
  };
}
