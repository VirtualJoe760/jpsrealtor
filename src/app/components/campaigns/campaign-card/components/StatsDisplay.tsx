// components/StatsDisplay.tsx - Campaign Stats Display

import React from 'react';
import { UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import type { Campaign } from '../types/index';
import { calculateTotalSent } from '../utils/index';

interface StatsDisplayProps {
  campaign: Campaign;
  isLight: boolean;
  variant: 'grid' | 'list';
  textPrimary: string;
  textSecondary: string;
}

export function StatsDisplay({ campaign, isLight, variant, textPrimary, textSecondary }: StatsDisplayProps) {
  if (variant === 'grid') {
    return <GridStats campaign={campaign} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary} />;
  }

  return <ListStats campaign={campaign} isLight={isLight} textPrimary={textPrimary} textSecondary={textSecondary} />;
}

function GridStats({ campaign, isLight, textPrimary, textSecondary }: Omit<StatsDisplayProps, 'variant'>) {
  const totalSent = calculateTotalSent(campaign.analytics);

  return (
    <>
      {/* Stats Grid */}
      <div className={`grid grid-cols-2 gap-4 mb-4 pb-4 border-b ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>
        <div>
          <div className={`flex items-center gap-1.5 ${textSecondary} text-xs mb-1`}>
            <UserGroupIcon className="w-3.5 h-3.5" />
            Contacts
          </div>
          <div className={`text-xl font-bold ${textPrimary}`}>
            {campaign.totalContacts}
          </div>
        </div>
        <div>
          <div className={`flex items-center gap-1.5 ${textSecondary} text-xs mb-1`}>
            <ChartBarIcon className="w-3.5 h-3.5" />
            Sent
          </div>
          <div className={`text-xl font-bold ${textPrimary}`}>
            {totalSent}
          </div>
        </div>
      </div>

      {/* Responses & Conversions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`text-sm ${textSecondary}`}>Responses:</div>
          <div className={`text-lg font-semibold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
            {campaign.analytics.responses}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircleSolid className="w-5 h-5 text-green-500" />
          <div className={`text-lg font-semibold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
            {campaign.analytics.conversions}
          </div>
        </div>
      </div>
    </>
  );
}

function ListStats({ campaign, isLight, textPrimary, textSecondary }: Omit<StatsDisplayProps, 'variant'>) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700 md:border-0 md:pt-0">
      <div className="text-center md:text-left">
        <div className={`text-lg md:text-2xl font-bold ${textPrimary}`}>
          {campaign.analytics.responses}
        </div>
        <div className={`text-xs md:text-sm ${textSecondary}`}>Responses</div>
      </div>
      <div className="text-center md:text-left">
        <div className={`text-lg md:text-2xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
          {campaign.analytics.conversions}
        </div>
        <div className={`text-xs md:text-sm ${textSecondary}`}>Conversions</div>
      </div>
    </div>
  );
}
