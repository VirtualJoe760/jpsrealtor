'use client';

import { Sparkles, Loader2, X, AlertCircle } from 'lucide-react';
import { RegenerableField } from '@/lib/field-regenerator';

/**
 * Regenerate Modal Component
 *
 * Modal dialog for AI field regeneration
 * Shows current value, accepts user instructions, handles regeneration
 */

interface RegenerateModalProps {
  field: RegenerableField;
  currentValue: string | string[];
  userPrompt: string;
  setUserPrompt: (value: string) => void;
  isRegenerating: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  isLight: boolean;
}

const FIELD_LABELS: Record<RegenerableField, string> = {
  title: 'Title',
  excerpt: 'Excerpt',
  content: 'Content',
  seoTitle: 'SEO Title',
  seoDescription: 'SEO Description',
  keywords: 'Keywords',
};

const FIELD_PLACEHOLDERS: Record<RegenerableField, string> = {
  title: 'e.g., "Make it more engaging" or "Focus on investment opportunities"',
  excerpt: 'e.g., "Emphasize the benefits for buyers" or "Make it more concise"',
  content: 'e.g., "Add more data about market trends" or "Make it more actionable"',
  seoTitle: 'e.g., "Include year 2025" or "Focus on Palm Desert"',
  seoDescription: 'e.g., "Highlight investment angle" or "Add urgency"',
  keywords: 'e.g., "Add more long-tail keywords" or "Focus on La Quinta"',
};

export default function RegenerateModal({
  field,
  currentValue,
  userPrompt,
  setUserPrompt,
  isRegenerating,
  error,
  onConfirm,
  onCancel,
  isLight,
}: RegenerateModalProps) {
  const fieldLabel = FIELD_LABELS[field];
  const displayValue = Array.isArray(currentValue)
    ? currentValue.join(', ')
    : currentValue;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`${
          isLight ? 'bg-white' : 'bg-gray-900'
        } rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            className={`text-2xl font-bold flex items-center gap-2 ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}
          >
            <Sparkles className="w-6 h-6" />
            Regenerate {fieldLabel}
          </h2>
          <button
            onClick={onCancel}
            disabled={isRegenerating}
            className={`p-2 rounded transition-colors ${
              isLight
                ? 'hover:bg-gray-100 text-gray-700'
                : 'hover:bg-gray-800 text-gray-300'
            } disabled:opacity-50`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Value */}
        <div className="mb-6">
          <label
            className={`block text-sm font-medium mb-2 ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}
          >
            Current {fieldLabel}:
          </label>
          <div
            className={`p-4 rounded-lg border ${
              isLight
                ? 'bg-gray-50 border-gray-300 text-gray-800'
                : 'bg-gray-800 border-gray-700 text-gray-200'
            }`}
          >
            {displayValue ? (
              <p className="text-sm whitespace-pre-wrap break-words">
                {displayValue}
              </p>
            ) : (
              <p
                className={`text-sm italic ${
                  isLight ? 'text-gray-500' : 'text-gray-500'
                }`}
              >
                No {fieldLabel.toLowerCase()} yet
              </p>
            )}
          </div>
          {displayValue && (
            <p
              className={`text-xs mt-1 ${
                isLight ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              {displayValue.length} characters
            </p>
          )}
        </div>

        {/* User Instructions */}
        <div className="mb-6">
          <label
            className={`block text-sm font-medium mb-2 ${
              isLight ? 'text-gray-700' : 'text-gray-300'
            }`}
          >
            Instructions for AI{' '}
            <span className={isLight ? 'text-gray-500' : 'text-gray-400'}>
              (optional)
            </span>
            :
          </label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder={FIELD_PLACEHOLDERS[field]}
            disabled={isRegenerating}
            className={`w-full p-3 rounded-lg border ${
              isLight
                ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                : 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
            rows={3}
          />
          <p
            className={`text-xs mt-1 ${
              isLight ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            Leave blank to let AI improve automatically based on best practices
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              isLight
                ? 'bg-red-50 border-red-300 text-red-800'
                : 'bg-red-900/20 border-red-700 text-red-300'
            } flex items-start gap-3`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Regeneration Failed</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isRegenerating}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isLight
                ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isRegenerating}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isLight
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Regenerate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
