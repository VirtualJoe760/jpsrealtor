// app/components/MetaThemeManager.tsx
"use client";

import { useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';

/**
 * MetaThemeManager - Updates browser chrome colors when theme changes
 *
 * This component listens to ThemeContext and updates meta tags for:
 * - Mobile browser address bar (theme-color)
 * - iOS status bar style (apple-mobile-web-app-status-bar-style)
 * - Android navigation bar (msapplication-navbutton-color)
 *
 * Supports both lightgradient and blackspace themes.
 */
export function MetaThemeManager() {
  const { currentTheme } = useTheme();

  useEffect(() => {
    // Define theme-specific colors for browser chrome
    const themeColors = {
      lightgradient: {
        primary: '#ffffff',
        statusBar: 'default', // iOS: light status bar (dark text)
        navbar: '#ffffff'
      },
      blackspace: {
        primary: '#0a0a0a',
        statusBar: 'black-translucent', // iOS: dark status bar (light text)
        navbar: '#0a0a0a'
      }
    };

    const colors = themeColors[currentTheme as keyof typeof themeColors] || themeColors.lightgradient;

    // Update standard theme-color (mobile browser address bar)
    updateMetaTag('theme-color', colors.primary);

    // Update Apple-specific status bar style (iOS Safari)
    updateMetaTag('apple-mobile-web-app-status-bar-style', colors.statusBar);

    // Update PWA navbar color (for installed apps)
    updateMetaTag('msapplication-navbutton-color', colors.navbar);

    // Log theme change for debugging
    console.log('[MetaThemeManager] Updated browser chrome to:', currentTheme, colors);

  }, [currentTheme]);

  // This component only manages meta tags - renders nothing
  return null;
}

/**
 * Helper function to update or create a meta tag
 *
 * @param name - The name attribute of the meta tag
 * @param content - The content to set
 * @param attr - The attribute to match on (default: 'name')
 * @param attrValue - The value of the attribute to match (default: same as name)
 */
function updateMetaTag(
  name: string,
  content: string,
  attr: string = 'name',
  attrValue?: string
) {
  const selector = `meta[${attr}="${attrValue || name}"]`;
  let meta = document.querySelector(selector);

  if (!meta) {
    // Create meta tag if it doesn't exist
    meta = document.createElement('meta');
    meta.setAttribute(attr, attrValue || name);
    document.head.appendChild(meta);
  }

  // Update content
  meta.setAttribute('content', content);
}
