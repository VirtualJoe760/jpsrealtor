// app/agent/campaigns/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import AgentNav from '@/app/components/AgentNav';
import CampaignCard from '@/app/components/campaigns/CampaignCard';
import CampaignDetailPanel from '@/app/components/campaigns/CampaignDetailPanel';
import CampaignFilters from '@/app/components/campaigns/CampaignFilters';
import DeleteCampaignModal from '@/app/components/campaigns/DeleteCampaignModal';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import { toast } from 'react-toastify';

// Mock data - used as fallback
const mockCampaigns = [
  {
    id: '1',
    name: 'PDCC Expired Listings - Q1 2026',
    type: 'neighborhood_expireds',
    neighborhood: 'PDCC',
    status: 'active' as const,
    totalContacts: 150,
    activeStrategies: {
      voicemail: true,
      email: true,
      text: false,
    },
    analytics: {
      voicemailsSent: 150,
      voicemailsListened: 87,
      emailsSent: 148,
      emailsOpened: 92,
      textsSent: 0,
      responses: 12,
      conversions: 2,
    },
    createdAt: '2026-01-10T10:00:00Z',
    lastActivity: '2026-01-15T14:32:00Z',
  },
  {
    id: '2',
    name: 'Sphere of Influence - Monthly Update',
    type: 'sphere_of_influence',
    status: 'active' as const,
    totalContacts: 250,
    activeStrategies: {
      voicemail: false,
      email: true,
      text: true,
    },
    analytics: {
      voicemailsSent: 0,
      voicemailsListened: 0,
      emailsSent: 250,
      emailsOpened: 178,
      textsSent: 250,
      textsDelivered: 245,
      responses: 8,
      conversions: 0,
    },
    createdAt: '2026-01-05T09:00:00Z',
    lastActivity: '2026-01-16T11:20:00Z',
  },
  {
    id: '3',
    name: 'Indian Wells High Equity',
    type: 'high_equity',
    neighborhood: 'Indian Wells',
    status: 'paused' as const,
    totalContacts: 89,
    activeStrategies: {
      voicemail: true,
      email: true,
      text: false,
    },
    analytics: {
      voicemailsSent: 89,
      voicemailsListened: 34,
      emailsSent: 89,
      emailsOpened: 45,
      textsSent: 0,
      responses: 5,
      conversions: 1,
    },
    createdAt: '2025-12-20T14:00:00Z',
    lastActivity: '2026-01-10T16:45:00Z',
  },
  {
    id: '4',
    name: 'Past Clients - Quarterly Check-in',
    type: 'past_clients',
    status: 'completed' as const,
    totalContacts: 320,
    activeStrategies: {
      voicemail: true,
      email: true,
      text: false,
    },
    analytics: {
      voicemailsSent: 320,
      voicemailsListened: 210,
      emailsSent: 320,
      emailsOpened: 256,
      textsSent: 0,
      responses: 45,
      conversions: 3,
    },
    createdAt: '2025-12-01T08:00:00Z',
    lastActivity: '2025-12-15T17:30:00Z',
  },
];

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'active' | 'paused' | 'completed' | 'draft';

export default function CampaignsPage() {
  const router = useRouter();
  const { cardBg, cardBorder, textPrimary, textSecondary, buttonPrimary, bgSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [loading, setLoading] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<typeof mockCampaigns[0] | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to refresh campaigns
  const refreshCampaigns = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Fetch campaigns from API
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/campaigns/list');
        const data = await response.json();

        if (data.success) {
          setCampaigns(data.campaigns);
          console.log('[CampaignsPage] Loaded campaigns with analytics:', data.campaigns.map((c: any) => ({
            name: c.name,
            voicemailsSent: c.analytics.voicemailsSent,
            voicemailsListened: c.analytics.voicemailsListened
          })));
        } else {
          console.error('Failed to fetch campaigns:', data.error);
          // Keep mock data as fallback
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        // Keep mock data as fallback
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [refreshTrigger]);

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus;
    const matchesSearch =
      searchQuery === '' ||
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId);

  // Delete handlers
  const handleDeleteClick = (campaign: typeof mockCampaigns[0]) => {
    setCampaignToDelete(campaign);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/campaigns/${campaignToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove campaign from list
        setCampaigns(campaigns.filter((c) => c.id !== campaignToDelete.id));
        // Close modal
        setDeleteModalOpen(false);
        setCampaignToDelete(null);
        // Close detail panel if this campaign was selected
        if (selectedCampaignId === campaignToDelete.id) {
          setSelectedCampaignId(null);
        }
        // Show success toast
        toast.success('Campaign deleted successfully');
      } else {
        console.error('Failed to delete campaign:', data.error);
        toast.error('Failed to delete campaign: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Error deleting campaign. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setCampaignToDelete(null);
  };

  return (
    <div className="min-h-screen py-8" data-page="campaigns">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Agent Navigation */}
        <AgentNav />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className={`text-3xl font-bold ${textPrimary}`}>
                Campaigns
              </h1>
              <p className={`${textSecondary} mt-1`}>
                Manage your marketing campaigns across all channels
              </p>
            </div>
            <button
              onClick={() => router.push('/agent/campaigns/new')}
              className={`flex items-center gap-2 px-4 py-2.5 ${buttonPrimary} rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200`}
            >
              <PlusIcon className="w-5 h-5" />
              New Campaign
            </button>
          </div>

          {/* Search and Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${textSecondary}`} />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2.5 ${bgSecondary} ${border} rounded-lg focus:ring-2 ${isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'} focus:border-transparent transition-all ${textPrimary}`}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {/* Status Filter Tabs */}
              <div className={`flex items-center gap-1 ${cardBg} ${cardBorder} rounded-lg p-1`}>
                {(['all', 'active', 'paused', 'completed'] as FilterStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      filterStatus === status
                        ? `${isLight ? 'bg-blue-600' : 'bg-emerald-600'} text-white shadow-sm`
                        : `${textSecondary} ${isLight ? 'hover:bg-blue-50' : 'hover:bg-emerald-900/20'}`
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <div className={`flex items-center gap-1 ${cardBg} ${cardBorder} rounded-lg p-1`}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'grid'
                      ? `${isLight ? 'bg-blue-600' : 'bg-emerald-600'} text-white`
                      : `${textSecondary} ${isLight ? 'hover:bg-blue-50' : 'hover:bg-emerald-900/20'}`
                  }`}
                  title="Grid view"
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === 'list'
                      ? `${isLight ? 'bg-blue-600' : 'bg-emerald-600'} text-white`
                      : `${textSecondary} ${isLight ? 'hover:bg-blue-50' : 'hover:bg-emerald-900/20'}`
                  }`}
                  title="List view"
                >
                  <ListBulletIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 ${cardBg} ${cardBorder} rounded-lg ${isLight ? 'hover:bg-blue-50' : 'hover:bg-emerald-900/20'} transition-all`}
                title="Advanced filters"
              >
                <FunnelIcon className={`w-5 h-5 ${textSecondary}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <CampaignFilters />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Campaign Grid/List */}
        <div className="relative">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className={`text-center`}>
                <div className={`w-16 h-16 mx-auto mb-4 ${isLight ? 'border-blue-600' : 'border-emerald-500'} border-4 border-t-transparent rounded-full animate-spin`}></div>
                <p className={textSecondary}>Loading campaigns...</p>
              </div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className={`w-16 h-16 mx-auto mb-4 ${cardBg} rounded-full flex items-center justify-center`}>
                <Squares2X2Icon className={`w-8 h-8 ${textSecondary}`} />
              </div>
              <h3 className={`text-lg font-medium ${textPrimary} mb-2`}>
                No campaigns found
              </h3>
              <p className={`${textSecondary} mb-6`}>
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first campaign'}
              </p>
              <button
                onClick={() => router.push('/agent/campaigns/new')}
                className={`inline-flex items-center gap-2 px-4 py-2 ${buttonPrimary} rounded-lg font-medium transition-colors`}
              >
                <PlusIcon className="w-5 h-5" />
                Create Campaign
              </button>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'space-y-4'
              }
            >
              {filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  viewMode={viewMode}
                  isSelected={selectedCampaignId === campaign.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedCampaignId(campaign.id);
                  }}
                  onDelete={() => handleDeleteClick(campaign)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Campaign Detail Side Panel */}
        <AnimatePresence>
          {selectedCampaign && (
            <CampaignDetailPanel
              campaign={selectedCampaign}
              onClose={() => setSelectedCampaignId(null)}
              onRefresh={refreshCampaigns}
            />
          )}
        </AnimatePresence>

        {/* Delete Campaign Modal */}
        <DeleteCampaignModal
          isOpen={deleteModalOpen}
          campaignName={campaignToDelete?.name || ''}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
