"use client";

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

    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Update theme classes on both html and body
    [document.documentElement, document.body].forEach(el => {
      el.className = el.className
        .split(" ")
        .filter((c) => !c.startsWith("theme-"))
        .concat(`theme-${currentTheme}`)
        .join(" ");
    });

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
