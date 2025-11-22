"use client";

import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { ReactNode } from "react";

interface BuySellPageWrapperProps {
  children: ReactNode;
}

/**
 * Theme-aware wrapper for buy/sell pages
 * Provides theme context to static content
 */
export default function BuySellPageWrapper({ children }: BuySellPageWrapperProps) {
  const {
    bgPrimary,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    textMuted,
    buttonPrimary,
    shadow,
    currentTheme,
  } = useThemeClasses();

  // Pass theme classes to children via data attributes
  return (
    <div
      data-theme={currentTheme}
      data-bg-primary={bgPrimary}
      data-card-bg={cardBg}
      data-card-border={cardBorder}
      data-text-primary={textPrimary}
      data-text-secondary={textSecondary}
      data-text-muted={textMuted}
      data-button-primary={buttonPrimary}
      data-shadow={shadow}
    >
      {children}
    </div>
  );
}
