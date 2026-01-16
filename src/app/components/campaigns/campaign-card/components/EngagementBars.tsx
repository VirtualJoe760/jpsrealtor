// components/EngagementBars.tsx - Engagement Metrics Progress Bars

import React from 'react';
import type { Campaign } from '../types/index';
import { STRATEGY_ICONS, STRATEGY_COLORS_LIGHT, STRATEGY_COLORS_DARK, ENGAGEMENT_GRADIENTS } from '../constants/index';
import { calculateVoicemailEngagement, calculateEmailEngagement } from '../utils/index';

interface EngagementBarsProps {
  campaign: Campaign;
  isLight: boolean;
  textSecondary: string;
}

export function EngagementBars({ campaign, isLight, textSecondary }: EngagementBarsProps) {
  const { activeStrategies, analytics } = campaign;
  const colors = isLight ? STRATEGY_COLORS_LIGHT : STRATEGY_COLORS_DARK;

  // Only show for active campaigns
  if (campaign.status !== 'active') {
    return null;
  }

  return (
    <div className="mt-4 space-y-2">
      {/* Voicemail Engagement */}
      {activeStrategies.voicemail && analytics.voicemailsSent && (
        <EngagementBar
          Icon={STRATEGY_ICONS.voicemail}
          iconColor={colors.voicemail.text}
          percentage={calculateVoicemailEngagement(analytics)}
          gradientClass={ENGAGEMENT_GRADIENTS.voicemail}
          isLight={isLight}
          textSecondary={textSecondary}
        />
      )}

      {/* Email Engagement */}
      {activeStrategies.email && analytics.emailsSent && (
        <EngagementBar
          Icon={STRATEGY_ICONS.email}
          iconColor={colors.email.text}
          percentage={calculateEmailEngagement(analytics)}
          gradientClass={ENGAGEMENT_GRADIENTS.email}
          isLight={isLight}
          textSecondary={textSecondary}
        />
      )}
    </div>
  );
}

interface EngagementBarProps {
  Icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  percentage: number;
  gradientClass: string;
  isLight: boolean;
  textSecondary: string;
}

function EngagementBar({ Icon, iconColor, percentage, gradientClass, isLight, textSecondary }: EngagementBarProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      <div className={`flex-1 ${isLight ? 'bg-gray-200' : 'bg-slate-700'} rounded-full h-2 overflow-hidden`}>
        <div
          className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-xs ${textSecondary} min-w-[3rem] text-right`}>
        {percentage}%
      </span>
    </div>
  );
}
