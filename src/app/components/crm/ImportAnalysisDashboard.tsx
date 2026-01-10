/**
 * Import Analysis Dashboard
 *
 * Displays comprehensive analysis of CSV data quality before importing.
 * Part of the Prospect Discovery feature.
 *
 * Shows:
 * - Overall quality score
 * - Issue breakdown with counts and percentages
 * - Examples of problematic data
 * - Recommended actions
 */

'use client';

import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface AnalysisReport {
  totalRows: number;
  qualityScore: number;
  dataQualityIssues: {
    noName: number;
    noPhone: number;
    multiplePhones: number;
    multipleEmails: number;
    invalidPhoneFormat: number;
    emojiInName: number;
    organizationOnly: number;
    duplicates: number;
    junkEntries: number;
    specialCharactersInName: number;
  };
  phoneFormatExamples: string[];
  emailFormatExamples: string[];
  organizationOnlyExamples: string[];
  multiplePhoneExamples: Array<{ contact: string; phones: string[] }>;
  emojiExamples: string[];
  junkExamples: string[];
  recommendedActions: string[];
}

interface ImportAnalysisDashboardProps {
  analysis: AnalysisReport;
  fileName: string;
  onProceed?: () => void;
  onCancel?: () => void;
}

export default function ImportAnalysisDashboard({
  analysis,
  fileName,
  onProceed,
  onCancel,
}: ImportAnalysisDashboardProps) {
  const { totalRows, qualityScore, dataQualityIssues, recommendedActions } = analysis;

  // Calculate total issues
  const totalIssues = Object.values(dataQualityIssues).reduce((sum, count) => sum + count, 0);

  // Determine quality level
  const getQualityLevel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' };
    if (score >= 60) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (score >= 40) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const qualityLevel = getQualityLevel(qualityScore);

  // Issue display config
  const issueConfig = [
    { key: 'noPhone', label: 'No Phone Number', severity: 'critical', icon: XCircleIcon },
    { key: 'noName', label: 'No Name', severity: 'critical', icon: XCircleIcon },
    { key: 'junkEntries', label: 'Junk Entries', severity: 'critical', icon: XCircleIcon },
    { key: 'duplicates', label: 'Duplicate Phone Numbers', severity: 'warning', icon: ExclamationTriangleIcon },
    { key: 'invalidPhoneFormat', label: 'Invalid Phone Format', severity: 'warning', icon: ExclamationTriangleIcon },
    { key: 'multiplePhones', label: 'Multiple Phones', severity: 'info', icon: ExclamationTriangleIcon },
    { key: 'multipleEmails', label: 'Multiple Emails', severity: 'info', icon: ExclamationTriangleIcon },
    { key: 'emojiInName', label: 'Emoji in Name', severity: 'warning', icon: ExclamationTriangleIcon },
    { key: 'organizationOnly', label: 'Organization Only', severity: 'info', icon: ExclamationTriangleIcon },
    { key: 'specialCharactersInName', label: 'Special Characters in Name', severity: 'info', icon: ExclamationTriangleIcon },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Contact Import Analysis</h2>
            <p className="text-sm text-gray-500 mt-1">
              Analyzing <span className="font-semibold">{fileName}</span>
            </p>
          </div>
          <div className={`px-6 py-4 rounded-lg ${qualityLevel.bg}`}>
            <div className="text-center">
              <div className={`text-4xl font-bold ${qualityLevel.color}`}>{qualityScore}</div>
              <div className={`text-sm font-medium ${qualityLevel.color} mt-1`}>
                {qualityLevel.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-blue-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Contacts</p>
              <p className="text-2xl font-bold text-gray-900">{totalRows.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Issues</p>
              <p className="text-2xl font-bold text-gray-900">{totalIssues.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Clean Contacts</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.max(0, totalRows - totalIssues).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Issues Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality Issues</h3>
        <div className="space-y-3">
          {issueConfig.map(({ key, label, severity, icon: Icon }) => {
            const count = dataQualityIssues[key as keyof typeof dataQualityIssues];
            const percentage = totalRows > 0 ? ((count / totalRows) * 100).toFixed(1) : '0.0';

            if (count === 0) return null;

            return (
              <div
                key={key}
                className={`flex items-center justify-between p-3 rounded-lg ${getSeverityColor(severity)}`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{label}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-semibold">
                    {count.toLocaleString()} ({percentage}%)
                  </span>
                </div>
              </div>
            );
          })}

          {totalIssues === 0 && (
            <div className="flex items-center justify-center p-8 text-green-600">
              <CheckCircleIcon className="h-6 w-6 mr-2" />
              <span className="font-medium">No data quality issues found!</span>
            </div>
          )}
        </div>
      </div>

      {/* Examples */}
      {(analysis.emojiExamples.length > 0 ||
        analysis.multiplePhoneExamples.length > 0 ||
        analysis.organizationOnlyExamples.length > 0 ||
        analysis.junkExamples.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Examples</h3>
          <div className="space-y-4">
            {/* Emoji Examples */}
            {analysis.emojiExamples.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Emoji in Names:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.emojiExamples.map((name, idx) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-sm">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Multiple Phones Examples */}
            {analysis.multiplePhoneExamples.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Multiple Phone Numbers:</h4>
                <div className="space-y-2">
                  {analysis.multiplePhoneExamples.slice(0, 3).map((example, idx) => (
                    <div key={idx} className="p-3 bg-blue-50 rounded-lg">
                      <div className="font-medium text-blue-900">{example.contact}</div>
                      <div className="text-sm text-blue-700 mt-1">
                        {example.phones.join(' • ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organization Only Examples */}
            {analysis.organizationOnlyExamples.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Organization Only:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.organizationOnlyExamples.slice(0, 5).map((org, idx) => (
                    <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                      {org}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Junk Examples */}
            {analysis.junkExamples.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Junk Entries:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.junkExamples.map((junk, idx) => (
                    <span key={idx} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm line-through">
                      {junk}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendedActions.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Recommended Actions</h3>
          <ul className="space-y-2">
            {recommendedActions.map((action, idx) => (
              <li key={idx} className="flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-blue-800">{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {(onProceed || onCancel) && (
        <div className="flex items-center justify-end space-x-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          {onProceed && (
            <button
              onClick={onProceed}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Configure Import Settings
            </button>
          )}
        </div>
      )}
    </div>
  );
}
