// app/components/campaigns/CampaignDetailPanel.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  PlayIcon,
  PauseIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  ChartBarIcon,
  ClockIcon,
  ChatBubbleLeftIcon,
  MicrophoneIcon,
} from '@heroicons/react/24/outline';
import { FileText, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import CampaignContactsManager from './CampaignContactsManager';
import ProfileCompletionModal from './ProfileCompletionModal';
import GenerationProgressTracker from './GenerationProgressTracker';
import VoiceRecorder from './VoiceRecorder';
import CampaignOverview from './CampaignOverview';

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

interface CampaignDetailPanelProps {
  campaign: Campaign;
  onClose: () => void;
  onRefresh?: () => void;
}

type Tab = 'overview' | 'contacts' | 'history' | 'analytics';

export default function CampaignDetailPanel({ campaign, onClose, onRefresh }: CampaignDetailPanelProps) {
  const router = useRouter();
  const { cardBg, cardBorder, textPrimary, textSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [backdropClickable, setBackdropClickable] = useState(false);

  const handleOpenFullPage = () => {
    router.push(`/agent/campaigns/${campaign.id}`);
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'contacts', label: 'Contacts', icon: UserGroupIcon },
    { id: 'history', label: 'History', icon: ClockIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
  ];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onAnimationComplete={() => setBackdropClickable(true)}
        onClick={(e) => {
          if (backdropClickable) {
            onClose();
          }
        }}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 ${!backdropClickable ? 'pointer-events-none' : ''}`}
      />

      {/* Side Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className={`fixed right-0 top-0 h-full w-full max-w-2xl ${cardBg} shadow-2xl z-50 overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className={`p-6 text-white ${isLight ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-emerald-600 to-teal-600'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-2xl font-bold mb-2">{campaign.name}</h2>
              <div className="flex items-center gap-3 text-blue-100">
                <span className="text-sm">{campaign.totalContacts} contacts</span>
                <span>•</span>
                <span className="text-sm capitalize">{campaign.status}</span>
                {campaign.neighborhood && (
                  <>
                    <span>•</span>
                    <span className="text-sm">{campaign.neighborhood}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenFullPage}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Open in full page"
              >
                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-sm text-blue-100 mb-1">Total Sent</div>
              <div className="text-2xl font-bold">
                {(campaign.analytics.voicemailsSent || 0) +
                  (campaign.analytics.emailsSent || 0) +
                  (campaign.analytics.textsSent || 0)}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-sm text-blue-100 mb-1">Responses</div>
              <div className="text-2xl font-bold">{campaign.analytics.responses}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
              <div className="text-sm text-blue-100 mb-1">Conversions</div>
              <div className="text-2xl font-bold text-green-300">
                {campaign.analytics.conversions}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex items-center gap-1 px-6 border-b ${border} ${isLight ? 'bg-gray-50' : 'bg-slate-800/50'}`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? `${isLight ? 'border-blue-600 text-blue-600' : 'border-emerald-500 text-emerald-400'}`
                    : `border-transparent ${textSecondary} ${isLight ? 'hover:text-gray-900' : 'hover:text-gray-200'}`
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 select-text">
          {activeTab === 'overview' && <OverviewTab campaign={campaign} onRefresh={onRefresh} />}
          {activeTab === 'contacts' && <ContactsTab campaign={campaign} />}
          {activeTab === 'history' && <HistoryTab campaign={campaign} />}
          {activeTab === 'analytics' && <AnalyticsTab campaign={campaign} />}
        </div>

        {/* Footer Actions */}
        <div className={`border-t ${border} p-4 ${isLight ? 'bg-gray-50' : 'bg-slate-800/50'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {campaign.status === 'active' && (
                <button className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors">
                  <PauseIcon className="w-4 h-4" />
                  Pause Campaign
                </button>
              )}
              {campaign.status === 'paused' && (
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                  <PlayIcon className="w-4 h-4" />
                  Resume Campaign
                </button>
              )}
              <button className={`flex items-center gap-2 px-4 py-2 ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-slate-700 hover:bg-slate-600 text-white'} rounded-lg font-medium transition-colors`}>
                <PencilIcon className="w-4 h-4" />
                Edit
              </button>
            </div>
            <button className={`p-2 text-red-600 ${isLight ? 'hover:bg-red-50' : 'hover:bg-red-900/20'} rounded-lg transition-colors`}>
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// Tab Components
function OverviewTab({ campaign, onRefresh }: { campaign: Campaign; onRefresh?: () => void }) {
  return <CampaignOverview campaign={campaign} onRefresh={onRefresh} />;
}

function ContactsTab({ campaign }: { campaign: Campaign }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleContactsChange = () => {
    setRefreshKey(prev => prev + 1);
    // TODO: Refresh campaign data to update totalContacts count
  };

  return (
    <div>
      <CampaignContactsManager
        key={refreshKey}
        campaignId={campaign.id}
        onContactsChange={handleContactsChange}
      />
    </div>
  );
}

function HistoryTab({ campaign }: { campaign: Campaign }) {
  const { textPrimary, textSecondary, cardBg, cardBorder } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaign.id}/history`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error('[HistoryTab] Error fetching history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [campaign.id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isLight ? 'border-blue-600' : 'border-emerald-500'} mx-auto mb-4`}></div>
          <p className={textSecondary}>Loading campaign history...</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={`${cardBg} ${cardBorder} rounded-lg p-8 text-center`}>
        <ClockIcon className={`w-12 h-12 ${textSecondary} mx-auto mb-3`} />
        <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
          No Activity Yet
        </h3>
        <p className={`text-sm ${textSecondary}`}>
          Campaign activities will appear here once you start sending voicemails, texts, or emails.
        </p>
      </div>
    );
  }

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'voicemail':
        return <MicrophoneIcon className="w-5 h-5" />;
      case 'text':
        return <ChatBubbleLeftIcon className="w-5 h-5" />;
      case 'email':
        return <ChatBubbleLeftIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case 'voicemail':
        return isLight ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-purple-900/30 text-purple-400 border-purple-700/50';
      case 'text':
        return isLight ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-blue-900/30 text-blue-400 border-blue-700/50';
      case 'email':
        return isLight ? 'bg-green-100 text-green-700 border-green-200' : 'bg-green-900/30 text-green-400 border-green-700/50';
      default:
        return isLight ? 'bg-gray-100 text-gray-700 border-gray-200' : 'bg-gray-900/30 text-gray-400 border-gray-700/50';
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div>
      <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>
        Campaign Activity Timeline
      </h3>
      <div className="space-y-3">
        {history.map((item, index) => (
          <div
            key={index}
            className={`${cardBg} ${cardBorder} rounded-lg p-4 border-l-4 ${getStrategyColor(item.strategy)}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${getStrategyColor(item.strategy)}`}>
                {getStrategyIcon(item.strategy)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-semibold ${textPrimary} capitalize`}>
                    {item.strategy === 'voicemail' ? 'Voicemail Drop' : `${item.strategy} Campaign`}
                  </h4>
                  <span className={`text-xs ${textSecondary}`}>
                    {formatDate(item.date)}
                  </span>
                </div>
                <p className={`text-sm ${textSecondary} mb-2`}>
                  {item.description || `Sent ${item.count || 0} ${item.strategy}${(item.count || 0) !== 1 ? 's' : ''} to contacts`}
                </p>
                {item.stats && (
                  <div className="flex items-center gap-4 text-xs">
                    <span className={textSecondary}>
                      Sent: <span className={`font-medium ${textPrimary}`}>{item.stats.sent || 0}</span>
                    </span>
                    {item.stats.delivered !== undefined && (
                      <span className={textSecondary}>
                        Delivered: <span className={`font-medium ${textPrimary}`}>{item.stats.delivered}</span>
                      </span>
                    )}
                    {item.stats.opened !== undefined && (
                      <span className={textSecondary}>
                        Opened: <span className={`font-medium ${textPrimary}`}>{item.stats.opened}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab({ campaign }: { campaign: Campaign }) {
  const { textPrimary, textSecondary } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  return (
    <div>
      <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>
        Performance Analytics
      </h3>
      <div className="space-y-6">
        {/* Engagement Rates */}
        <div>
          <h4 className={`text-sm font-medium ${textPrimary} mb-3`}>
            Engagement Rates
          </h4>
          <div className="space-y-3">
            {campaign.analytics.voicemailsSent && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className={textSecondary}>Voicemail Listen Rate</span>
                  <span className={`font-medium ${textPrimary}`}>
                    {Math.round(
                      ((campaign.analytics.voicemailsListened || 0) /
                        campaign.analytics.voicemailsSent) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className={`w-full ${isLight ? 'bg-gray-200' : 'bg-slate-700'} rounded-full h-2`}>
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        ((campaign.analytics.voicemailsListened || 0) /
                          campaign.analytics.voicemailsSent) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
            {campaign.analytics.emailsSent && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className={textSecondary}>Email Open Rate</span>
                  <span className={`font-medium ${textPrimary}`}>
                    {Math.round(
                      ((campaign.analytics.emailsOpened || 0) / campaign.analytics.emailsSent) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className={`w-full ${isLight ? 'bg-gray-200' : 'bg-slate-700'} rounded-full h-2`}>
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        ((campaign.analytics.emailsOpened || 0) / campaign.analytics.emailsSent) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conversion Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 ${isLight ? 'bg-blue-50' : 'bg-blue-900/20'} rounded-lg`}>
            <div className={`text-2xl font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'} mb-1`}>
              {campaign.analytics.responses}
            </div>
            <div className={`text-sm ${textSecondary}`}>Total Responses</div>
          </div>
          <div className={`p-4 ${isLight ? 'bg-green-50' : 'bg-green-900/20'} rounded-lg`}>
            <div className={`text-2xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'} mb-1`}>
              {campaign.analytics.conversions}
            </div>
            <div className={`text-sm ${textSecondary}`}>Conversions</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StrategyStatusCard({
  name,
  active,
  sent,
  engaged,
  color,
}: {
  name: string;
  active: boolean;
  sent?: number;
  engaged?: number;
  color: string;
}) {
  const { textPrimary, textSecondary } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const borderClass = active
    ? isLight ? `border-${color}-200 bg-${color}-50` : `border-${color}-900/30 bg-${color}-900/10`
    : isLight ? 'border-gray-200 bg-gray-50' : 'border-slate-700 bg-slate-800';

  return (
    <div className={`p-4 rounded-lg border-2 ${borderClass} ${!active ? 'opacity-60' : ''}`}>
      <div className={`text-sm font-medium ${textPrimary} mb-2`}>{name}</div>
      {active && sent ? (
        <div className="space-y-1">
          <div className={`text-xs ${textSecondary}`}>
            Sent: <span className="font-semibold">{sent}</span>
          </div>
          {engaged !== undefined && (
            <div className={`text-xs ${textSecondary}`}>
              Engaged: <span className="font-semibold">{engaged}</span>
            </div>
          )}
        </div>
      ) : (
        <div className={`text-xs ${textSecondary}`}>Inactive</div>
      )}
    </div>
  );
}

