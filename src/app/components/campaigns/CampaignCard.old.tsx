// app/components/campaigns/CampaignCard.tsx
'use client';

import { motion } from 'framer-motion';
import {
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  MicrophoneIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';

interface Campaign {
  id: string;
  name: string;
  type: string;
  neighborhood?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'generating_scripts' | 'generating_audio' | 'review';
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
    textsDelivered?: number;
    responses: number;
    conversions: number;
  };
  createdAt: string;
  lastActivity: string;
}

interface CampaignCardProps {
  campaign: Campaign;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
}

const getStatusConfig = (isLight: boolean) => ({
  draft: {
    label: 'Draft',
    color: isLight ? 'bg-gray-100 text-gray-700' : 'bg-gray-800 text-gray-300',
    icon: ClockIcon,
  },
  generating_scripts: {
    label: 'Generating Scripts',
    color: isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/30 text-purple-400',
    icon: DocumentTextIcon,
  },
  generating_audio: {
    label: 'Generating Audio',
    color: isLight ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-900/30 text-indigo-400',
    icon: MicrophoneIcon,
  },
  review: {
    label: 'Review',
    color: isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-900/30 text-orange-400',
    icon: EyeIcon,
  },
  active: {
    label: 'Active',
    color: isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-400',
    icon: PlayIcon,
  },
  paused: {
    label: 'Paused',
    color: isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400',
    icon: PauseIcon,
  },
  completed: {
    label: 'Completed',
    color: isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400',
    icon: CheckCircleIcon,
  },
});

const campaignTypeLabels: Record<string, string> = {
  sphere_of_influence: 'Sphere of Influence',
  past_clients: 'Past Clients',
  neighborhood_expireds: 'Expired Listings',
  high_equity: 'High Equity',
  custom: 'Custom',
};

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

  const statusConfig = getStatusConfig(isLight);
  const StatusIcon = statusConfig[campaign.status].icon;

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ scale: 1.01 }}
        onClick={(e) => onClick(e)}
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
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                  statusConfig[campaign.status].color
                }`}
              >
                <StatusIcon className="w-3 h-3" />
                {statusConfig[campaign.status].label}
              </span>
            </div>

            {/* Contact Count & Type */}
            <div className={`flex items-center gap-2 text-xs ${textSecondary} flex-wrap`}>
              <span className="flex items-center gap-1">
                <UserGroupIcon className="w-3.5 h-3.5" />
                {campaign.totalContacts} contacts
              </span>
              <span>•</span>
              <span>{campaignTypeLabels[campaign.type] || campaign.type}</span>
              {campaign.neighborhood && (
                <>
                  <span>•</span>
                  <span>{campaign.neighborhood}</span>
                </>
              )}
            </div>

            {/* Active Strategies */}
            <div className="flex items-center gap-2">
              {campaign.activeStrategies.voicemail && (
                <div
                  className={`p-1.5 ${isLight ? 'bg-purple-100' : 'bg-purple-900/30'} rounded-lg`}
                  title="Voicemail"
                >
                  <PhoneIcon className={`w-4 h-4 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                </div>
              )}
              {campaign.activeStrategies.email && (
                <div
                  className={`p-1.5 ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'} rounded-lg`}
                  title="Email"
                >
                  <EnvelopeIcon className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                </div>
              )}
              {campaign.activeStrategies.text && (
                <div
                  className={`p-1.5 ${isLight ? 'bg-green-100' : 'bg-green-900/30'} rounded-lg`}
                  title="Text"
                >
                  <ChatBubbleLeftIcon className={`w-4 h-4 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className={`text-lg font-bold ${textPrimary}`}>
                  {campaign.analytics.responses}
                </div>
                <div className={`text-xs ${textSecondary}`}>Responses</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                  {campaign.analytics.conversions}
                </div>
                <div className={`text-xs ${textSecondary}`}>Conversions</div>
              </div>
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className={`text-lg font-semibold ${textPrimary} truncate`}>
                  {campaign.name}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    statusConfig[campaign.status].color
                  }`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig[campaign.status].label}
                </span>
              </div>
              <div className={`flex items-center gap-4 text-sm ${textSecondary}`}>
                <span className="flex items-center gap-1.5">
                  <UserGroupIcon className="w-4 h-4" />
                  {campaign.totalContacts} contacts
                </span>
                <span>•</span>
                <span>{campaignTypeLabels[campaign.type] || campaign.type}</span>
                {campaign.neighborhood && (
                  <>
                    <span>•</span>
                    <span>{campaign.neighborhood}</span>
                  </>
                )}
              </div>
            </div>

            {/* Center: Active Strategies */}
            <div className="flex items-center gap-2">
              {campaign.activeStrategies.voicemail && (
                <div
                  className={`p-2 ${isLight ? 'bg-purple-100' : 'bg-purple-900/30'} rounded-lg`}
                  title="Voicemail strategy active"
                >
                  <PhoneIcon className={`w-5 h-5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                </div>
              )}
              {campaign.activeStrategies.email && (
                <div
                  className={`p-2 ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'} rounded-lg`}
                  title="Email strategy active"
                >
                  <EnvelopeIcon className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                </div>
              )}
              {campaign.activeStrategies.text && (
                <div
                  className={`p-2 ${isLight ? 'bg-green-100' : 'bg-green-900/30'} rounded-lg`}
                  title="Text strategy active"
                >
                  <ChatBubbleLeftIcon className={`w-5 h-5 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
                </div>
              )}
            </div>

            {/* Right: Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="text-center">
                <div className={`text-2xl font-bold ${textPrimary}`}>
                  {campaign.analytics.responses}
                </div>
                <div className={textSecondary}>Responses</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
                  {campaign.analytics.conversions}
                </div>
                <div className={textSecondary}>Conversions</div>
              </div>
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

  // Grid view
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={(e) => onClick(e)}
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
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm ${
            statusConfig[campaign.status].color
          }`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {statusConfig[campaign.status].label}
        </span>
      </div>

      {/* Gradient Header */}
      <div className="h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative">
        <div className="absolute inset-0 bg-black/10"></div>
        {/* Strategy Icons - Floating */}
        <div className="absolute -bottom-4 left-4 flex gap-2">
          {campaign.activeStrategies.voicemail && (
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={`p-3 ${cardBg} rounded-xl shadow-lg border-2 ${cardBorder}`}
            >
              <PhoneIcon className={`w-6 h-6 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
            </motion.div>
          )}
          {campaign.activeStrategies.email && (
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={`p-3 ${cardBg} rounded-xl shadow-lg border-2 ${cardBorder}`}
            >
              <EnvelopeIcon className={`w-6 h-6 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
            </motion.div>
          )}
          {campaign.activeStrategies.text && (
            <motion.div
              whileHover={{ scale: 1.1 }}
              className={`p-3 ${cardBg} rounded-xl shadow-lg border-2 ${cardBorder}`}
            >
              <ChatBubbleLeftIcon className={`w-6 h-6 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-8">
        {/* Campaign Name */}
        <h3 className={`text-lg font-bold ${textPrimary} mb-2 line-clamp-2 min-h-[3.5rem]`}>
          {campaign.name}
        </h3>

        {/* Campaign Type & Neighborhood */}
        <div className={`flex items-center gap-2 text-sm ${textSecondary} mb-4`}>
          <span className={`px-2 py-1 ${isLight ? 'bg-gray-100' : 'bg-slate-700'} rounded-md font-medium`}>
            {campaignTypeLabels[campaign.type] || campaign.type}
          </span>
          {campaign.neighborhood && (
            <span className={`px-2 py-1 ${isLight ? 'bg-gray-100' : 'bg-slate-700'} rounded-md`}>
              {campaign.neighborhood}
            </span>
          )}
        </div>

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
              {(campaign.analytics.voicemailsSent || 0) +
                (campaign.analytics.emailsSent || 0) +
                (campaign.analytics.textsSent || 0)}
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

        {/* Engagement Bars (if applicable) */}
        {campaign.status === 'active' && (
          <div className="mt-4 space-y-2">
            {campaign.activeStrategies.voicemail && campaign.analytics.voicemailsSent && (
              <div className="flex items-center gap-2">
                <PhoneIcon className={`w-4 h-4 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                <div className={`flex-1 ${isLight ? 'bg-gray-200' : 'bg-slate-700'} rounded-full h-2 overflow-hidden`}>
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        ((campaign.analytics.voicemailsListened || 0) /
                          campaign.analytics.voicemailsSent) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className={`text-xs ${textSecondary} min-w-[3rem] text-right`}>
                  {Math.round(
                    ((campaign.analytics.voicemailsListened || 0) /
                      campaign.analytics.voicemailsSent) *
                      100
                  )}
                  %
                </span>
              </div>
            )}
            {campaign.activeStrategies.email && campaign.analytics.emailsSent && (
              <div className="flex items-center gap-2">
                <EnvelopeIcon className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                <div className={`flex-1 ${isLight ? 'bg-gray-200' : 'bg-slate-700'} rounded-full h-2 overflow-hidden`}>
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        ((campaign.analytics.emailsOpened || 0) / campaign.analytics.emailsSent) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <span className={`text-xs ${textSecondary} min-w-[3rem] text-right`}>
                  {Math.round(
                    ((campaign.analytics.emailsOpened || 0) / campaign.analytics.emailsSent) * 100
                  )}
                  %
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover effect overlay */}
      {isSelected && (
        <div className={`absolute inset-0 ${isLight ? 'bg-blue-500/5' : 'bg-emerald-500/5'} pointer-events-none`}></div>
      )}
    </motion.div>
  );
}
