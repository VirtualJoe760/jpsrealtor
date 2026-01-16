// app/components/campaigns/CampaignCard.tsx
// Refactored Campaign Card Component
// Original: 505 lines
// Refactored: ~40 lines (main component) + modular components
'use client';

import React from 'react';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import type { CampaignCardProps, ViewMode } from './campaign-card/types/index';
import { GridView, ListView } from './campaign-card/components/index';

export default function CampaignCard({
  campaign,
  viewMode,
  isSelected,
  onClick,
  onDelete,
}: CampaignCardProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const sharedProps = {
    campaign,
    isSelected,
    isLight,
    cardBg,
    cardBorder,
    textPrimary,
    textSecondary,
    onClick,
    onDelete,
  };

  if (viewMode === 'list' || viewMode === 'list' as ViewMode) {
    return <ListView {...sharedProps} />;
  }

  return <GridView {...sharedProps} />;
}
