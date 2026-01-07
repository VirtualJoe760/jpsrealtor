'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface PipelineReviewStepProps {
  campaign: any;
  onNext: () => void;
  onBack: () => void;
  scriptCount: number;
  onScriptsUpdated: () => void;
}

interface Script {
  _id: string;
  contactId?: string;
  contactName?: string;
  scriptText: string;
  isGeneral?: boolean;
}

export default function PipelineReviewStep({
  campaign,
  onNext,
  onBack,
  scriptCount,
  onScriptsUpdated,
}: PipelineReviewStepProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary, border, bgSecondary } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [scripts, setScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());

  // Fetch scripts
  useEffect(() => {
    const fetchScripts = async () => {
      console.log('[PipelineReviewStep] Fetching scripts for campaign:', campaign.id);
      try {
        const response = await fetch(`/api/campaigns/${campaign.id}/scripts`);
        const data = await response.json();
        console.log('[PipelineReviewStep] Scripts response:', data);

        if (data.success) {
          const fetchedScripts = data.scripts || [];
          console.log('[PipelineReviewStep] Fetched scripts:', fetchedScripts);
          setScripts(fetchedScripts);

          // Auto-expand all scripts initially
          const allScriptIds = new Set(fetchedScripts.map((s: Script) => s._id));
          setExpandedScripts(allScriptIds);
        } else {
          console.error('[PipelineReviewStep] Failed to fetch scripts:', data.error);
          toast.error('Failed to load scripts');
        }
      } catch (error) {
        console.error('[PipelineReviewStep] Error fetching scripts:', error);
        toast.error('Failed to load scripts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchScripts();
  }, [campaign.id]);

  const handleScriptTextChange = (scriptId: string, newText: string) => {
    setScripts((prev) =>
      prev.map((script) =>
        script._id === scriptId ? { ...script, scriptText: newText } : script
      )
    );
  };

  const handleSaveScripts = async () => {
    console.log('[PipelineReviewStep] Saving scripts:', scripts);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/scripts/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scripts }),
      });

      const data = await response.json();
      console.log('[PipelineReviewStep] Save response:', data);

      if (data.success) {
        toast.success('Scripts saved successfully');
        onScriptsUpdated();
      } else {
        const errorMsg = data.error || `Failed to update ${data.failed || 0} script(s)`;
        console.error('[PipelineReviewStep] Save failed:', errorMsg, 'Full response:', data);
        toast.error(errorMsg);

        // Log detailed errors if available
        if (data.errors && data.errors.length > 0) {
          console.error('[PipelineReviewStep] Detailed errors:', data.errors);
        }
      }
    } catch (error) {
      console.error('[PipelineReviewStep] Error saving scripts:', error);
      toast.error('Error saving scripts');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleScript = (scriptId: string) => {
    setExpandedScripts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(scriptId)) {
        newSet.delete(scriptId);
      } else {
        newSet.add(scriptId);
      }
      return newSet;
    });
  };

  const isGeneral = scripts.length > 0 && scripts[0].isGeneral;
  console.log('[PipelineReviewStep] Rendering - isGeneral:', isGeneral, 'scripts:', scripts);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isLight ? 'border-blue-600' : 'border-emerald-500'} mx-auto mb-4`}></div>
          <p className={textSecondary}>Loading scripts...</p>
        </div>
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="space-y-6">
        <div className={`${cardBg} ${cardBorder} rounded-lg p-6 text-center`}>
          <p className={textSecondary}>No scripts found. Please go back and generate scripts first.</p>
        </div>
        <div className={`flex justify-between items-center pt-6 border-t ${border}`}>
          <button
            onClick={onBack}
            className={`px-4 py-2 ${textPrimary} hover:${isLight ? 'text-gray-900' : 'text-white'} font-medium`}
          >
            ← Back to Scripts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
          Review & Edit {isGeneral ? 'Script' : 'Scripts'}
        </h3>
        <p className={`text-sm ${textSecondary}`}>
          {isGeneral
            ? 'Review and edit your general script that will be used for all contacts.'
            : `Review and edit your ${scriptCount} personalized script${scriptCount !== 1 ? 's' : ''} before adding voice.`
          }
        </p>
      </div>

      {/* General Script (Single Large Text Area) */}
      {isGeneral ? (
        <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className={`font-semibold ${textPrimary} mb-1`}>
                General Script (All Contacts)
              </h4>
              <span className={`text-sm ${textSecondary}`}>
                {scripts[0].scriptText ? scripts[0].scriptText.split(' ').length : 0} words
              </span>
            </div>
          </div>

          <textarea
            value={scripts[0].scriptText || ''}
            onChange={(e) => handleScriptTextChange(scripts[0]._id, e.target.value)}
            rows={12}
            className={`
              w-full px-4 py-3 rounded-lg
              ${isLight ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-600'}
              border-2 focus:ring-2 ${isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'} focus:border-transparent
              ${textPrimary} text-sm
              resize-y
            `}
            placeholder="Enter your script here..."
          />
        </div>
      ) : (
        /* Personalized Scripts (Accordion) */
        <div className="space-y-3">
          {scripts.map((script, index) => {
            const isExpanded = expandedScripts.has(script._id);
            return (
              <div key={script._id} className={`${cardBg} ${cardBorder} rounded-lg overflow-hidden`}>
                {/* Accordion Header */}
                <button
                  onClick={() => toggleScript(script._id)}
                  className={`w-full px-6 py-4 flex items-center justify-between ${isLight ? 'hover:bg-gray-50' : 'hover:bg-gray-800'} transition-colors`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'} rounded-full text-xs font-medium`}>
                      Script {index + 1}
                    </span>
                    <span className={`font-medium ${textPrimary}`}>
                      {script.contactName || 'Unnamed Contact'}
                    </span>
                    <span className={`text-xs ${textSecondary}`}>
                      {script.scriptText ? script.scriptText.split(' ').length : 0} words
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUpIcon className={`w-5 h-5 ${textSecondary}`} />
                  ) : (
                    <ChevronDownIcon className={`w-5 h-5 ${textSecondary}`} />
                  )}
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                  <div className={`px-6 pb-6 border-t ${border}`}>
                    <textarea
                      value={script.scriptText || ''}
                      onChange={(e) => handleScriptTextChange(script._id, e.target.value)}
                      rows={8}
                      className={`
                        mt-4 w-full px-4 py-3 rounded-lg
                        ${isLight ? 'bg-white border-gray-300' : 'bg-gray-800 border-gray-600'}
                        border-2 focus:ring-2 ${isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'} focus:border-transparent
                        ${textPrimary} text-sm
                        resize-y
                      `}
                      placeholder="Enter your script here..."
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Save Button */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-4`}>
        <button
          onClick={handleSaveScripts}
          disabled={isSaving}
          className={`
            w-full px-6 py-3 rounded-lg font-medium transition-colors
            ${isLight ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'}
            text-white disabled:bg-gray-400 disabled:cursor-not-allowed
          `}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Navigation */}
      <div className={`flex justify-between items-center pt-6 border-t ${border}`}>
        <button
          onClick={onBack}
          className={`px-4 py-2 ${textPrimary} hover:${isLight ? 'text-gray-900' : 'text-white'} font-medium`}
        >
          ← Back to Scripts
        </button>

        <button
          onClick={onNext}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}
            text-white
          `}
        >
          Continue to Audio →
        </button>
      </div>
    </div>
  );
}
