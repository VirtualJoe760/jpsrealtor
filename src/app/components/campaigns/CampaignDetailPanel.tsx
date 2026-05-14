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
  AdjustmentsHorizontalIcon,
  CalendarIcon,
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

interface CampaignDetailPanelProps {
  campaign: Campaign;
  onClose: () => void;
  onRefresh?: () => void;
}

type Tab = 'overview' | 'contacts' | 'history' | 'manage' | 'analytics';

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
    { id: 'overview', label: 'Strategy', icon: ChartBarIcon },
    { id: 'contacts', label: 'Contacts', icon: UserGroupIcon },
    { id: 'history', label: 'Active', icon: ClockIcon },
    { id: 'manage', label: 'Manage', icon: AdjustmentsHorizontalIcon },
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
          {activeTab === 'manage' && <ManageTab campaign={campaign} onRefresh={onRefresh} />}
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

// ============================================================================
// ManageTab — list every ad campaign on Meta/Google linked to this parent.
// Catches orphans from failed launches that never persisted to AdCampaignRecord.
// Per-row actions: Delete (cascades on Meta + cleans DB), View in Ads Manager.
// ============================================================================
function ManageTab({ campaign, onRefresh }: { campaign: Campaign; onRefresh?: () => void }) {
  const { textPrimary, textSecondary, cardBg, cardBorder } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [extendingFor, setExtendingFor] = useState<{ id: string; name: string } | null>(null);
  const [extendDate, setExtendDate] = useState<string>('');
  const [submittingExtend, setSubmittingExtend] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'meta' | 'google' | 'youtube'>('all');

  // Filter runs by selected platform pill. 'all' shows everything.
  const visibleRuns = selectedPlatform === 'all'
    ? runs
    : runs.filter((r) => r.platform === selectedPlatform);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/ad-runs`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch (err) {
      console.error('[ManageTab] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [campaign.id]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleDelete = async (platform: string, externalId: string) => {
    setDeletingId(externalId);
    try {
      const res = await fetch(
        `/api/campaigns/${campaign.id}/ad-runs?platform=${platform}&externalId=${externalId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        toast.success('Campaign deleted');
        setRuns((prev) => prev.filter((r) => r.externalCampaignId !== externalId));
        onRefresh?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const handleToggleStatus = async (platform: string, externalId: string, currentStatus: string) => {
    // CAMPAIGN_PAUSED & PAUSED → resume to ACTIVE. Anything else → pause.
    const isPaused = currentStatus === 'PAUSED' || currentStatus === 'CAMPAIGN_PAUSED';
    const next = isPaused ? 'ACTIVE' : 'PAUSED';
    setTogglingId(externalId);
    try {
      const res = await fetch(
        `/api/campaigns/${campaign.id}/ad-runs?platform=${platform}&externalId=${externalId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        }
      );
      if (res.ok) {
        toast.success(next === 'PAUSED' ? 'Campaign paused' : 'Campaign resumed');
        fetchRuns();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Update failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmitExtend = async (platform: string, externalId: string) => {
    if (!extendDate) {
      toast.error('Pick an end date first');
      return;
    }
    // Convert YYYY-MM-DD → ISO with end-of-day in local TZ
    const iso = new Date(`${extendDate}T23:59:59`).toISOString();
    setSubmittingExtend(true);
    try {
      const res = await fetch(
        `/api/campaigns/${campaign.id}/ad-runs?platform=${platform}&externalId=${externalId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endTime: iso }),
        }
      );
      if (res.ok) {
        toast.success('End date updated');
        setExtendingFor(null);
        setExtendDate('');
        fetchRuns();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Update failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSubmittingExtend(false);
    }
  };

  const handleDeleteAllOrphans = async () => {
    const orphans = runs.filter((r) => r.isOrphan);
    if (orphans.length === 0) return;
    setBulkDeleting(true);
    setBulkProgress({ done: 0, total: orphans.length });
    let failed = 0;
    for (let i = 0; i < orphans.length; i++) {
      const r = orphans[i];
      try {
        const res = await fetch(
          `/api/campaigns/${campaign.id}/ad-runs?platform=meta&externalId=${r.externalCampaignId}`,
          { method: 'DELETE' }
        );
        if (!res.ok) failed++;
      } catch {
        failed++;
      }
      setBulkProgress({ done: i + 1, total: orphans.length });
    }
    setBulkDeleting(false);
    setBulkProgress(null);
    setConfirmBulkDelete(false);
    if (failed === 0) {
      toast.success(`Deleted ${orphans.length} orphan campaign${orphans.length === 1 ? '' : 's'}`);
    } else {
      toast.error(`Deleted ${orphans.length - failed} · ${failed} failed`);
    }
    fetchRuns();
    onRefresh?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${isLight ? 'border-blue-600' : 'border-emerald-500'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className={`text-lg font-semibold ${textPrimary}`}>Ad Campaigns</h3>
          <p className={`text-sm ${textSecondary}`}>
            All Meta and Google ad campaigns linked to this {campaign.neighborhood || 'campaign'}.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {runs.filter((r) => r.isOrphan).length > 0 && (
            <button
              onClick={() => setConfirmBulkDelete(true)}
              disabled={bulkDeleting}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium text-white disabled:opacity-50 ${isLight ? 'bg-red-600 hover:bg-red-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              Delete {runs.filter((r) => r.isOrphan).length} orphan{runs.filter((r) => r.isOrphan).length === 1 ? '' : 's'}
            </button>
          )}
          <button
            onClick={fetchRuns}
            className={`px-3 py-1.5 text-sm rounded-lg ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-slate-700 hover:bg-slate-600 text-gray-200'}`}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Platform filter pills */}
      <PlatformPills
        runs={runs}
        selected={selectedPlatform}
        onChange={setSelectedPlatform}
        isLight={isLight}
      />

      {runs.length === 0 ? (
        <div className={`${cardBg} ${cardBorder} rounded-lg p-8 text-center`}>
          <p className={`text-sm ${textSecondary}`}>
            No ad campaigns found for this campaign. Launch one from the Strategy tab.
          </p>
        </div>
      ) : visibleRuns.length === 0 ? (
        <div className={`${cardBg} ${cardBorder} rounded-lg p-8 text-center`}>
          <p className={`text-sm ${textSecondary}`}>
            No {selectedPlatform === 'meta' ? 'Meta' : selectedPlatform === 'google' ? 'Google' : 'YouTube'} campaigns
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleRuns.map((r) => {
            const isPaused = r.status === 'PAUSED' || r.status === 'CAMPAIGN_PAUSED';
            const statusColor = r.status === 'ACTIVE'
              ? isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-400'
              : isPaused
                ? isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400'
                : isLight ? 'bg-gray-100 text-gray-700' : 'bg-gray-900/30 text-gray-400';
            return (
              <div key={r.externalCampaignId} className={`${cardBg} ${cardBorder} rounded-lg p-3`}>
                {/* Top row: name + orphan badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium ${textPrimary} text-sm truncate`}>{r.name}</span>
                      {r.isOrphan && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${isLight ? 'bg-orange-100 text-orange-700' : 'bg-orange-900/30 text-orange-400'}`}>
                          ORPHAN
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${textSecondary} font-mono mt-0.5`}>{r.externalCampaignId}</div>
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${statusColor}`}>
                    {(r.status || '').replace('CAMPAIGN_', '')}
                  </span>
                </div>

                {/* Mid row: meta data */}
                <div className={`flex items-center gap-3 text-xs ${textSecondary} mb-2`}>
                  <span>
                    {r.dailyBudget ? `$${r.dailyBudget.toFixed(2)}/day` : r.lifetimeBudget ? `$${r.lifetimeBudget.toFixed(2)} total` : '—'}
                  </span>
                  <span>·</span>
                  <span>{r.createdTime ? new Date(r.createdTime).toLocaleDateString() : '—'}</span>
                </div>

                {/* Action row */}
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => handleToggleStatus(r.platform, r.externalCampaignId, r.status)}
                    disabled={togglingId === r.externalCampaignId}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium disabled:opacity-50 ${
                      isPaused
                        ? (isLight ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-green-900/20 text-green-400 hover:bg-green-900/40')
                        : (isLight ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-yellow-900/20 text-yellow-400 hover:bg-yellow-900/40')
                    }`}
                  >
                    {isPaused ? <PlayIcon className="w-3 h-3" /> : <PauseIcon className="w-3 h-3" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={() => {
                      setExtendingFor({ id: r.externalCampaignId, name: r.name });
                      setExtendDate('');
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${isLight ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-purple-900/20 text-purple-400 hover:bg-purple-900/40'}`}
                  >
                    <CalendarIcon className="w-3 h-3" />
                    Extend
                  </button>
                  <a
                    href={r.adsManagerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium ${isLight ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40'}`}
                  >
                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    Open
                  </a>
                  <button
                    onClick={() => setConfirmDelete({ id: r.externalCampaignId, name: r.name })}
                    disabled={deletingId === r.externalCampaignId}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium disabled:opacity-50 ${isLight ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-red-900/20 text-red-400 hover:bg-red-900/40'}`}
                  >
                    <TrashIcon className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk delete orphans modal */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`${cardBg} rounded-xl p-6 max-w-md w-full shadow-2xl`}>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
              Delete {runs.filter((r) => r.isOrphan).length} orphan campaign{runs.filter((r) => r.isOrphan).length === 1 ? '' : 's'}?
            </h3>
            <p className={`text-sm ${textSecondary} mb-4`}>
              This permanently deletes every campaign flagged as ORPHAN from Meta Ads Manager. Real (non-orphan) campaigns are skipped. This cannot be undone.
            </p>
            {bulkProgress && (
              <div className={`mb-4 p-3 rounded-lg ${isLight ? 'bg-gray-50' : 'bg-slate-800'}`}>
                <div className={`text-xs ${textSecondary} mb-1`}>
                  Deleting {bulkProgress.done} of {bulkProgress.total}...
                </div>
                <div className={`h-1.5 rounded-full ${isLight ? 'bg-gray-200' : 'bg-slate-700'} overflow-hidden`}>
                  <div
                    className="h-full bg-red-500 transition-all"
                    style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                disabled={bulkDeleting}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-slate-700 hover:bg-slate-600 text-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllOrphans}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend duration modal */}
      {extendingFor && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`${cardBg} rounded-xl p-6 max-w-md w-full shadow-2xl`}>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Set end date</h3>
            <p className={`text-sm ${textSecondary} mb-4`}>
              Update the end date for <span className={`font-medium ${textPrimary}`}>{extendingFor.name}</span>. This applies to all ad sets in the campaign.
            </p>
            <input
              type="date"
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className={`w-full px-3 py-2 rounded-lg border text-sm mb-4 ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-slate-600 bg-slate-700 text-white'}`}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setExtendingFor(null); setExtendDate(''); }}
                disabled={submittingExtend}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-slate-700 hover:bg-slate-600 text-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const row = runs.find((r) => r.externalCampaignId === extendingFor.id);
                  handleSubmitExtend(row?.platform || 'meta', extendingFor.id);
                }}
                disabled={submittingExtend || !extendDate}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {submittingExtend ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`${cardBg} rounded-xl p-6 max-w-md w-full shadow-2xl`}>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Delete this campaign?</h3>
            <p className={`text-sm ${textSecondary} mb-4`}>
              This permanently deletes <span className={`font-medium ${textPrimary}`}>{confirmDelete.name}</span> from Meta Ads Manager, including all ad sets, ads, and creatives. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-slate-700 hover:bg-slate-600 text-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const row = runs.find((r) => r.externalCampaignId === confirmDelete.id);
                  handleDelete(row?.platform || 'meta', confirmDelete.id);
                }}
                disabled={deletingId === confirmDelete.id}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                {deletingId === confirmDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ campaign }: { campaign: Campaign }) {
  const { textPrimary, textSecondary, cardBg, cardBorder } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [adMetrics, setAdMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [togglingPlatform, setTogglingPlatform] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'meta' | 'google' | 'youtube'>('all');

  const allPlatforms: any[] = adMetrics?.platforms || [];
  const visiblePlatforms = selectedPlatform === 'all'
    ? allPlatforms
    : allPlatforms.filter((p: any) => p.platform === selectedPlatform);

  const hasAds = campaign.activeStrategies.metaAds || campaign.activeStrategies.googleAds;

  const fetchAdMetrics = useCallback(async () => {
    if (!hasAds) return;
    setLoadingMetrics(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/ad-metrics`);
      if (res.ok) {
        const data = await res.json();
        setAdMetrics(data);
      }
    } catch (err) {
      console.error('[AnalyticsTab] Error fetching ad metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  }, [campaign.id, hasAds]);

  useEffect(() => { fetchAdMetrics(); }, [fetchAdMetrics]);

  const handleToggleStatus = async (platform: string, currentStatus: string) => {
    const action = ['ACTIVE', 'active'].includes(currentStatus) ? 'pause' : 'resume';
    setTogglingPlatform(platform);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/ad-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, action }),
      });
      if (res.ok) {
        toast.success(`${platform === 'meta' ? 'Meta' : 'Google'} campaign ${action === 'pause' ? 'paused' : 'resumed'}`);
        fetchAdMetrics();
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to ${action} campaign`);
      }
    } catch {
      toast.error('Network error');
    } finally {
      setTogglingPlatform(null);
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'ACTIVE') return isLight ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-400';
    if (s === 'PAUSED') return isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400';
    return isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-700 text-gray-400';
  };

  return (
    <div className="space-y-6">
      <h3 className={`text-lg font-semibold ${textPrimary}`}>
        Performance Analytics
      </h3>

      {/* Engagement Rates (voicemail/email) */}
      {(campaign.analytics.voicemailsSent || campaign.analytics.emailsSent) ? (
        <div>
          <h4 className={`text-sm font-medium ${textPrimary} mb-3`}>Engagement Rates</h4>
          <div className="space-y-3">
            {campaign.analytics.voicemailsSent ? (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className={textSecondary}>Voicemail Listen Rate</span>
                  <span className={`font-medium ${textPrimary}`}>
                    {Math.round(((campaign.analytics.voicemailsListened || 0) / campaign.analytics.voicemailsSent) * 100)}%
                  </span>
                </div>
                <div className={`w-full ${isLight ? 'bg-gray-200' : 'bg-slate-700'} rounded-full h-2`}>
                  <div className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${((campaign.analytics.voicemailsListened || 0) / campaign.analytics.voicemailsSent) * 100}%` }} />
                </div>
              </div>
            ) : null}
            {campaign.analytics.emailsSent ? (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className={textSecondary}>Email Open Rate</span>
                  <span className={`font-medium ${textPrimary}`}>
                    {Math.round(((campaign.analytics.emailsOpened || 0) / campaign.analytics.emailsSent) * 100)}%
                  </span>
                </div>
                <div className={`w-full ${isLight ? 'bg-gray-200' : 'bg-slate-700'} rounded-full h-2`}>
                  <div className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${((campaign.analytics.emailsOpened || 0) / campaign.analytics.emailsSent) * 100}%` }} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

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

      {/* ===== Ad Performance Section ===== */}
      {hasAds && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-sm font-medium ${textPrimary}`}>Ad Performance</h4>
            <button onClick={fetchAdMetrics} disabled={loadingMetrics}
              className={`text-xs px-2 py-1 rounded ${isLight ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' : 'bg-slate-700 hover:bg-slate-600 text-gray-300'} disabled:opacity-50`}>
              {loadingMetrics ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loadingMetrics && !adMetrics ? (
            <div className="flex items-center justify-center py-8">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isLight ? 'border-blue-600' : 'border-emerald-500'}`} />
            </div>
          ) : adMetrics?.platforms?.length > 0 ? (
            <div className="space-y-4">
              {/* Platform filter pills */}
              <PlatformPills
                runs={allPlatforms}
                selected={selectedPlatform}
                onChange={setSelectedPlatform}
                isLight={isLight}
              />
              {visiblePlatforms.length === 0 ? (
                <div className={`${cardBg} ${cardBorder} rounded-lg p-6 text-center`}>
                  <p className={`text-sm ${textSecondary}`}>
                    No {selectedPlatform === 'meta' ? 'Meta' : selectedPlatform === 'google' ? 'Google' : 'YouTube'} campaigns
                  </p>
                </div>
              ) : null}
              {visiblePlatforms.map((p: any) => (
                <div key={p.platform} className={`${cardBg} ${cardBorder} rounded-lg overflow-hidden`}>
                  {/* Platform Header */}
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    p.platform === 'meta'
                      ? isLight ? 'bg-pink-50' : 'bg-pink-900/10'
                      : isLight ? 'bg-blue-50' : 'bg-blue-900/10'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{p.platform === 'meta' ? '\uD83D\uDFE3' : '\uD83D\uDD35'}</span>
                      <div>
                        <h5 className={`font-semibold ${textPrimary}`}>
                          {p.platform === 'meta' ? 'Meta Ads' : 'Google Ads'}
                        </h5>
                        {p.name && <p className={`text-xs ${textSecondary}`}>{p.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(p.status)}`}>
                        {p.status?.toUpperCase() || 'UNKNOWN'}
                      </span>
                      {p.platform === 'meta' && p.status !== 'ERROR' && (
                        <button
                          onClick={() => handleToggleStatus(p.platform, p.status)}
                          disabled={togglingPlatform === p.platform}
                          className={`p-1.5 rounded-lg transition-colors ${
                            ['ACTIVE', 'active'].includes(p.status)
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                              : `${isLight ? 'bg-green-500 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white`
                          } disabled:opacity-50`}
                          title={['ACTIVE', 'active'].includes(p.status) ? 'Pause campaign' : 'Resume campaign'}
                        >
                          {togglingPlatform === p.platform ? (
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          ) : ['ACTIVE', 'active'].includes(p.status) ? (
                            <PauseIcon className="w-4 h-4" />
                          ) : (
                            <PlayIcon className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  {p.metrics && p.status !== 'ERROR' && (
                    <div className="p-4">
                      {/* Duration & Budget Row */}
                      <div className={`flex flex-wrap gap-4 text-sm mb-4 pb-3 border-b ${isLight ? 'border-gray-200' : 'border-slate-700'}`}>
                        {p.startDate && (
                          <div>
                            <span className={textSecondary}>Started: </span>
                            <span className={`font-medium ${textPrimary}`}>{new Date(p.startDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {p.daysRunning > 0 && (
                          <div>
                            <span className={textSecondary}>Running: </span>
                            <span className={`font-medium ${textPrimary}`}>{p.daysRunning} day{p.daysRunning !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        <div>
                          <span className={textSecondary}>Daily budget: </span>
                          <span className={`font-medium ${textPrimary}`}>${p.dailyBudget?.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="grid grid-cols-3 gap-3">
                        <MetricCard label="Impressions" value={p.metrics.impressions?.toLocaleString()} isLight={isLight} />
                        <MetricCard label="Clicks" value={p.metrics.clicks?.toLocaleString()} isLight={isLight} />
                        <MetricCard label="CTR" value={`${(p.metrics.ctr * 100).toFixed(2)}%`} isLight={isLight} />
                        <MetricCard label="CPC" value={`$${p.metrics.cpc?.toFixed(2)}`} isLight={isLight} />
                        <MetricCard label="Spend" value={`$${p.metrics.spend?.toFixed(2)}`} isLight={isLight} />
                        <MetricCard label="Conversions" value={p.metrics.conversions?.toLocaleString()} isLight={isLight} />
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {p.status === 'ERROR' && (
                    <div className={`p-4 text-sm ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                      {p.error || 'Failed to fetch metrics from platform'}
                    </div>
                  )}

                  {/* Ad Creative Preview */}
                  {p.creative && (
                    <div className={`px-4 pb-4`}>
                      <details className={`${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                        <summary className="text-xs font-medium cursor-pointer hover:opacity-80 mb-2">Ad Creative Preview</summary>
                        <div className={`p-3 rounded-lg ${isLight ? 'bg-gray-50 border border-gray-200' : 'bg-slate-700/50 border border-slate-600'}`}>
                          {p.creative.imageUrl && (
                            <img src={p.creative.imageUrl} alt="Ad creative" className="w-full max-h-32 object-cover rounded mb-2" />
                          )}
                          {p.creative.headline && (
                            <p className={`font-semibold text-sm ${textPrimary}`}>{p.creative.headline}</p>
                          )}
                          {(p.creative.headlines || []).length > 0 && (
                            <p className={`font-semibold text-sm ${textPrimary}`}>{p.creative.headlines.filter(Boolean).join(' | ')}</p>
                          )}
                          {p.creative.primaryText && (
                            <p className={`text-xs ${textSecondary} mt-1`}>{p.creative.primaryText}</p>
                          )}
                          {(p.creative.descriptions || []).length > 0 && (
                            <p className={`text-xs ${textSecondary} mt-1`}>{p.creative.descriptions.filter(Boolean).join(' ')}</p>
                          )}
                          {p.creative.landingPageUrl && (
                            <p className={`text-xs mt-1 ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>{p.creative.landingPageUrl}</p>
                          )}
                          {p.creative.placements?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {p.creative.placements.map((pl: string) => (
                                <span key={pl} className={`text-xs px-2 py-0.5 rounded-full ${isLight ? 'bg-gray-200 text-gray-600' : 'bg-slate-600 text-gray-300'}`}>
                                  {pl.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Ads Manager Link */}
                  {p.managerUrl && (
                    <div className={`px-4 pb-3`}>
                      <a href={p.managerUrl} target="_blank" rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          p.platform === 'meta'
                            ? isLight ? 'text-pink-600 hover:text-pink-700' : 'text-pink-400 hover:text-pink-300'
                            : isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                        }`}>
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                        View in {p.platform === 'meta' ? 'Meta' : 'Google'} Ads Manager
                      </a>
                    </div>
                  )}
                </div>
              ))}

              {/* Total Spend Summary */}
              {adMetrics.totalSpend > 0 && (
                <div className={`p-3 rounded-lg text-center ${isLight ? 'bg-gray-50 border border-gray-200' : 'bg-slate-700/50 border border-slate-600'}`}>
                  <span className={`text-sm ${textSecondary}`}>Total ad spend: </span>
                  <span className={`font-bold ${textPrimary}`}>${adMetrics.totalSpend.toFixed(2)}</span>
                </div>
              )}
            </div>
          ) : (
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6 text-center`}>
              <ChartBarIcon className={`w-10 h-10 ${textSecondary} mx-auto mb-2`} />
              <p className={`text-sm ${textSecondary}`}>No ad metrics available yet. Launch ads from the campaign wizard to see performance data here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// PlatformPills — All / Meta / Google / YouTube filter row.
// Used by both ManageTab (filters `runs`) and AnalyticsTab (filters `platforms`).
// Each pill shows a count of rows for that platform.
function PlatformPills({
  runs,
  selected,
  onChange,
  isLight,
}: {
  runs: any[];
  selected: 'all' | 'meta' | 'google' | 'youtube';
  onChange: (p: 'all' | 'meta' | 'google' | 'youtube') => void;
  isLight: boolean;
}) {
  const counts = {
    all: runs.length,
    meta: runs.filter((r) => r.platform === 'meta').length,
    google: runs.filter((r) => r.platform === 'google').length,
    youtube: runs.filter((r) => r.platform === 'youtube').length,
  };
  const pills: { key: 'all' | 'meta' | 'google' | 'youtube'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'meta', label: 'Meta' },
    { key: 'google', label: 'Google' },
    { key: 'youtube', label: 'YouTube' },
  ];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {pills.map((p) => {
        const active = selected === p.key;
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
              active
                ? isLight
                  ? 'bg-blue-600 text-white'
                  : 'bg-emerald-600 text-white'
                : isLight
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            {p.label} <span className="opacity-70">({counts[p.key]})</span>
          </button>
        );
      })}
    </div>
  );
}

function MetricCard({ label, value, isLight }: { label: string; value: string; isLight: boolean }) {
  return (
    <div className={`p-2.5 rounded-lg text-center ${isLight ? 'bg-gray-50' : 'bg-slate-700/30'}`}>
      <div className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>{value}</div>
      <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{label}</div>
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

