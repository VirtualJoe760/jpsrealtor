/**
 * Label Campaign Card
 *
 * Displays a label with contact count and quick action to create a campaign.
 * Part of Phase 4: Campaign Integration
 */

'use client';

import React, { useState } from 'react';
import {
  TagIcon,
  PhoneIcon,
  PlusCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface Label {
  _id: string;
  name: string;
  description?: string;
  color: string;
  contactCount: number;
}

interface LabelCampaignCardProps {
  label: Label;
  onCreateCampaign?: (labelId: string) => void;
  showStats?: boolean;
}

export default function LabelCampaignCard({
  label,
  onCreateCampaign,
  showStats = true,
}: LabelCampaignCardProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [campaignName, setCampaignName] = useState(`${label.name} Campaign`);

  const handleCreateCampaign = async () => {
    setIsCreating(true);

    try {
      const response = await fetch(`/api/crm/labels/${label._id}/create-campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          campaignType: 'custom',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create campaign');
      }

      // Call callback if provided
      onCreateCampaign?.(label._id);

      // Navigate to campaign
      router.push(`/campaigns/${data.campaign._id}`);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      alert(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="bg-white rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all p-6"
      style={{ borderLeftColor: label.color, borderLeftWidth: '6px' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3 flex-1">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: label.color }}
          >
            <TagIcon className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{label.name}</h3>
            {label.description && (
              <p className="text-sm text-gray-600 mt-1">{label.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <PhoneIcon className="h-5 w-5 text-gray-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {label.contactCount}
                </div>
                <div className="text-xs text-gray-600">Contacts</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="h-5 w-5 text-gray-600" />
              <div>
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-xs text-gray-600">Campaigns</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Name Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Campaign Name
        </label>
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter campaign name"
        />
      </div>

      {/* Actions */}
      <button
        onClick={handleCreateCampaign}
        disabled={isCreating || label.contactCount === 0 || !campaignName.trim()}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {isCreating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            <span>Creating Campaign...</span>
          </>
        ) : (
          <>
            <PlusCircleIcon className="h-5 w-5" />
            <span>Create Campaign ({label.contactCount} contacts)</span>
          </>
        )}
      </button>

      {label.contactCount === 0 && (
        <p className="text-xs text-gray-500 text-center mt-2">
          Add contacts to this label first
        </p>
      )}
    </div>
  );
}
