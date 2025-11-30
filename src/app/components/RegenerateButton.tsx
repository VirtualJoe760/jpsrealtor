'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { RegenerableField } from '@/lib/field-regenerator';
import RegenerateModal from './RegenerateModal';

/**
 * Regenerate Button Component
 *
 * Displays a sparkle button next to form fields that triggers AI regeneration
 * Opens a modal where users can provide optional instructions
 */

interface RegenerateButtonProps {
  field: RegenerableField;
  currentValue: string | string[];
  articleContext: {
    title?: string;
    excerpt?: string;
    content?: string;
    category: string;
    keywords: string[];
  };
  onRegenerate: (newValue: string | string[]) => void;
  isLight: boolean;
  disabled?: boolean;
}

export default function RegenerateButton({
  field,
  currentValue,
  articleContext,
  onRegenerate,
  isLight,
  disabled = false,
}: RegenerateButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/articles/regenerate-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field,
          currentValue: Array.isArray(currentValue)
            ? currentValue.join(', ')
            : currentValue,
          articleContext,
          userPrompt,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onRegenerate(data.newValue);
        setShowModal(false);
        setUserPrompt('');
        setError(null);
      } else {
        setError(data.error || 'Failed to regenerate. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        disabled={disabled}
        className={`p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          isLight
            ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 disabled:bg-gray-100 disabled:text-gray-400'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
        }`}
        title={`Regenerate ${field} with AI`}
      >
        <Sparkles className="w-4 h-4" />
      </button>

      {showModal && (
        <RegenerateModal
          field={field}
          currentValue={currentValue}
          userPrompt={userPrompt}
          setUserPrompt={setUserPrompt}
          isRegenerating={isRegenerating}
          error={error}
          onConfirm={handleRegenerate}
          onCancel={() => {
            setShowModal(false);
            setUserPrompt('');
            setError(null);
          }}
          isLight={isLight}
        />
      )}
    </>
  );
}
