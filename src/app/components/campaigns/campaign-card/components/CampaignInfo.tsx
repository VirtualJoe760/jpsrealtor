// components/CampaignInfo.tsx - Campaign Information Display

import React from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import type { Campaign } from '../types/index';
import { getCampaignTypeLabel } from '../utils/index';

interface CampaignInfoProps {
  campaign: Campaign;
  isLight: boolean;
  textPrimary: string;
  textSecondary: string;
  variant?: 'grid' | 'list';
}

export function CampaignInfo({ campaign, isLight, textPrimary, textSecondary, variant = 'list' }: CampaignInfoProps) {
  if (variant === 'grid') {
    return (
      <>
        {/* Campaign Name */}
        <h3 className={`text-lg font-bold ${textPrimary} mb-2 line-clamp-2 min-h-[3.5rem]`}>
          {campaign.name}
        </h3>

        {/* Campaign Type & Neighborhood */}
        <div className={`flex items-center gap-2 text-sm ${textSecondary} mb-4 flex-wrap`}>
          <span className={`px-2 py-1 ${isLight ? 'bg-gray-100' : 'bg-slate-700'} rounded-md font-medium`}>
            {getCampaignTypeLabel(campaign.type)}
          </span>
          {campaign.neighborhood && (
            <span className={`px-2 py-1 ${isLight ? 'bg-gray-100' : 'bg-slate-700'} rounded-md`}>
              {campaign.neighborhood}
            </span>
          )}
        </div>
      </>
    );
  }

  // List view
  return (
    <div className="flex-1 min-w-0">
      <h3 className={`text-base md:text-lg font-semibold ${textPrimary} truncate mb-2`}>
        {campaign.name}
      </h3>
      <div className={`flex items-center gap-2 md:gap-4 text-xs md:text-sm ${textSecondary} flex-wrap`}>
        <span className="flex items-center gap-1 md:gap-1.5">
          <UserGroupIcon className="w-3.5 h-4 md:w-4 md:h-4" />
          {campaign.totalContacts} contacts
        </span>
        <span className="hidden md:inline">•</span>
        <span>{getCampaignTypeLabel(campaign.type)}</span>
        {campaign.neighborhood && (
          <>
            <span className="hidden md:inline">•</span>
            <span>{campaign.neighborhood}</span>
          </>
        )}
      </div>
    </div>
  );
}
