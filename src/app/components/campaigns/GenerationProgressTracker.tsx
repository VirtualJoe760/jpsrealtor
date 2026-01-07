// app/components/campaigns/GenerationProgressTracker.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { FileText, Volume2 } from 'lucide-react';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';

interface GenerationSession {
  _id: string;
  type: 'script_generation' | 'audio_generation';
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  lastProcessedIndex: number;
  successCount: number;
  failureCount: number;
  errorLog?: Array<{
    index: number;
    contactId?: string;
    error: string;
    timestamp: Date;
  }>;
  startedAt: Date;
  completedAt?: Date;
}

interface GenerationProgressTrackerProps {
  campaignId: string;
  onComplete?: () => void;
}

export default function GenerationProgressTracker({
  campaignId,
  onComplete,
}: GenerationProgressTrackerProps) {
  const { cardBg, textPrimary, textSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [session, setSession] = useState<GenerationSession | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [hasCalledComplete, setHasCalledComplete] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/generation-session`);
      const data = await response.json();

      if (data.success && data.session) {
        setSession(data.session);
        setPollAttempts(0); // Reset attempts when session is found

        // Stop polling if session is completed or failed
        if (data.session.status !== 'in_progress') {
          setIsPolling(false);
          // Call onComplete only once
          if (data.session.status === 'completed' && onComplete && !hasCalledComplete) {
            setHasCalledComplete(true);
            onComplete();
          }
        }
      } else if (data.session === null) {
        // No active session - stop polling immediately
        setSession(null);
        setIsPolling(false);
      }
    } catch (error) {
      console.error('Error fetching generation progress:', error);
    }
  }, [campaignId, onComplete, hasCalledComplete]);

  // Poll for progress every 2 seconds when active
  useEffect(() => {
    if (!isPolling) return;

    fetchProgress();
    const interval = setInterval(fetchProgress, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPolling]);

  if (!session) {
    return null;
  }

  const progress = session.totalItems > 0
    ? Math.round((session.successCount / session.totalItems) * 100)
    : 0;

  const isGeneratingScripts = session.type === 'script_generation';
  const Icon = isGeneratingScripts ? FileText : Volume2;
  const typeName = isGeneratingScripts ? 'Scripts' : 'Audio';

  const getStatusColor = () => {
    switch (session.status) {
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'in_progress':
        return isGeneratingScripts ? 'purple' : 'indigo';
      default:
        return 'gray';
    }
  };

  const statusColor = getStatusColor();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`mb-6 ${cardBg} ${border} rounded-lg p-4 shadow-lg`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${isLight ? `bg-${statusColor}-100` : `bg-${statusColor}-900/30`} rounded-lg`}>
              <Icon className={`w-5 h-5 ${isLight ? `text-${statusColor}-600` : `text-${statusColor}-400`}`} />
            </div>
            <div>
              <h3 className={`font-semibold ${textPrimary}`}>
                Generating {typeName}
              </h3>
              <p className={`text-sm ${textSecondary}`}>
                {session.status === 'in_progress' && `${session.successCount} of ${session.totalItems} completed`}
                {session.status === 'completed' && `All ${session.totalItems} completed successfully!`}
                {session.status === 'failed' && `Generation failed`}
              </p>
            </div>
          </div>

          {session.status === 'in_progress' && (
            <div className="flex items-center gap-2">
              <ArrowPathIcon className={`w-5 h-5 ${textSecondary} animate-spin`} />
              <span className={`text-sm font-medium ${textPrimary}`}>
                {progress}%
              </span>
            </div>
          )}

          {session.status === 'completed' && (
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
          )}

          {session.status === 'failed' && (
            <ExclamationCircleIcon className="w-6 h-6 text-red-500" />
          )}
        </div>

        {/* Progress Bar */}
        {session.status === 'in_progress' && (
          <div className={`w-full ${isLight ? 'bg-gray-200' : 'bg-slate-700'} rounded-full h-2 mb-3`}>
            <motion.div
              className={`h-2 rounded-full ${isLight ? `bg-${statusColor}-600` : `bg-${statusColor}-500`}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className={`${isLight ? 'bg-green-50 border-green-200' : 'bg-green-900/10 border-green-900/30'} border rounded-lg p-2 text-center`}>
            <div className={`text-lg font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>
              {session.successCount}
            </div>
            <div className={`text-xs ${textSecondary}`}>Success</div>
          </div>

          {session.failureCount > 0 && (
            <div className={`${isLight ? 'bg-red-50 border-red-200' : 'bg-red-900/10 border-red-900/30'} border rounded-lg p-2 text-center`}>
              <div className={`text-lg font-bold ${isLight ? 'text-red-600' : 'text-red-400'}`}>
                {session.failureCount}
              </div>
              <div className={`text-xs ${textSecondary}`}>Failed</div>
            </div>
          )}

          <div className={`${isLight ? 'bg-gray-50 border-gray-200' : 'bg-slate-800/50 border-slate-700'} border rounded-lg p-2 text-center`}>
            <div className={`text-lg font-bold ${textPrimary}`}>
              {session.totalItems - session.successCount - session.failureCount}
            </div>
            <div className={`text-xs ${textSecondary}`}>Remaining</div>
          </div>
        </div>

        {/* Error Log */}
        {session.failureCount > 0 && session.errorLog && session.errorLog.length > 0 && (
          <div>
            <button
              onClick={() => setShowErrors(!showErrors)}
              className={`text-sm ${isLight ? 'text-red-600 hover:text-red-700' : 'text-red-400 hover:text-red-300'} font-medium mb-2`}
            >
              {showErrors ? 'Hide' : 'Show'} Error Details ({session.errorLog.length})
            </button>

            {showErrors && (
              <div className={`${isLight ? 'bg-red-50 border-red-200' : 'bg-red-900/10 border-red-900/30'} border rounded-lg p-3 max-h-40 overflow-y-auto`}>
                {session.errorLog.slice(0, 10).map((error, index) => (
                  <div key={index} className="mb-2 last:mb-0">
                    <p className={`text-xs font-medium ${isLight ? 'text-red-800' : 'text-red-300'}`}>
                      Error at index {error.index}:
                    </p>
                    <p className={`text-xs ${isLight ? 'text-red-700' : 'text-red-400'} ml-2`}>
                      {error.error}
                    </p>
                  </div>
                ))}
                {session.errorLog.length > 10 && (
                  <p className={`text-xs ${textSecondary} mt-2`}>
                    ...and {session.errorLog.length - 10} more errors
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Completion Message */}
        {session.status === 'completed' && (
          <div className={`${isLight ? 'bg-green-50 border-green-200' : 'bg-green-900/10 border-green-900/30'} border rounded-lg p-3`}>
            <p className={`text-sm ${isLight ? 'text-green-800' : 'text-green-300'} font-medium`}>
              {typeName} generation completed successfully!
            </p>
            {session.failureCount > 0 && (
              <p className={`text-xs ${isLight ? 'text-green-700' : 'text-green-400'} mt-1`}>
                {session.successCount} succeeded, {session.failureCount} failed
              </p>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
