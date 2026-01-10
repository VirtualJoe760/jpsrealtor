/**
 * Label Analytics Dashboard
 *
 * Shows statistics and insights about label usage.
 * Part of Phase 4: Campaign Integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  TagIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

interface Label {
  _id: string;
  name: string;
  color: string;
  contactCount: number;
  isSystem: boolean;
}

interface LabelAnalyticsDashboardProps {
  className?: string;
}

export default function LabelAnalyticsDashboard({ className = '' }: LabelAnalyticsDashboardProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Calculate statistics
  const totalContacts = labels.reduce((sum, l) => sum + l.contactCount, 0);
  const activeLabels = labels.filter(l => l.contactCount > 0).length;
  const topLabels = [...labels]
    .sort((a, b) => b.contactCount - a.contactCount)
    .slice(0, 5);
  const systemLabels = labels.filter(l => l.isSystem);
  const customLabels = labels.filter(l => !l.isSystem);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Label Analytics</h2>
        <p className="text-gray-600 mt-1">
          Insights about your contact organization
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TagIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {labels.length}
              </div>
              <div className="text-sm text-gray-600">Total Labels</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {totalContacts.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Contacts</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {activeLabels}
              </div>
              <div className="text-sm text-gray-600">Active Labels</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {totalContacts > 0 ? Math.round(totalContacts / activeLabels) : 0}
              </div>
              <div className="text-sm text-gray-600">Avg per Label</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Labels */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Labels by Contact Count
        </h3>
        <div className="space-y-3">
          {topLabels.map((label, index) => {
            const percentage = totalContacts > 0
              ? (label.contactCount / totalContacts) * 100
              : 0;

            return (
              <div key={label._id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">
                      #{index + 1}
                    </span>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="font-medium text-gray-900">
                      {label.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {label.contactCount} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: label.color,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {topLabels.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No labels with contacts yet
            </div>
          )}
        </div>
      </div>

      {/* Label Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System vs Custom */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            System vs Custom Labels
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-medium text-blue-900">System Labels</span>
              <span className="text-2xl font-bold text-blue-900">
                {systemLabels.length}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="font-medium text-purple-900">Custom Labels</span>
              <span className="text-2xl font-bold text-purple-900">
                {customLabels.length}
              </span>
            </div>
          </div>
        </div>

        {/* Contact Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Contact Distribution
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-green-900">Labeled Contacts</span>
              <span className="text-2xl font-bold text-green-900">
                {totalContacts.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900">Empty Labels</span>
              <span className="text-2xl font-bold text-gray-900">
                {labels.filter(l => l.contactCount === 0).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
