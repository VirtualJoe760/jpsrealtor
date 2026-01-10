/**
 * Label Selector Component
 *
 * Multi-select label filter for campaign contact selection.
 * Can be integrated into existing campaign builders.
 * Part of Phase 4: Campaign Integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { TagIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Label {
  _id: string;
  name: string;
  color: string;
  contactCount: number;
}

interface LabelSelectorProps {
  selectedLabels: string[];
  onSelectionChange: (labelIds: string[]) => void;
  allowMultiple?: boolean;
  showContactCounts?: boolean;
  className?: string;
}

export default function LabelSelector({
  selectedLabels,
  onSelectionChange,
  allowMultiple = true,
  showContactCounts = true,
  className = '',
}: LabelSelectorProps) {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    try {
      const response = await fetch('/api/crm/labels');
      const data = await response.json();

      if (data.success) {
        setLabels(data.labels.filter((l: Label) => l.contactCount > 0));
      }
    } catch (error) {
      console.error('Error fetching labels:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLabel = (labelId: string) => {
    if (allowMultiple) {
      // Multi-select mode
      if (selectedLabels.includes(labelId)) {
        onSelectionChange(selectedLabels.filter(id => id !== labelId));
      } else {
        onSelectionChange([...selectedLabels, labelId]);
      }
    } else {
      // Single-select mode
      onSelectionChange([labelId]);
    }
  };

  const clearSelection = () => {
    onSelectionChange([]);
  };

  const filteredLabels = labels.filter(label =>
    label.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalContacts = labels
    .filter(l => selectedLabels.includes(l._id))
    .reduce((sum, l) => sum + l.contactCount, 0);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded" />
            <div className="h-8 bg-gray-200 rounded" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <TagIcon className="h-5 w-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filter by Label</h3>
          </div>
          {selectedLabels.length > 0 && (
            <button
              onClick={clearSelection}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search labels..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Selected Summary */}
      {selectedLabels.length > 0 && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedLabels.length} label{selectedLabels.length > 1 ? 's' : ''} selected
            </span>
            {showContactCounts && (
              <span className="text-sm font-bold text-blue-900">
                {totalContacts.toLocaleString()} contacts
              </span>
            )}
          </div>
        </div>
      )}

      {/* Label List */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {filteredLabels.length > 0 ? (
          <div className="space-y-2">
            {filteredLabels.map((label) => {
              const isSelected = selectedLabels.includes(label._id);

              return (
                <button
                  key={label._id}
                  onClick={() => toggleLabel(label._id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    {/* Color Indicator */}
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: label.color }}
                    />

                    {/* Label Name */}
                    <span className={`font-medium flex-1 text-left ${
                      isSelected ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {label.name}
                    </span>

                    {/* Contact Count */}
                    {showContactCounts && (
                      <span className="text-sm text-gray-500">
                        {label.contactCount}
                      </span>
                    )}

                    {/* Checkmark */}
                    {isSelected && (
                      <CheckIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No labels match your search' : 'No labels with contacts found'}
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredLabels.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600">
            {allowMultiple
              ? 'Select multiple labels to combine contacts from different groups'
              : 'Select one label to filter contacts'}
          </p>
        </div>
      )}
    </div>
  );
}
