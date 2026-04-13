'use client';

import { useState } from 'react';
import {
  EnvelopeIcon,
  MicrophoneIcon,
  ArrowRightIcon,
  MegaphoneIcon,
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
    directMail: boolean;
    googleAds: boolean;
    metaAds: boolean;
  };
  analytics: {
    voicemailsSent?: number;
    voicemailsListened?: number;
    emailsSent?: number;
    emailsOpened?: number;
    textsSent?: number;
    responses: number;
    conversions: number;
    mailSent?: number;
    mailDelivered?: number;
    qrScans?: number;
    adImpressions?: number;
    adClicks?: number;
    adConversions?: number;
    adSpend?: number;
  };
  createdAt: string;
  lastActivity: string;
}

interface CampaignOverviewProps {
  campaign: Campaign;
  onRefresh?: () => void;
}

type Strategy = 'voicemail' | 'directMail' | 'googleAds' | 'metaAds' | null;

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
      id: 'directMail' as Strategy,
      name: 'Direct Mail',
      description: 'Send postcards, letters, and handwritten notes via thanks.io with QR tracking',
      icon: EnvelopeIcon,
      color: isLight ? 'green' : 'blue',
      active: campaign.activeStrategies.directMail,
      stats: {
        mailed: campaign.analytics.mailSent || 0,
        delivered: campaign.analytics.mailDelivered || 0,
        scanned: campaign.analytics.qrScans || 0,
      },
    },
    {
      id: 'googleAds' as Strategy,
      name: 'Google Ads',
      description: 'Search and display ads targeting neighborhoods and custom audiences',
      icon: MegaphoneIcon,
      color: isLight ? 'purple' : 'indigo',
      active: campaign.activeStrategies.googleAds,
      stats: {
        clicks: campaign.analytics.adClicks || 0,
        conversions: campaign.analytics.adConversions || 0,
        spend: campaign.analytics.adSpend ? `$${campaign.analytics.adSpend.toFixed(2)}` : '$0.00',
      },
    },
    {
      id: 'metaAds' as Strategy,
      name: 'Meta Ads',
      description: 'Facebook and Instagram ads with custom audiences and lookalikes',
      icon: MegaphoneIcon,
      color: isLight ? 'pink' : 'rose',
      active: campaign.activeStrategies.metaAds,
      stats: {
        impressions: campaign.analytics.adImpressions || 0,
        clicks: campaign.analytics.adClicks || 0,
        conversions: campaign.analytics.adConversions || 0,
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
      pink: {
        bg: isLight ? 'bg-pink-50' : 'bg-pink-900/20',
        border: isLight ? 'border-pink-200' : 'border-pink-700/50',
        iconBg: isLight ? 'bg-pink-100' : 'bg-pink-800/50',
        iconText: isLight ? 'text-pink-600' : 'text-pink-400',
        button: isLight ? 'bg-pink-600 hover:bg-pink-700' : 'bg-pink-600 hover:bg-pink-700',
        text: isLight ? 'text-pink-700' : 'text-pink-300',
      },
      rose: {
        bg: isLight ? 'bg-rose-50' : 'bg-rose-900/20',
        border: isLight ? 'border-rose-200' : 'border-rose-700/50',
        iconBg: isLight ? 'bg-rose-100' : 'bg-rose-800/50',
        iconText: isLight ? 'text-rose-600' : 'text-rose-400',
        button: isLight ? 'bg-rose-600 hover:bg-rose-700' : 'bg-rose-600 hover:bg-rose-700',
        text: isLight ? 'text-rose-700' : 'text-rose-300',
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
