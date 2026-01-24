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

    // Browser chrome stays black (handled by static meta tags in layout.tsx)

    // Persist to both cookie (for SSR) and localStorage (for backup)
    setThemeCookie(currentTheme);
    localStorage.setItem("site-theme", currentTheme);
  }, [currentTheme, mounted]);

  const setTheme = (theme: ThemeName) => {
    setCurrentTheme(theme);
  };

  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === "blackspace" ? "lightgradient" : "blackspace"));
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
