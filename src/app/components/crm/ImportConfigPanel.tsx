/**
 * Import Configuration Panel
 *
 * Allows users to configure import settings based on analysis results.
 * Part of the Prospect Discovery feature.
 *
 * Settings:
 * - Skip contacts with emoji in names
 * - Skip organization-only contacts
 * - Skip duplicate phone numbers
 * - Skip junk entries
 * - Auto-clean names (remove special chars, slashes)
 * - Normalize phone numbers to E.164
 * - Merge strategy for existing contacts
 */

'use client';

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface ImportConfig {
  skipEmoji: boolean;
  skipOrganizationOnly: boolean;
  skipDuplicates: boolean;
  skipJunk: boolean;
  autoCleanNames: boolean;
  normalizePhones: boolean;
  mergeStrategy: 'skip' | 'update' | 'create_duplicate';
}

interface ImportConfigPanelProps {
  analysis: {
    totalRows: number;
    dataQualityIssues: {
      emojiInName: number;
      organizationOnly: number;
      duplicates: number;
      junkEntries: number;
      specialCharactersInName: number;
      invalidPhoneFormat: number;
    };
  };
  initialConfig?: Partial<ImportConfig>;
  onSave?: (config: ImportConfig) => void;
  onCancel?: () => void;
}

export default function ImportConfigPanel({
  analysis,
  initialConfig,
  onSave,
  onCancel,
}: ImportConfigPanelProps) {
  const [config, setConfig] = useState<ImportConfig>({
    skipEmoji: initialConfig?.skipEmoji ?? true,
    skipOrganizationOnly: initialConfig?.skipOrganizationOnly ?? false,
    skipDuplicates: initialConfig?.skipDuplicates ?? true,
    skipJunk: initialConfig?.skipJunk ?? true,
    autoCleanNames: initialConfig?.autoCleanNames ?? true,
    normalizePhones: initialConfig?.normalizePhones ?? true,
    mergeStrategy: initialConfig?.mergeStrategy ?? 'skip',
  });

  const { dataQualityIssues } = analysis;

  // Calculate how many contacts will be imported based on config
  const calculateImportCount = () => {
    let count = analysis.totalRows;

    if (config.skipEmoji) count -= dataQualityIssues.emojiInName;
    if (config.skipOrganizationOnly) count -= dataQualityIssues.organizationOnly;
    if (config.skipDuplicates) count -= dataQualityIssues.duplicates;
    if (config.skipJunk) count -= dataQualityIssues.junkEntries;

    return Math.max(0, count);
  };

  const importCount = calculateImportCount();
  const skipCount = analysis.totalRows - importCount;

  const handleToggle = (key: keyof ImportConfig) => {
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleMergeStrategyChange = (strategy: 'skip' | 'update' | 'create_duplicate') => {
    setConfig(prev => ({
      ...prev,
      mergeStrategy: strategy,
    }));
  };

  const handleSave = () => {
    onSave?.(config);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3">
          <Cog6ToothIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Import Configuration</h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure how contacts should be imported
            </p>
          </div>
        </div>
      </div>

      {/* Import Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-900">{analysis.totalRows.toLocaleString()}</div>
            <div className="text-sm text-blue-700 mt-1">Total in CSV</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{importCount.toLocaleString()}</div>
            <div className="text-sm text-green-700 mt-1">Will Import</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{skipCount.toLocaleString()}</div>
            <div className="text-sm text-yellow-700 mt-1">Will Skip</div>
          </div>
        </div>
      </div>

      {/* Skip Options */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Skip Contacts</h3>
        <div className="space-y-4">
          {/* Skip Emoji */}
          {dataQualityIssues.emojiInName > 0 && (
            <label className="flex items-start p-4 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="checkbox"
                checked={config.skipEmoji}
                onChange={() => handleToggle('skipEmoji')}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Skip contacts with emoji in names</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {dataQualityIssues.emojiInName} contacts
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Personal contacts often have emoji (e.g., "🔥John Smith🔥"). Skip these for business use.
                </p>
              </div>
            </label>
          )}

          {/* Skip Junk */}
          {dataQualityIssues.junkEntries > 0 && (
            <label className="flex items-start p-4 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="checkbox"
                checked={config.skipJunk}
                onChange={() => handleToggle('skipJunk')}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Skip junk entries</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {dataQualityIssues.junkEntries} contacts
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Test numbers (555-555-5555), spam, and obviously fake entries.
                </p>
              </div>
            </label>
          )}

          {/* Skip Duplicates */}
          {dataQualityIssues.duplicates > 0 && (
            <label className="flex items-start p-4 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="checkbox"
                checked={config.skipDuplicates}
                onChange={() => handleToggle('skipDuplicates')}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Skip duplicate phone numbers</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {dataQualityIssues.duplicates} contacts
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Prevent importing the same phone number multiple times.
                </p>
              </div>
            </label>
          )}

          {/* Skip Organization Only */}
          {dataQualityIssues.organizationOnly > 0 && (
            <label className="flex items-start p-4 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
              <input
                type="checkbox"
                checked={config.skipOrganizationOnly}
                onChange={() => handleToggle('skipOrganizationOnly')}
                className="mt-1 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Skip organization-only contacts</span>
                  <span className="text-sm text-gray-500 ml-2">
                    {dataQualityIssues.organizationOnly} contacts
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Contacts with only organization name, no person name.
                </p>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Auto-Fix Options */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Automatic Cleanup</h3>
        <div className="space-y-4">
          {/* Auto-clean Names */}
          {dataQualityIssues.specialCharactersInName > 0 && (
            <label className="flex items-start p-4 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-green-300 transition-colors">
              <input
                type="checkbox"
                checked={config.autoCleanNames}
                onChange={() => handleToggle('autoCleanNames')}
                className="mt-1 h-5 w-5 text-green-600 rounded focus:ring-green-500"
              />
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Automatically clean names</span>
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Remove special characters, leading slashes, and extra whitespace from names.
                </p>
              </div>
            </label>
          )}

          {/* Normalize Phones */}
          {dataQualityIssues.invalidPhoneFormat > 0 && (
            <label className="flex items-start p-4 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-green-300 transition-colors">
              <input
                type="checkbox"
                checked={config.normalizePhones}
                onChange={() => handleToggle('normalizePhones')}
                className="mt-1 h-5 w-5 text-green-600 rounded focus:ring-green-500"
              />
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">Normalize phone numbers</span>
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Convert all phone numbers to E.164 format (e.g., +17603333676).
                </p>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Duplicate Handling Strategy */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Contacts</h3>
        <p className="text-sm text-gray-600 mb-4">
          How should we handle contacts that already exist in your database?
        </p>
        <div className="space-y-3">
          <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${
            config.mergeStrategy === 'skip'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}>
            <input
              type="radio"
              checked={config.mergeStrategy === 'skip'}
              onChange={() => handleMergeStrategyChange('skip')}
              className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500"
            />
            <div className="ml-4 flex-1">
              <div className="font-medium text-gray-900">Skip existing contacts</div>
              <p className="text-sm text-gray-600 mt-1">
                Don't import if phone number already exists (recommended).
              </p>
            </div>
          </label>

          <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${
            config.mergeStrategy === 'update'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}>
            <input
              type="radio"
              checked={config.mergeStrategy === 'update'}
              onChange={() => handleMergeStrategyChange('update')}
              className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500"
            />
            <div className="ml-4 flex-1">
              <div className="font-medium text-gray-900">Update existing contacts</div>
              <p className="text-sm text-gray-600 mt-1">
                Merge new data with existing contacts (overwrites current data).
              </p>
            </div>
          </label>

          <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${
            config.mergeStrategy === 'create_duplicate'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-blue-300'
          }`}>
            <input
              type="radio"
              checked={config.mergeStrategy === 'create_duplicate'}
              onChange={() => handleMergeStrategyChange('create_duplicate')}
              className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500"
            />
            <div className="ml-4 flex-1">
              <div className="font-medium text-gray-900">Create duplicate entries</div>
              <p className="text-sm text-gray-600 mt-1">
                Import anyway, even if duplicate (not recommended).
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        )}
        {onSave && (
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            Start Import ({importCount.toLocaleString()} contacts)
          </button>
        )}
      </div>
    </div>
  );
}
