'use client';

import { useState } from 'react';
import {
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  MicrophoneIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import CampaignPipelineWizard from './pipeline/CampaignPipelineWizard';

interface Campaign {
  id: string;
  name: string;
  type: string;
  neighborhood?: string;
  status: string;
  totalContacts: number;
  activeStrategies: {
    voicemail: boolean;
    email: boolean;
    text: boolean;
  };
  analytics: {
    voicemailsSent?: number;
    voicemailsListened?: number;
    emailsSent?: number;
    emailsOpened?: number;
    textsSent?: number;
    responses: number;
    conversions: number;
  };
  createdAt: string;
  lastActivity: string;
}

interface CampaignOverviewProps {
  campaign: Campaign;
  onRefresh?: () => void;
}

type Strategy = 'voicemail' | 'text' | 'email' | null;

export default function CampaignOverview({ campaign, onRefresh }: CampaignOverviewProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>(null);

  // If a strategy is selected, show the pipeline wizard
  if (selectedStrategy) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedStrategy(null)}
          className={`text-sm ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-emerald-400 hover:text-emerald-300'}`}
        >
          ← Back to Strategy Selection
        </button>
        <CampaignPipelineWizard campaign={campaign} initialStrategy={selectedStrategy} onRefresh={onRefresh} />
      </div>
    );
  }

  // Strategy selection view
  const strategies = [
    {
      id: 'voicemail' as Strategy,
      name: 'Voice Mails',
      description: 'Create scripts, generate AI voiceovers, and send via Drop Cowboy',
      icon: MicrophoneIcon,
      color: isLight ? 'blue' : 'emerald',
      active: campaign.activeStrategies.voicemail,
      stats: {
        sent: campaign.analytics.voicemailsSent || 0,
        listened: campaign.analytics.voicemailsListened || 0,
      },
    },
    {
      id: 'text' as Strategy,
      name: 'Text Messages',
      description: 'Create and send personalized text messages to contacts',
      icon: ChatBubbleLeftIcon,
      color: isLight ? 'green' : 'blue',
      active: campaign.activeStrategies.text,
      stats: {
        sent: campaign.analytics.textsSent || 0,
        responses: campaign.analytics.responses || 0,
      },
    },
    {
      id: 'email' as Strategy,
      name: 'Email Campaigns',
      description: 'Design and send professional email campaigns',
      icon: EnvelopeIcon,
      color: isLight ? 'purple' : 'indigo',
      active: campaign.activeStrategies.email,
      stats: {
        sent: campaign.analytics.emailsSent || 0,
        opened: campaign.analytics.emailsOpened || 0,
      },
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: isLight ? 'bg-blue-50' : 'bg-blue-900/20',
        border: isLight ? 'border-blue-200' : 'border-blue-700/50',
        iconBg: isLight ? 'bg-blue-100' : 'bg-blue-800/50',
        iconText: isLight ? 'text-blue-600' : 'text-blue-400',
        button: isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700',
        text: isLight ? 'text-blue-700' : 'text-blue-300',
      },
      emerald: {
        bg: isLight ? 'bg-emerald-50' : 'bg-emerald-900/20',
        border: isLight ? 'border-emerald-200' : 'border-emerald-700/50',
        iconBg: isLight ? 'bg-emerald-100' : 'bg-emerald-800/50',
        iconText: isLight ? 'text-emerald-600' : 'text-emerald-400',
        button: isLight ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700',
        text: isLight ? 'text-emerald-700' : 'text-emerald-300',
      },
      green: {
        bg: isLight ? 'bg-green-50' : 'bg-green-900/20',
        border: isLight ? 'border-green-200' : 'border-green-700/50',
        iconBg: isLight ? 'bg-green-100' : 'bg-green-800/50',
        iconText: isLight ? 'text-green-600' : 'text-green-400',
        button: isLight ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700',
        text: isLight ? 'text-green-700' : 'text-green-300',
      },
      purple: {
        bg: isLight ? 'bg-purple-50' : 'bg-purple-900/20',
        border: isLight ? 'border-purple-200' : 'border-purple-700/50',
        iconBg: isLight ? 'bg-purple-100' : 'bg-purple-800/50',
        iconText: isLight ? 'text-purple-600' : 'text-purple-400',
        button: isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600 hover:bg-purple-700',
        text: isLight ? 'text-purple-700' : 'text-purple-300',
      },
      indigo: {
        bg: isLight ? 'bg-indigo-50' : 'bg-indigo-900/20',
        border: isLight ? 'border-indigo-200' : 'border-indigo-700/50',
        iconBg: isLight ? 'bg-indigo-100' : 'bg-indigo-800/50',
        iconText: isLight ? 'text-indigo-600' : 'text-indigo-400',
        button: isLight ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-600 hover:bg-indigo-700',
        text: isLight ? 'text-indigo-700' : 'text-indigo-300',
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
          Choose Your Communication Strategy
        </h3>
        <p className={`text-sm ${textSecondary}`}>
          Select how you want to reach out to your {campaign.totalContacts} contacts
        </p>
      </div>

      {/* Strategy Cards */}
      <div className="grid gap-4">
        {strategies.map((strategy) => {
          const Icon = strategy.icon;
          const colors = getColorClasses(strategy.color);

          return (
            <div
              key={strategy.id}
              className={`${cardBg} ${cardBorder} rounded-lg p-4 transition-all hover:shadow-lg`}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left Side: Icon + Content */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Icon */}
                  <div className={`${colors.iconBg} p-3 rounded-lg`}>
                    <Icon className={`w-6 h-6 ${colors.iconText}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className={`text-lg font-semibold ${textPrimary}`}>
                        {strategy.name}
                      </h4>
                      {strategy.active && (
                        <span className={`px-2 py-1 ${colors.bg} ${colors.text} text-xs font-medium rounded-full`}>
                          Active
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${textSecondary}`}>
                      {strategy.description}
                    </p>

                    {/* Stats */}
                    {strategy.active && (
                      <div className="flex gap-4 mt-2">
                        {Object.entries(strategy.stats).map(([key, value]) => (
                          <div key={key} className={`text-sm`}>
                            <span className={textSecondary}>{key}: </span>
                            <span className={`font-semibold ${textPrimary}`}>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Start Arrow */}
                <button
                  onClick={() => setSelectedStrategy(strategy.id)}
                  className={`group p-3 rounded-full transition-all hover:scale-110 active:scale-95 flex-shrink-0`}
                  style={{
                    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3))',
                  }}
                >
                  <ArrowRightIcon
                    className={`w-8 h-8 ${colors.iconText} transition-transform group-hover:translate-x-1`}
                    strokeWidth={2.5}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Campaign Info */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
        <h4 className={`text-sm font-semibold ${textPrimary} mb-4`}>Campaign Details</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className={textSecondary}>Created:</span>{' '}
            <span className={textPrimary}>{new Date(campaign.createdAt).toLocaleDateString()}</span>
          </div>
          <div>
            <span className={textSecondary}>Last Activity:</span>{' '}
            <span className={textPrimary}>{new Date(campaign.lastActivity).toLocaleDateString()}</span>
          </div>
          <div>
            <span className={textSecondary}>Type:</span>{' '}
            <span className={`${textPrimary} capitalize`}>{campaign.type}</span>
          </div>
          <div>
            <span className={textSecondary}>Status:</span>{' '}
            <span className={`${textPrimary} capitalize`}>{campaign.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
