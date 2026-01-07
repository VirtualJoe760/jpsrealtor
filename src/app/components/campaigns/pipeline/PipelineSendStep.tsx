'use client';

import { useState } from 'react';
import { toast } from 'react-toastify';
import { useTheme } from '@/app/contexts/ThemeContext';

interface PipelineSendStepProps {
  campaign: any;
  onBack: () => void;
  contactCount: number;
  scriptCount: number;
  audioCount: number;
  onRefresh?: () => void;
}

export default function PipelineSendStep({
  campaign,
  onBack,
  contactCount,
  scriptCount,
  audioCount,
  onRefresh,
}: PipelineSendStepProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const [isSending, setIsSending] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const isReady = contactCount > 0 && scriptCount > 0 && audioCount > 0;

  const handleSendNowClick = () => {
    if (!isReady) {
      toast.error('Campaign not ready to send');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmModal(false);
    setIsSending(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendNow: true }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Sending voicemails to ${contactCount} contacts!`);
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

  const handleSchedule = () => {
    toast.info('Schedule feature coming soon! 📅');
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
          Launch Your Campaign
        </h3>
        <p className={`text-sm ${
          isLight ? 'text-gray-600' : 'text-gray-400'
        }`}>
          Everything is ready. Choose when to send your voicemails.
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

          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isLight ? 'bg-white' : 'bg-gray-700/50'
          }`}>
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                isLight ? 'bg-green-100' : 'bg-green-900/40'
              }`}>
                <span className="text-xl">📝</span>
              </div>
              <div>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Personalized Scripts
                </p>
                <p className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {scriptCount}
                </p>
              </div>
            </div>
            {scriptCount > 0 ? (
              <span className="text-green-600 font-medium">✓</span>
            ) : (
              <span className="text-red-600 font-medium">✗</span>
            )}
          </div>

          <div className={`flex items-center justify-between p-3 rounded-lg ${
            isLight ? 'bg-white' : 'bg-gray-700/50'
          }`}>
            <div className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                isLight ? 'bg-purple-100' : 'bg-purple-900/40'
              }`}>
                <span className="text-xl">🎤</span>
              </div>
              <div>
                <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                  Voicemails Ready
                </p>
                <p className={`text-lg font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  {audioCount}
                </p>
              </div>
            </div>
            {audioCount > 0 ? (
              <span className="text-green-600 font-medium">✓</span>
            ) : (
              <span className="text-red-600 font-medium">✗</span>
            )}
          </div>
        </div>

        {!isReady && (
          <div className={`mt-4 p-3 rounded-lg border text-sm ${
            isLight
              ? 'bg-yellow-100 border-yellow-300 text-yellow-800'
              : 'bg-yellow-900/20 border-yellow-700 text-yellow-400'
          }`}>
            ⚠️ Complete all previous steps before launching the campaign
          </div>
        )}
      </div>

      {/* Send Options */}
      <div className="grid grid-cols-2 gap-6">
        {/* Send Now */}
        <div className={`rounded-lg border p-6 ${
          isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="text-3xl mb-3">🚀</div>
          <h4 className={`text-lg font-semibold mb-2 ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>Send Now</h4>
          <p className={`text-sm mb-4 ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            Send voicemails immediately to all {contactCount} contacts
          </p>
          <button
            onClick={handleSendNowClick}
            disabled={!isReady || isSending}
            className={`
              w-full px-6 py-3 rounded-lg font-medium transition-colors
              ${
                isReady && !isSending
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : isLight
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isSending ? 'Sending...' : 'Send Now'}
          </button>
        </div>

        {/* Schedule */}
        <div className={`rounded-lg border p-6 ${
          isLight ? 'bg-white border-gray-200' : 'bg-gray-800 border-gray-700'
        }`}>
          <div className="text-3xl mb-3">📅</div>
          <h4 className={`text-lg font-semibold mb-2 ${
            isLight ? 'text-gray-900' : 'text-white'
          }`}>Schedule</h4>
          <p className={`text-sm mb-4 ${
            isLight ? 'text-gray-600' : 'text-gray-400'
          }`}>
            Pick a date and time to send the voicemails
          </p>
          <button
            onClick={handleSchedule}
            disabled={!isReady}
            className={`
              w-full px-6 py-3 rounded-lg font-medium border-2 transition-colors
              ${
                isReady
                  ? 'border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  : isLight
                  ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'border-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Schedule Send →
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className={`flex justify-between items-center pt-6 border-t ${
        isLight ? 'border-gray-200' : 'border-gray-700'
      }`}>
        <button
          onClick={onBack}
          className={`px-4 py-2 font-medium ${
            isLight ? 'text-gray-700 hover:text-gray-900' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          ← Back
        </button>
        <div className={`text-sm ${
          isLight ? 'text-gray-500' : 'text-gray-500'
        }`}>
          Final Step - Ready to Launch
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-lg shadow-xl ${
            isLight ? 'bg-white' : 'bg-gray-800'
          }`}>
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-xl font-bold ${
                isLight ? 'text-gray-900' : 'text-white'
              }`}>
                Confirm Send
              </h3>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className={`mb-4 ${
                isLight ? 'text-gray-700' : 'text-gray-300'
              }`}>
                You're about to send voicemails to <strong>{contactCount}</strong> contact{contactCount !== 1 ? 's' : ''}.
              </p>
              <div className={`p-4 rounded-lg ${
                isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-700'
              }`}>
                <p className={`text-sm ${
                  isLight ? 'text-blue-900' : 'text-blue-300'
                }`}>
                  📞 <strong>{contactCount}</strong> contacts will receive your voicemail
                </p>
                <p className={`text-sm mt-2 ${
                  isLight ? 'text-blue-900' : 'text-blue-300'
                }`}>
                  🎤 Using <strong>{audioCount}</strong> recorded voicemail{audioCount !== 1 ? 's' : ''}
                </p>
              </div>
              <p className={`mt-4 text-sm ${
                isLight ? 'text-gray-600' : 'text-gray-400'
              }`}>
                This action cannot be undone. Are you sure you want to proceed?
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmModal(false)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isLight
                    ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSend}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isLight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                Yes, Send Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
