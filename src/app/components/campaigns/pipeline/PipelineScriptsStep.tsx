'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';

interface PipelineScriptsStepProps {
  campaign: any;
  onNext: () => void;
  onBack: () => void;
  contactCount: number;
  scriptCount: number;
  onScriptsGenerated: () => void;
}

const SCRIPT_TEMPLATES = [
  { id: 'expired_listing', label: 'Expired Listings' },
  { id: 'fsbo', label: 'FSBO (For Sale By Owner)' },
  { id: 'just_listed', label: 'Just Listed' },
  { id: 'just_sold', label: 'Just Sold' },
  { id: 'market_update', label: 'Market Update' },
  { id: 'custom', label: 'Custom Script' },
];

export default function PipelineScriptsStep({
  campaign,
  onNext,
  onBack,
  contactCount,
  scriptCount,
  onScriptsGenerated,
}: PipelineScriptsStepProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary, bgSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [selectedTemplate, setSelectedTemplate] = useState('expired_listing');
  const [scriptType, setScriptType] = useState<'general' | 'personalized'>('personalized');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const canProceed = scriptCount > 0;

  // Default prompts based on template
  const getDefaultPrompt = (template: string) => {
    const prompts: Record<string, string> = {
      expired_listing: 'Create a professional voicemail script for expired listings. Express empathy for their situation and offer a fresh marketing approach.',
      fsbo: 'Create a friendly voicemail script for FSBO sellers. Highlight the benefits of professional representation without being pushy.',
      just_listed: 'Create an exciting voicemail script announcing a new listing. Focus on unique property features and market opportunity.',
      just_sold: 'Create a celebratory voicemail script about a recent sale. Emphasize market expertise and successful track record.',
      market_update: 'Create an informative voicemail script with market insights. Provide valuable data and position as a market expert.',
      custom: 'Create a professional voicemail script tailored to the contact.',
    };
    return prompts[template] || prompts.custom;
  };

  const handleGenerateScripts = async () => {
    // Only send customPrompt if user actually typed something
    // Otherwise let backend use buildGeneralPrompt with user data
    const finalCustomPrompt = customPrompt.trim() ? customPrompt.trim() : undefined;

    console.log('[PipelineScriptsStep] Starting script generation:', {
      campaignId: campaign.id,
      template: selectedTemplate,
      scriptType,
      hasCustomPrompt: !!finalCustomPrompt,
      contactCount,
    });

    setIsGenerating(true);
    try {
      const requestBody: any = {
        template: selectedTemplate,
        scriptType,
      };

      // Only include customPrompt if user actually entered text
      if (finalCustomPrompt) {
        requestBody.customPrompt = finalCustomPrompt;
      }

      console.log('[PipelineScriptsStep] Request body:', requestBody);

      const response = await fetch(`/api/campaigns/${campaign.id}/generate-scripts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('[PipelineScriptsStep] Response status:', response.status);
      const data = await response.json();
      console.log('[PipelineScriptsStep] Response data:', data);

      if (data.success) {
        toast.success(`Generated ${data.count} ${scriptType} script${data.count !== 1 ? 's' : ''}`);
        console.log('[PipelineScriptsStep] Scripts generated successfully, count:', data.count);
        onScriptsGenerated();
      } else {
        console.error('[PipelineScriptsStep] Generation failed:', data.error);
        toast.error('Failed to generate scripts: ' + data.error);
      }
    } catch (error: any) {
      console.error('[PipelineScriptsStep] Error generating scripts:', error);
      toast.error('Error: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
          Generate Scripts
        </h3>
        <p className={`text-sm ${textSecondary}`}>
          Create AI-powered voicemail scripts tailored to each contact
        </p>

        {/* Progress Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className={`p-4 ${isLight ? 'bg-blue-50' : 'bg-blue-900/20'} rounded-lg`}>
            <p className={`text-sm ${textSecondary}`}>Contacts Ready</p>
            <p className={`text-2xl font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>{contactCount}</p>
          </div>
          <div className={`p-4 ${isLight ? 'bg-green-50' : 'bg-green-900/20'} rounded-lg`}>
            <p className={`text-sm ${textSecondary}`}>Scripts Generated</p>
            <p className={`text-2xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>{scriptCount}</p>
          </div>
        </div>

        {/* Status Message */}
        {scriptCount > 0 && (
          <div className={`mt-4 p-3 ${isLight ? 'bg-green-100 border-green-300 text-green-800' : 'bg-green-900/30 border-green-700/50 text-green-400'} border rounded-lg text-sm`}>
            ✓ Scripts generated successfully
          </div>
        )}
      </div>

      {/* Script Configuration Section */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6 space-y-6`}>
        {/* Script Type Selection */}
        <div>
          <label className={`block text-sm font-medium ${textPrimary} mb-3`}>
            Script Type
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setScriptType('personalized')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                scriptType === 'personalized'
                  ? isLight
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-emerald-500 bg-emerald-900/20'
                  : `${cardBorder} hover:${isLight ? 'border-blue-300' : 'border-emerald-700'}`
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                    scriptType === 'personalized'
                      ? isLight
                        ? 'border-blue-500'
                        : 'border-emerald-500'
                      : border
                  }`}
                >
                  {scriptType === 'personalized' && (
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isLight ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </div>
                <div className="text-left">
                  <div className={`font-medium ${textPrimary}`}>Personalized</div>
                  <div className={`text-xs ${textSecondary}`}>
                    Uses contact names and details
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setScriptType('general')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                scriptType === 'general'
                  ? isLight
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-emerald-500 bg-emerald-900/20'
                  : `${cardBorder} hover:${isLight ? 'border-blue-300' : 'border-emerald-700'}`
              }`}
            >
              <div className="flex items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 ${
                    scriptType === 'general'
                      ? isLight
                        ? 'border-blue-500'
                        : 'border-emerald-500'
                      : border
                  }`}
                >
                  {scriptType === 'general' && (
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isLight ? 'bg-blue-500' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </div>
                <div className="text-left">
                  <div className={`font-medium ${textPrimary}`}>General</div>
                  <div className={`text-xs ${textSecondary}`}>
                    One script for all contacts
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Template Selection */}
        <div>
          <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
            Script Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className={`w-full px-4 py-2 ${bgSecondary} ${border} rounded-lg shadow-md focus:ring-2 ${
              isLight ? 'focus:ring-blue-500 shadow-gray-300' : 'focus:ring-emerald-500 shadow-gray-900'
            } focus:border-transparent ${textPrimary}`}
          >
            {SCRIPT_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Prompt */}
        <div>
          <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
            Custom Instructions (Optional)
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Leave blank to use template-based script generation with your profile information, or enter custom instructions here..."
            rows={4}
            className={`w-full shadow-gray-300 px-4 py-3 ${bgSecondary} ${border} rounded-lg focus:ring-2 ${
              isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
            } focus:border-transparent ${textPrimary} resize-none`}
          />
          <p className={`mt-1 text-xs ${textSecondary}`}>
            Leave blank to automatically generate scripts using your profile and the selected template
          </p>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateScripts}
          disabled={isGenerating}
          className={`w-full px-6 py-3 ${
            isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
          } text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors`}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating Scripts...
            </span>
          ) : (
            `Generate ${scriptType === 'general' ? '1 General Script' : `${contactCount} Personalized Script${contactCount !== 1 ? 's' : ''}`}`
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className={`flex justify-between items-center pt-6 border-t ${border}`}>
        <button
          onClick={onBack}
          className={`px-4 py-2 ${textPrimary} hover:${isLight ? 'text-gray-900' : 'text-white'} font-medium`}
        >
          ← Back to Contacts
        </button>

        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${
              canProceed
                ? `${isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`
                : `${isLight ? 'bg-gray-200 text-gray-400' : 'bg-gray-700 text-gray-500'} cursor-not-allowed`
            }
          `}
        >
          Continue to Review →
        </button>
      </div>
    </div>
  );
}
