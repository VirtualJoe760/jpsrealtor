'use client';

import CampaignContactsManager from '../CampaignContactsManager';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';

interface PipelineContactsStepProps {
  campaign: any;
  onNext: () => void;
  onBack?: () => void;
  contactCount: number;
}

export default function PipelineContactsStep({
  campaign,
  onNext,
  onBack,
  contactCount,
}: PipelineContactsStepProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const canProceed = contactCount > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
          Add Contacts to Campaign
        </h3>
        <p className={`text-sm ${textSecondary}`}>
          Import or add contacts who will receive personalized voicemails.
        </p>

        {/* Contact Count */}
        <div className={`mt-4 p-4 ${isLight ? 'bg-blue-50' : 'bg-blue-900/20'} rounded-lg`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textSecondary}`}>Total Contacts</p>
              <p className={`text-2xl font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>{contactCount}</p>
            </div>
            {canProceed && (
              <div className={`text-sm ${isLight ? 'text-green-600' : 'text-green-400'} flex items-center`}>
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Ready to proceed
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contacts Manager */}
      <CampaignContactsManager campaignId={campaign.id} />

      {/* Navigation */}
      <div className={`flex justify-between items-center pt-6 border-t ${border}`}>
        {onBack ? (
          <button
            onClick={onBack}
            className={`px-4 py-2 ${textPrimary} hover:${isLight ? 'text-gray-900' : 'text-white'} font-medium`}
          >
            ← Back
          </button>
        ) : (
          <div />
        )}

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
          Continue to Scripts →
        </button>
      </div>
    </div>
  );
}
