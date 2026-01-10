/**
 * Label Campaign Grid
 *
 * Displays all labels in a grid with campaign creation actions.
 * Main interface for Label → Campaign Integration (Phase 4)
 */

'use client';

import React, { useState, useEffect } from 'react';
import LabelCampaignCard from './LabelCampaignCard';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';

interface Label {
  _id: string;
  name: string;
  description?: string;
  color: string;
  contactCount: number;
  isSystem: boolean;
}

interface LabelCampaignGridProps {
  onCreateLabel?: () => void;
}

export default function LabelCampaignGrid({ onCreateLabel }: LabelCampaignGridProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'system' | 'custom'>('all');

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      const response = await fetch('/api/crm/labels');
      const data = await response.json();

      if (data.success) {
        setLabels(data.labels);
      }
    } catch (error) {
      console.error('Error fetching labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLabels = labels.filter(label => {
    if (filter === 'system') return label.isSystem;
    if (filter === 'custom') return !label.isSystem;
    return true;
  }).filter(label => label.contactCount > 0); // Only show labels with contacts

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create Campaigns from Labels</h2>
          <p className="text-gray-600 mt-1">
            Select a label to create a targeted calling campaign
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Labels</option>
            <option value="system">System Labels</option>
            <option value="custom">Custom Labels</option>
          </select>

          {/* Create Label Button */}
          {onCreateLabel && (
            <button
              onClick={onCreateLabel}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>New Label</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-900">
              {labels.length}
            </div>
            <div className="text-sm text-blue-700">Total Labels</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-900">
              {labels.reduce((sum, l) => sum + l.contactCount, 0).toLocaleString()}
            </div>
            <div className="text-sm text-blue-700">Total Contacts</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-900">
              {filteredLabels.length}
            </div>
            <div className="text-sm text-blue-700">Ready for Campaigns</div>
          </div>
        </div>
      </div>

      {/* Label Grid */}
      {filteredLabels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLabels.map((label) => (
            <LabelCampaignCard
              key={label._id}
              label={label}
              onCreateCampaign={() => {
                // Refresh labels after campaign creation
                fetchLabels();
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FunnelIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Labels with Contacts
          </h3>
          <p className="text-gray-600 mb-4">
            {filter === 'all'
              ? 'Create labels and add contacts to them first'
              : `No ${filter} labels have contacts yet`}
          </p>
          {onCreateLabel && (
            <button
              onClick={onCreateLabel}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Your First Label</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
