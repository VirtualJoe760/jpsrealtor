'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';

interface DropCowboyRecording {
  media_id: string;
  name: string;
  duration: number;
  date_added: string;
  file_size_kb?: number;
  preview_url?: string;
}

interface PipelineAudioSimpleStepProps {
  campaign: any;
  onNext: () => void;
  onBack?: () => void;
  onRecordingSelected?: (recordingId: string, recordingName: string) => void;
  initialRecordingId?: string;
}

export default function PipelineAudioSimpleStep({
  campaign,
  onNext,
  onBack,
  onRecordingSelected,
  initialRecordingId,
}: PipelineAudioSimpleStepProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [recordings, setRecordings] = useState<DropCowboyRecording[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>(
    initialRecordingId || ''
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch recordings on mount
  useEffect(() => {
    fetchRecordings();
  }, [campaign.id]);

  const fetchRecordings = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(
        `/api/campaigns/${campaign.id}/recordings/list`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch recordings');
      }

      setRecordings(data.recordings);

      // Auto-select if only one recording
      if (data.recordings.length === 1 && !selectedRecordingId) {
        setSelectedRecordingId(data.recordings[0].media_id);
      }
    } catch (err: any) {
      console.error('Error fetching recordings:', err);
      setError(err.message || 'Failed to load recordings');
      toast.error('Failed to load recordings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchRecordings(true);
  };

  const handleContinue = () => {
    if (!selectedRecordingId) {
      toast.error('Please select a recording to continue');
      return;
    }

    const selectedRecording = recordings.find(
      (r) => r.media_id === selectedRecordingId
    );

    // Notify parent of selection
    if (onRecordingSelected && selectedRecording) {
      onRecordingSelected(selectedRecordingId, selectedRecording.name);
    }

    onNext();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isLight ? 'border-blue-600' : 'border-emerald-500'}`}></div>
        <p className={`mt-4 ${textSecondary}`}>Loading recordings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className={`${isLight ? 'bg-red-50 border-red-200' : 'bg-red-900/20 border-red-700/50'} border rounded-lg p-6 text-center`}>
          <h3 className={`${isLight ? 'text-red-800' : 'text-red-400'} font-semibold mb-2`}>
            Failed to Load Recordings
          </h3>
          <p className={`${isLight ? 'text-red-600' : 'text-red-300'} mb-4`}>{error}</p>
          <button
            onClick={() => fetchRecordings()}
            className={`px-4 py-2 ${isLight ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white rounded transition-colors`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
              Select Audio Recording
            </h3>
            <p className={`text-sm ${textSecondary}`}>
              Choose a recording from your Drop Cowboy account
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`px-4 py-2 text-sm font-medium ${isLight ? 'text-blue-600 hover:text-blue-800' : 'text-emerald-400 hover:text-emerald-300'}
                       disabled:text-gray-400 flex items-center gap-2 transition-colors`}
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {recordings.length === 0 && (
        <div className={`${isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-700/50'} border rounded-lg p-8 text-center`}>
          <svg
            className={`w-16 h-16 mx-auto ${isLight ? 'text-blue-400' : 'text-blue-500'} mb-4`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
            No Recordings Found
          </h3>
          <p className={`${textSecondary} mb-4`}>
            You need to upload recordings to your Drop Cowboy account first.
          </p>
          <a
            href="https://app.dropcowboy.com/media"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 py-2 ${isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                       text-white rounded-lg transition-colors`}
          >
            Upload to Drop Cowboy
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      )}

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="space-y-3">
          {recordings.map((recording) => (
            <RecordingCard
              key={recording.media_id}
              recording={recording}
              selected={selectedRecordingId === recording.media_id}
              onSelect={() => setSelectedRecordingId(recording.media_id)}
              formatDuration={formatDuration}
              formatDate={formatDate}
              isLight={isLight}
            />
          ))}
        </div>
      )}

      {/* Help Text */}
      {recordings.length > 0 && (
        <div className={`${isLight ? 'bg-gray-50 border-gray-200' : 'bg-gray-800/50 border-gray-700'} border rounded-lg p-4`}>
          <div className="flex gap-3">
            <svg
              className={`w-5 h-5 ${isLight ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0 mt-0.5`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className={`text-sm ${textSecondary}`}>
              <p className={`font-medium ${textPrimary} mb-1`}>Need to add a new recording?</p>
              <p>
                Upload it to{' '}
                <a
                  href="https://app.dropcowboy.com/media"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${isLight ? 'text-blue-600 hover:text-blue-800' : 'text-emerald-400 hover:text-emerald-300'} underline`}
                >
                  Drop Cowboy
                </a>
                , then click the Refresh button above.
              </p>
            </div>
          </div>
        </div>
      )}

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
          onClick={handleContinue}
          disabled={!selectedRecordingId}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${
              selectedRecordingId
                ? `${isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`
                : `${isLight ? 'bg-gray-200 text-gray-400' : 'bg-gray-700 text-gray-500'} cursor-not-allowed`
            }
          `}
        >
          Continue to Send →
        </button>
      </div>
    </div>
  );
}

// Separate Recording Card Component
interface RecordingCardProps {
  recording: DropCowboyRecording;
  selected: boolean;
  onSelect: () => void;
  formatDuration: (seconds: number) => string;
  formatDate: (dateString: string) => string;
  isLight: boolean;
}

function RecordingCard({
  recording,
  selected,
  onSelect,
  formatDuration,
  formatDate,
  isLight,
}: RecordingCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        border-2 rounded-lg p-4 cursor-pointer transition-all
        ${
          selected
            ? `${isLight ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-emerald-500 bg-emerald-900/20 shadow-lg shadow-emerald-500/20'}`
            : `${isLight ? 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm' : 'border-gray-700 bg-gray-800/50 hover:border-emerald-500/50 hover:shadow-md'}`
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Radio Button */}
        <div className="flex-shrink-0 mt-1">
          <div
            className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${selected
                ? `${isLight ? 'border-blue-500 bg-blue-500' : 'border-emerald-500 bg-emerald-500'}`
                : `${isLight ? 'border-gray-300 bg-white' : 'border-gray-600 bg-gray-700'}`
              }
            `}
          >
            {selected && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </div>
        </div>

        {/* Recording Info */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${isLight ? 'text-gray-900' : 'text-white'} text-lg mb-1`}>
            {recording.name}
          </h3>
          <div className={`flex items-center gap-4 text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formatDuration(recording.duration)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Added {formatDate(recording.date_added)}
            </span>
            {recording.file_size_kb && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                {recording.file_size_kb} KB
              </span>
            )}
          </div>
        </div>

        {/* Selected Badge */}
        {selected && (
          <div className="flex-shrink-0">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isLight ? 'bg-blue-600' : 'bg-emerald-600'} text-white`}>
              ✓ Selected
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
