'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Volume2,
  Download,
  Trash2,
  Play,
  Pause,
  Loader2,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
} from 'lucide-react';

interface VoicemailScript {
  _id: string;
  script: string;
  scriptVersion: number;
  generatedBy: 'ai' | 'manual';
  aiModel?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  audio: {
    status: 'pending' | 'generating' | 'completed' | 'failed';
    url?: string;
    voiceId?: string;
    duration?: number;
    generatedAt?: string;
    error?: string;
  };
  contactId: string;
  campaignId: string;
}

interface VoicemailScriptViewerProps {
  script: VoicemailScript;
  onUpdate?: () => void;
}

export default function VoicemailScriptViewer({
  script,
  onUpdate,
}: VoicemailScriptViewerProps) {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState(script.script);
  const [isSaving, setIsSaving] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);

  // Delete script
  const handleDeleteScript = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this script? This will also delete any associated audio. You can regenerate a new script afterwards.'
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/campaigns/${script.campaignId}/scripts/${script._id}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete script');
      }

      // Notify parent to refresh (this will close the viewer)
      onUpdate?.();
    } catch (error: any) {
      console.error('Error deleting script:', error);
      alert(error.message || 'Failed to delete script');
    }
  };

  // Generate audio and save to Cloudinary
  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    try {
      const response = await fetch(
        `/api/campaigns/${script.campaignId}/scripts/${script._id}/generate-audio`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate audio');
      }

      onUpdate?.();
    } catch (error: any) {
      console.error('Error generating audio:', error);
      alert(error.message || 'Failed to generate audio');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  // Preview audio by streaming from 11Labs (before saving)
  const handlePreviewAudio = async () => {
    setIsPreviewing(true);
    setPreviewError(null);

    try {
      const response = await fetch(
        `/api/campaigns/${script.campaignId}/scripts/${script._id}/preview-audio`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to preview audio');
      }

      // Create blob URL from streamed response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Play preview audio
      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.play();
      }
    } catch (error: any) {
      console.error('Error previewing audio:', error);
      setPreviewError(error.message || 'Failed to preview audio');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Delete audio from Cloudinary
  const handleDeleteAudio = async () => {
    if (!confirm('Are you sure you want to delete this audio recording?')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/campaigns/${script.campaignId}/scripts/${script._id}/audio`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete audio');
      }

      onUpdate?.();
    } catch (error: any) {
      console.error('Error deleting audio:', error);
      alert(error.message || 'Failed to delete audio');
    } finally {
      setIsDeleting(false);
    }
  };

  // Save edited script
  const handleSaveScript = async () => {
    if (editedScript.trim() === script.script.trim()) {
      setIsEditing(false);
      return; // No changes
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `/api/campaigns/${script.campaignId}/scripts/${script._id}/update`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: editedScript }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update script');
      }

      setIsEditing(false);
      onUpdate?.(); // Refresh parent to show new version
    } catch (error: any) {
      console.error('Error saving script:', error);
      alert(error.message || 'Failed to save script');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedScript(script.script); // Reset to original
    setIsEditing(false);
  };

  // Toggle saved audio playback
  const handleTogglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Format duration (seconds to MM:SS)
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <FileText className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Voicemail Script</h3>
            <p className="text-sm text-gray-500">
              Version {script.scriptVersion} • Generated by {script.generatedBy}
              {script.aiModel && ` (${script.aiModel})`}
            </p>
          </div>
        </div>

        {/* Review Status Badge */}
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            script.reviewStatus === 'approved'
              ? 'bg-green-100 text-green-700'
              : script.reviewStatus === 'rejected'
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {script.reviewStatus}
        </div>
      </div>

      {/* Script Text - Editable */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Script Text</label>
          {!isEditing && script.audio.status === 'pending' && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {isEditing ? (
          // Edit Mode: Textarea
          <div className="space-y-3">
            <textarea
              value={editedScript}
              onChange={(e) => setEditedScript(e.target.value)}
              className="w-full h-48 px-4 py-3 bg-white border-2 border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm resize-y"
              placeholder="Enter your voicemail script..."
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {editedScript.length} characters • ~{Math.ceil(editedScript.length / 5)} words
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveScript}
                  disabled={isSaving || !editedScript.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Script
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Read-Only Mode
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {script.script}
            </p>
          </div>
        )}
      </div>

      {/* Audio Section */}
      <div className="border-t pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Volume2 className="w-5 h-5 text-gray-600" />
          <h4 className="font-semibold text-gray-900">Audio Recording</h4>
        </div>

        {/* Audio Status */}
        {script.audio.status === 'pending' && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">No audio generated yet</p>
          </div>
        )}

        {script.audio.status === 'generating' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-sm text-blue-700">Generating audio...</p>
          </div>
        )}

        {script.audio.status === 'failed' && (
          <div className="bg-red-50 rounded-lg p-4 mb-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm text-red-700 font-medium">
                Audio generation failed
              </p>
              {script.audio.error && (
                <p className="text-xs text-red-600 mt-1">{script.audio.error}</p>
              )}
            </div>
          </div>
        )}

        {script.audio.status === 'completed' && script.audio.url && (
          <div className="bg-green-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-700 font-medium">
                  Audio ready • {formatDuration(script.audio.duration)}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                {script.audio.generatedAt &&
                  new Date(script.audio.generatedAt).toLocaleDateString()}
              </p>
            </div>

            {/* Audio Player */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlayback}
                className="p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-gray-700" />
                ) : (
                  <Play className="w-5 h-5 text-gray-700" />
                )}
              </button>
              <audio
                ref={audioRef}
                src={script.audio.url}
                onEnded={() => setIsPlaying(false)}
                className="flex-1"
                controls
              />
            </div>
          </div>
        )}

        {/* Preview Error */}
        {previewError && (
          <div className="bg-red-50 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700">{previewError}</p>
          </div>
        )}

        {/* Hidden preview audio player */}
        <audio
          ref={previewAudioRef}
          onEnded={() => setIsPreviewing(false)}
          className="hidden"
        />

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Preview Button (always available) */}
          <button
            onClick={handlePreviewAudio}
            disabled={isPreviewing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPreviewing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Preview Audio
          </button>

          {/* Generate Audio Button */}
          {script.audio.status !== 'completed' && (
            <button
              onClick={handleGenerateAudio}
              disabled={isGeneratingAudio || script.audio.status === 'generating'}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingAudio ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              Generate Audio
            </button>
          )}

          {/* Download Button */}
          {script.audio.url && (
            <a
              href={script.audio.url}
              download
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          )}

          {/* Delete Audio Button */}
          {script.audio.status === 'completed' && (
            <button
              onClick={handleDeleteAudio}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Audio
            </button>
          )}

          {/* Delete Script Button */}
          <button
            onClick={handleDeleteScript}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            title="Delete script and regenerate with a different prompt"
          >
            <Trash2 className="w-4 h-4" />
            Delete Script
          </button>
        </div>
      </div>
    </motion.div>
  );
}
