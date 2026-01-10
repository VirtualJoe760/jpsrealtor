'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '@/app/contexts/ThemeContext';

interface PipelineSendSimpleStepProps {
  campaign: any;
  onBack: () => void;
  contactCount: number;
  recordingId?: string;
  recordingName?: string;
  onRefresh?: () => void;
}

export default function PipelineSendSimpleStep({
  campaign,
  onBack,
  contactCount,
  recordingId,
  recordingName,
  onRefresh,
}: PipelineSendSimpleStepProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sendResults, setSendResults] = useState<any>(null);

  const isReady = contactCount > 0 && recordingId;

  const estimatedCost = contactCount * 0.10; // $0.10 per voicemail

  const handleSendNowClick = () => {
    if (!isReady) {
      if (!recordingId) {
        toast.error('Please select a recording first');
      } else if (contactCount === 0) {
        toast.error('Please add contacts to the campaign');
      }
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmModal(false);
    setIsSending(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/send-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recording_id: recordingId,
          recording_name: recordingName || 'Unknown Recording',
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSendResults(data);
        toast.success(`Successfully sent voicemails to ${data.successCount} contacts!`);
        // Trigger refresh of campaign list to show updated metrics
        onRefresh?.();
      } else {
        toast.error('Failed to send: ' + data.error);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-lg border p-6 ${
        isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
      }`}>
        <h3 className={`text-lg font-semibold mb-2 ${
          isLight ? 'text-gray-900' : 'text-white'
        }`}>
          Ready to Send
        </h3>
        <p className={`text-sm ${
          isLight ? 'text-gray-600' : 'text-gray-400'
        }`}>
          Review your campaign details and send voicemails to your contacts.
        </p>
      </div>

      {/* Campaign Summary */}
      <div className={`rounded-lg border p-6 ${
        isLight
          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
          : 'bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border-blue-700'
      }`}>
        <h4 className={`text-md font-semibold mb-4 ${
          isLight ? 'text-gray-900' : 'text-white'
        }`}>Campaign Summary</h4>

        <div className="space-y-3">
          {/* Campaign Name */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isLight ? 'bg-white' : 'bg-gray-700/50'
          }`}>
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                isLight ? 'bg-purple-100' : 'bg-purple-900/40'
              }`}>
                <span className="text-xl">📢</span>
              </div>
              <div>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Campaign Name
                </p>
                <p className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {campaign.name}
                </p>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isLight ? 'bg-white' : 'bg-gray-700/50'
          }`}>
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                isLight ? 'bg-blue-100' : 'bg-blue-900/40'
              }`}>
                <span className="text-xl">👥</span>
              </div>
              <div>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Total Contacts
                </p>
                <p className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {contactCount}
                </p>
              </div>
            </div>
            {contactCount > 0 ? (
              <span className="text-green-600 font-medium">✓</span>
            ) : (
              <span className="text-red-600 font-medium">✗</span>
            )}
          </div>

          {/* Recording */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isLight ? 'bg-white' : 'bg-gray-700/50'
          }`}>
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                isLight ? 'bg-green-100' : 'bg-green-900/40'
              }`}>
                <span className="text-xl">🎵</span>
              </div>
              <div>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Selected Recording
                </p>
                <p className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {recordingName || 'Not selected'}
                </p>
              </div>
            </div>
            {recordingId ? (
              <span className="text-green-600 font-medium">✓</span>
            ) : (
              <span className="text-red-600 font-medium">✗</span>
            )}
          </div>

          {/* Cost Estimate */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isLight ? 'bg-white' : 'bg-gray-700/50'
          }`}>
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                isLight ? 'bg-yellow-100' : 'bg-yellow-900/40'
              }`}>
                <span className="text-xl">💰</span>
              </div>
              <div>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Estimated Cost
                </p>
                <p className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  ${estimatedCost.toFixed(2)}
                </p>
                <p className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                  {contactCount} contacts × $0.10 each
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Send Results (if sent) */}
      {sendResults && (
        <div className={`rounded-lg border p-6 ${
          isLight ? 'bg-green-50 border-green-200' : 'bg-green-900/20 border-green-700'
        }`}>
          <h4 className={`text-md font-semibold mb-4 ${
            isLight ? 'text-green-900' : 'text-green-400'
          }`}>✓ Campaign Sent Successfully!</h4>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={`${isLight ? 'text-green-800' : 'text-green-300'}`}>
                Successful:
              </span>
              <span className={`font-bold ${isLight ? 'text-green-900' : 'text-green-400'}`}>
                {sendResults.successCount}
              </span>
            </div>
            {sendResults.failureCount > 0 && (
              <div className="flex justify-between">
                <span className={`${isLight ? 'text-red-800' : 'text-red-300'}`}>
                  Failed:
                </span>
                <span className={`font-bold ${isLight ? 'text-red-900' : 'text-red-400'}`}>
                  {sendResults.failureCount}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Send Button */}
      {!sendResults && (
        <div className={`rounded-lg border p-6 ${
          isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleSendNowClick}
              disabled={!isReady || isSending}
              className={`
                w-full max-w-md px-8 py-4 rounded-lg font-semibold text-lg
                transition-all transform hover:scale-105
                ${
                  isReady && !isSending
                    ? `${isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                       text-white shadow-lg ${isLight ? 'hover:shadow-blue-500/50' : 'hover:shadow-emerald-500/50'}`
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {isSending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                '🚀 Send Campaign Now'
              )}
            </button>

            {!isReady && (
              <p className={`text-sm ${isLight ? 'text-red-600' : 'text-red-400'} text-center`}>
                {!recordingId
                  ? '⚠️ Please select a recording to continue'
                  : '⚠️ Please add contacts to the campaign'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className={`flex justify-between items-center pt-6 border-t ${
        isLight ? 'border-gray-200' : 'border-gray-700'
      }`}>
        <button
          onClick={onBack}
          disabled={isSending}
          className={`px-4 py-2 ${
            isLight ? 'text-gray-700 hover:text-gray-900' : 'text-gray-300 hover:text-white'
          } font-medium ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          ← Back
        </button>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`max-w-md w-full mx-4 rounded-lg p-6 ${
            isLight ? 'bg-white' : 'bg-gray-800'
          }`}>
            <h3 className={`text-xl font-bold mb-4 ${
              isLight ? 'text-gray-900' : 'text-white'
            }`}>
              Confirm Campaign Send
            </h3>
            <p className={`mb-6 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
              You are about to send <strong>{contactCount}</strong> voicemails using the recording{' '}
              <strong>"{recordingName}"</strong>.
            </p>
            <p className={`mb-6 ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
              Estimated cost: <strong>${estimatedCost.toFixed(2)}</strong>
            </p>
            <p className={`mb-6 text-sm ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                  isLight
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white ${
                  isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
