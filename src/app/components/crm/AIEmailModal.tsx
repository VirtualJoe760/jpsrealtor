'use client';

import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface AIEmailModalProps {
  isLight: boolean;
  onClose: () => void;
  onGenerate: (subject: string, body: string) => void;
}

export default function AIEmailModal({ isLight, onClose, onGenerate }: AIEmailModalProps) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bgClass = isLight ? 'bg-white' : 'bg-gray-900';
  const textClass = isLight ? 'text-gray-900' : 'text-white';
  const mutedClass = isLight ? 'text-gray-600' : 'text-gray-400';
  const inputBgClass = isLight ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-600';
  const buttonClass = isLight
    ? 'bg-purple-600 text-white hover:bg-purple-700'
    : 'bg-purple-600 text-white hover:bg-purple-700';

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/emails/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tone, context })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate email');
      }

      const data = await response.json();

      if (data.success && data.email) {
        onGenerate(data.email.subject, data.email.body);
        onClose();
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err: any) {
      console.error('Email generation error:', err);
      setError(err.message || 'Failed to generate email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`${bgClass} rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${textClass}`}>Generate Email with AI</h2>
              <p className={`text-sm ${mutedClass}`}>Let AI craft your email in seconds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'}`}
          >
            <X className={`w-5 h-5 ${textClass}`} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Prompt */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                What should this email be about? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Follow up on property viewing from yesterday, thank the client for their interest, and schedule a second showing..."
                rows={4}
                className={`w-full px-4 py-3 rounded-lg border ${inputBgClass} ${textClass} focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none`}
              />
            </div>

            {/* Tone */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                Tone
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg border ${inputBgClass} ${textClass} focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all`}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="urgent">Urgent</option>
                <option value="informative">Informative</option>
                <option value="follow-up">Follow-up</option>
              </select>
            </div>

            {/* Context (Optional) */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${textClass}`}>
                Additional Context <span className={`text-xs ${mutedClass}`}>(Optional)</span>
              </label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="E.g., Client is interested in 3-bedroom homes in La Quinta with pool, budget $800k-$1M..."
                rows={3}
                className={`w-full px-4 py-3 rounded-lg border ${inputBgClass} ${textClass} focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none`}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className={`p-4 rounded-lg ${isLight ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-900/20 border border-red-800 text-red-400'}`}>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${isLight ? 'border-gray-200' : 'border-gray-700'}`}>
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              isLight
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${buttonClass} ${
              loading || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
