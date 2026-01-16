// components/ListView.tsx - List View Card Layout

import React from 'react';
import { motion } from 'framer-motion';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { Campaign } from '../types/index';
import { StatusBadge } from './StatusBadge';
import { StrategyIcons } from './StrategyIcons';
import { StatsDisplay } from './StatsDisplay';
import { CampaignInfo } from './CampaignInfo';

interface ListViewProps {
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

export function ListView({
  campaign,
  isSelected,
  isLight,
  cardBg,
  cardBorder,
  textPrimary,
  textSecondary,
  onClick,
  onDelete,
}: ListViewProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`relative ${cardBg} rounded-xl border-2 transition-all cursor-pointer overflow-hidden ${
        isSelected
          ? `${isLight ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-emerald-500 shadow-lg shadow-emerald-500/20'}`
          : `${cardBorder} ${isLight ? 'hover:border-blue-300' : 'hover:border-emerald-700'} shadow-sm hover:shadow-md`
      }`}
    >
      <div className="p-4 md:p-6">
        {/* Mobile Layout - Stacked */}
        <div className="md:hidden space-y-3">
          {/* Top: Name & Status */}
          <div className="flex items-start justify-between gap-2">
            <h3 className={`text-base font-semibold ${textPrimary} flex-1`}>
              {campaign.name}
            </h3>
            <StatusBadge status={campaign.status} isLight={isLight} className="flex-shrink-0 px-2 py-0.5 text-xs" />
          </div>

          {/* Contact Info */}
          <CampaignInfo
            campaign={campaign}
            isLight={isLight}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            variant="list"
          />

          {/* Active Strategies */}
          <StrategyIcons activeStrategies={campaign.activeStrategies} isLight={isLight} variant="list" />

          {/* Stats */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <StatsDisplay
              campaign={campaign}
              isLight={isLight}
              variant="list"
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`p-2 ${isLight ? 'hover:bg-red-100' : 'hover:bg-red-900/30'} rounded-lg transition-colors group`}
              title="Delete"
            >
              <TrashIcon className={`w-5 h-5 ${textSecondary} ${isLight ? 'group-hover:text-red-600' : 'group-hover:text-red-400'}`} />
            </button>
          </div>
        </div>

        {/* Desktop Layout - Horizontal */}
        <div className="hidden md:flex items-start justify-between gap-4">
          {/* Left: Name & Info */}
          <CampaignInfo
            campaign={campaign}
            isLight={isLight}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            variant="list"
          />

          {/* Center: Status & Strategies */}
          <div className="flex items-center gap-4">
            <StatusBadge status={campaign.status} isLight={isLight} className="px-2.5 py-1" />
            <StrategyIcons activeStrategies={campaign.activeStrategies} isLight={isLight} variant="list" />
          </div>

          {/* Right: Stats */}
          <div className="flex items-center gap-6 text-sm">
            <StatsDisplay
              campaign={campaign}
              isLight={isLight}
              variant="list"
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={`p-2 ${isLight ? 'hover:bg-red-100' : 'hover:bg-red-900/30'} rounded-lg transition-colors group`}
              title="Delete campaign"
            >
              <TrashIcon className={`w-5 h-5 ${textSecondary} ${isLight ? 'group-hover:text-red-600' : 'group-hover:text-red-400'}`} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
