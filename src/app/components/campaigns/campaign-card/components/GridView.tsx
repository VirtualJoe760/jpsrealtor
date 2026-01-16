// components/GridView.tsx - Grid View Card Layout

import React from 'react';
import { motion } from 'framer-motion';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { Campaign } from '../types/index';
import { StatusBadge } from './StatusBadge';
import { StrategyIcons } from './StrategyIcons';
import { StatsDisplay } from './StatsDisplay';
import { EngagementBars } from './EngagementBars';
import { CampaignInfo } from './CampaignInfo';

interface GridViewProps {
  campaign: Campaign;
  isSelected: boolean;
  isLight: boolean;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSecondary: string;
  onClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
}

export function GridView({
  campaign,
  isSelected,
  isLight,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  onClick,
  onDelete,
}: GridViewProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={onClick}
      className={`group relative ${cardBg} rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
        isSelected
          ? `${isLight ? 'border-blue-500 shadow-2xl shadow-blue-500/20' : 'border-emerald-500 shadow-2xl shadow-emerald-500/20'}`
          : `${cardBorder} ${isLight ? 'hover:border-blue-300' : 'hover:border-emerald-700'} shadow-lg hover:shadow-xl`
      }`}
    >
      {/* Delete Button - Top Left */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className={`absolute top-4 left-4 z-10 p-2 ${cardBg} ${isLight ? 'hover:bg-red-100' : 'hover:bg-red-900/30'} rounded-lg shadow-md transition-all`}
        title="Delete campaign"
      >
        <TrashIcon className={`w-4 h-4 ${isLight ? 'text-gray-600 hover:text-red-600' : 'text-gray-400 hover:text-red-400'}`} />
      </button>

      {/* Status Badge - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <StatusBadge status={campaign.status} isLight={isLight} />
      </div>

      {/* Gradient Header */}
      <div className="h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative">
        <div className="absolute inset-0 bg-black/10"></div>
        {/* Strategy Icons - Floating */}
        <div className="absolute -bottom-4 left-4">
          <StrategyIcons activeStrategies={campaign.activeStrategies} isLight={isLight} variant="grid" />
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-8">
        <CampaignInfo
          campaign={campaign}
          isLight={isLight}
          textPrimary={textPrimary}
          textSecondary={textSecondary}
          variant="grid"
        />

        <StatsDisplay
          campaign={campaign}
          isLight={isLight}
          variant="grid"
          textPrimary={textPrimary}
          textSecondary={textSecondary}
        />

        <EngagementBars campaign={campaign} isLight={isLight} textSecondary={textSecondary} />
      </div>

      {/* Hover effect overlay */}
      {isSelected && (
        <div className={`absolute inset-0 ${isLight ? 'bg-blue-500/5' : 'bg-emerald-500/5'} pointer-events-none`}></div>
      )}
    </motion.div>
  );
}
