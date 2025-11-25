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

// Helper function to get initial theme from localStorage (runs synchronously)
function getInitialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'lightgradient'; // Default to light mode on server

  try {
    const savedTheme = localStorage.getItem("site-theme") as ThemeName | null;
    if (savedTheme && themes[savedTheme]) {
      return savedTheme;
    }
  } catch (error) {
    console.error('Error reading theme from localStorage:', error);
  }

  return 'lightgradient'; // Default to light mode
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always start with a default theme on both server and client to avoid hydration mismatch
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('lightgradient');
  const [mounted, setMounted] = useState(false);

  // Load saved theme from localStorage after mounting (client-side only)
  useEffect(() => {
    setMounted(true);

    // Load theme from localStorage
    const savedTheme = getInitialTheme();
    if (savedTheme !== 'lightgradient') {
      setCurrentTheme(savedTheme);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return; // Don't apply theme until mounted to avoid hydration issues

    console.log('🎨 ThemeContext - Applying theme:', currentTheme);

    const theme = themes[currentTheme];
    const root = document.documentElement;

    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Add theme class to body
    document.body.className = document.body.className
      .split(" ")
      .filter((c) => !c.startsWith("theme-"))
      .concat(`theme-${currentTheme}`)
      .join(" ");

    console.log('✅ ThemeContext - Theme applied. Body classes:', document.body.className);

    // Save to localStorage
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
