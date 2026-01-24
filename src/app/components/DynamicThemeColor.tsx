'use client';

/**
 * DynamicThemeColor - Updates PWA theme-color meta tag based on current theme
 *
 * This component dynamically updates the browser's theme-color (status bar, Dynamic Island area)
 * to match the current theme. Essential for PWA on iOS to ensure the safe area matches the app background.
 *
 * Theme Colors:
 * - Light Gradient: Uses the starting color of the gradient (#4f46e5 - indigo)
 * - Blackspace: Pure black (#000000)
 *
 * Updates:
 * - <meta name="theme-color"> tag
 * - <meta name="apple-mobile-web-app-status-bar-style">
 */

import { useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';

export default function DynamicThemeColor() {
  const { currentTheme } = useTheme();

  useEffect(() => {
    // Define theme colors that match globals.css backgrounds
    const themeColors = {
      lightgradient: '#4f46e5', // Indigo - matches gradient start
      blackspace: '#000000',     // Pure black
    };

    const color = themeColors[currentTheme];
    const statusBarStyle = currentTheme === 'lightgradient' ? 'default' : 'black-translucent';

    // Update theme-color meta tag (for Android, Chrome, Safari)
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', color);

    // Update iOS status bar style
    let metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaStatusBar) {
      metaStatusBar = document.createElement('meta');
      metaStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(metaStatusBar);
    }
    metaStatusBar.setAttribute('content', statusBarStyle);

    console.log('[DynamicThemeColor] Updated theme-color to:', color, '| Status bar style:', statusBarStyle);
  }, [currentTheme]);

  return null; // This component doesn't render anything
}
