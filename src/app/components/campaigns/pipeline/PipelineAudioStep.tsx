'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import VoiceRecorder from '../VoiceRecorder';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';

interface PipelineAudioStepProps {
  campaign: any;
  onNext: () => void;
  onBack: () => void;
  scriptCount: number;
  audioCount: number;
  onAudioGenerated: () => void;
}

type AudioMode = 'choice' | 'ai' | 'record';

export default function PipelineAudioStep({
  campaign,
  onNext,
  onBack,
  scriptCount,
  audioCount,
  onAudioGenerated,
}: PipelineAudioStepProps) {
  const { cardBg, cardBorder, textPrimary, textSecondary, bgSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [mode, setMode] = useState<AudioMode>('choice');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [scriptText, setScriptText] = useState<string>('');
  const [hasLocalRecording, setHasLocalRecording] = useState(false);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);
  const [scriptId, setScriptId] = useState<string | null>(null);

  const canProceed = audioCount > 0 || hasLocalRecording;
  const allAudioComplete = audioCount === scriptCount;
  const pendingAudio = scriptCount - audioCount;

  // Fetch script text when switching to record mode
  useEffect(() => {
    if (mode === 'record' && !scriptText) {
      fetchScriptText();
    }
  }, [mode]);

  const fetchScriptText = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/scripts`);
      const data = await response.json();

      if (data.success && data.scripts.length > 0) {
        // Get the first script's text and ID (for general scripts, there's only one)
        setScriptText(data.scripts[0].scriptText || '');
        setScriptId(data.scripts[0]._id || null);
        console.log('[PipelineAudioStep] Fetched script:', {
          scriptId: data.scripts[0]._id,
          isGeneral: data.scripts[0].isGeneral,
          scriptCount: data.scripts.length
        });
      }
    } catch (error) {
      console.error('Error fetching script:', error);
    }
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/generate-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Generating audio for ${data.scriptCount} scripts`);
        onAudioGenerated();
      } else {
        toast.error('Failed to generate audio: ' + data.error);
      }
    } catch (error: any) {
      toast.error('Error: ' + error.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
        <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
          Add Voice to Your Scripts
        </h3>
        <p className={`text-sm ${textSecondary}`}>
          Choose between AI-generated voiceovers or record your own voice.
        </p>

        {/* Progress Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className={`p-4 ${isLight ? 'bg-blue-50' : 'bg-blue-900/20'} rounded-lg`}>
            <p className={`text-sm ${textSecondary}`}>Scripts Ready</p>
            <p className={`text-2xl font-bold ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>{scriptCount}</p>
          </div>
          <div className={`p-4 ${isLight ? 'bg-green-50' : 'bg-green-900/20'} rounded-lg`}>
            <p className={`text-sm ${textSecondary}`}>With Audio</p>
            <p className={`text-2xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>{audioCount}</p>
          </div>
          <div className={`p-4 ${isLight ? 'bg-orange-50' : 'bg-orange-900/20'} rounded-lg`}>
            <p className={`text-sm ${textSecondary}`}>Pending</p>
            <p className={`text-2xl font-bold ${isLight ? 'text-orange-600' : 'text-orange-400'}`}>{pendingAudio}</p>
          </div>
        </div>

        {/* Status Message */}
        {allAudioComplete && (
          <div className={`mt-4 p-3 ${isLight ? 'bg-green-100 border-green-300 text-green-800' : 'bg-green-900/30 border-green-700/50 text-green-400'} border rounded-lg text-sm`}>
            ✓ All scripts have voiceovers
          </div>
        )}
      </div>

      {/* Mode Selection or Tools */}
      {mode === 'choice' && (
        <div className="grid grid-cols-2 gap-6">
          {/* AI Voice Option */}
          <button
            onClick={() => setMode('ai')}
            className={`p-6 ${cardBg} border-2 ${cardBorder} rounded-lg hover:${isLight ? 'border-blue-500' : 'border-emerald-500'} hover:shadow-lg transition-all text-left group`}
          >
            <div className="text-4xl mb-4">🤖</div>
            <h4 className={`text-lg font-semibold ${textPrimary} mb-2 group-hover:${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
              AI Voice (ElevenLabs)
            </h4>
            <p className={`text-sm ${textSecondary}`}>
              Generate professional voiceovers using AI text-to-speech technology
            </p>
            <div className={`mt-4 px-4 py-2 ${isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-900/30 text-blue-400'} rounded-lg text-sm font-medium inline-block`}>
              Select AI Voice →
            </div>
          </button>

          {/* Record Voice Option */}
          <button
            onClick={() => setMode('record')}
            className={`p-6 ${cardBg} border-2 ${cardBorder} rounded-lg hover:${isLight ? 'border-blue-500' : 'border-emerald-500'} hover:shadow-lg transition-all text-left group`}
          >
            <div className="text-4xl mb-4">🎤</div>
            <h4 className={`text-lg font-semibold ${textPrimary} mb-2 group-hover:${isLight ? 'text-blue-600' : 'text-emerald-400'}`}>
              Record Your Voice
            </h4>
            <p className={`text-sm ${textSecondary}`}>
              Use your own voice for a personal touch. Record directly in the browser.
            </p>
            <div className={`mt-4 px-4 py-2 ${isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-900/30 text-blue-400'} rounded-lg text-sm font-medium inline-block`}>
              Select Recording →
            </div>
          </button>
        </div>
      )}

      {/* AI Generation UI */}
      {mode === 'ai' && (
        <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`text-lg font-semibold ${textPrimary}`}>AI Voice Generation</h4>
            <button
              onClick={() => setMode('choice')}
              className={`text-sm ${textSecondary} hover:${isLight ? 'text-gray-900' : 'text-white'}`}
            >
              ← Change Method
            </button>
          </div>

          <p className={`text-sm ${textSecondary} mb-6`}>
            Generate AI voiceovers for all {scriptCount} scripts using ElevenLabs text-to-speech.
          </p>

          <button
            onClick={handleGenerateAI}
            disabled={isGeneratingAI}
            className={`w-full px-6 py-3 ${
              isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
            } text-white rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors`}
          >
            {isGeneratingAI ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating AI Voiceovers...
              </span>
            ) : (
              `Generate AI Voiceovers for ${pendingAudio} Script${pendingAudio !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      )}

      {/* Voice Recording UI */}
      {mode === 'record' && (
        <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h4 className={`text-lg font-semibold ${textPrimary}`}>Record Your Voice</h4>
            <button
              onClick={() => setMode('choice')}
              disabled={isUploadingRecording}
              className={`text-sm ${textSecondary} hover:${isLight ? 'text-gray-900' : 'text-white'} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              ← Change Method
            </button>
          </div>

          {isUploadingRecording && (
            <div className={`mb-4 p-4 ${isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/20 border-blue-700'} border rounded-lg`}>
              <div className="flex items-center gap-3">
                <svg className={`animate-spin h-5 w-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className={`text-sm font-medium ${isLight ? 'text-blue-900' : 'text-blue-300'}`}>
                  Uploading your recording...
                </span>
              </div>
            </div>
          )}

          <VoiceRecorder
            scriptText={scriptText}
            onRecordingComplete={async (blob: Blob) => {
              console.log('[PipelineAudioStep] Recording confirmed, blob size:', blob.size);

              if (!scriptId) {
                toast.error('Script ID not found. Please try refreshing the page.');
                return;
              }

              // Upload the recording to the server
              setIsUploadingRecording(true);
              try {
                const formData = new FormData();
                formData.append('audio', blob, 'recording.webm');

                console.log('[PipelineAudioStep] Uploading recording to scriptId:', scriptId);

                const response = await fetch(`/api/campaigns/${campaign.id}/scripts/${scriptId}/upload-audio`, {
                  method: 'POST',
                  body: formData,
                });

                const data = await response.json();

                if (data.success) {
                  console.log('[PipelineAudioStep] Upload successful:', data);
                  setHasLocalRecording(true);
                  toast.success('Recording uploaded successfully!');
                  // Notify parent to refresh counts
                  onAudioGenerated();
                } else {
                  console.error('[PipelineAudioStep] Upload failed:', data.error);
                  toast.error('Failed to upload recording: ' + data.error);
                }
              } catch (error: any) {
                console.error('[PipelineAudioStep] Upload error:', error);
                toast.error('Error uploading recording: ' + error.message);
              } finally {
                setIsUploadingRecording(false);
              }
            }}
            onCancel={() => setMode('choice')}
          />
        </div>
      )}

      {/* Navigation */}
      <div className={`flex justify-between items-center pt-6 border-t ${border}`}>
        <button
          onClick={onBack}
          className={`px-4 py-2 ${textPrimary} hover:${isLight ? 'text-gray-900' : 'text-white'} font-medium`}
        >
          ← Back
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
          Continue to Send →
        </button>
      </div>
    </div>
  );
}
