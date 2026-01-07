// app/components/campaigns/VoiceRecorder.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MicrophoneIcon,
  StopIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onCancel: () => void;
  scriptText?: string; // The script text to display for the user to read
  maxDuration?: number; // in seconds, default 60
}

export default function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  scriptText,
  maxDuration = 60
}: VoiceRecorderProps) {
  const { textPrimary, textSecondary, cardBg, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);

        // Create URL for playback
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setPermissionDenied(false);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const newTime = prev + 1;
          // Auto-stop at max duration
          if (newTime >= maxDuration) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionDenied(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (audioUrl && audioPlayerRef.current) {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const pausePlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const handleConfirm = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`${cardBg} ${border} rounded-lg p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl font-bold ${textPrimary}`}>Record Your Voice</h3>
        <button
          onClick={onCancel}
          className={`${isLight ? 'hover:bg-gray-100' : 'hover:bg-slate-700'} p-2 rounded-lg transition-colors`}
        >
          <XMarkIcon className={`w-5 h-5 ${textSecondary}`} />
        </button>
      </div>

      {permissionDenied && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">
            Microphone access was denied. Please allow microphone access in your browser settings and try again.
          </p>
        </div>
      )}

      {/* Script Text Display */}
      {scriptText && (
        <div className={`mb-6 p-6 ${isLight ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200' : 'bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-800/30'} border-2 rounded-xl`}>
          <h4 className={`font-semibold mb-3 text-center ${isLight ? 'text-blue-900' : 'text-blue-300'}`}>Your Script:</h4>
          <p className={`text-center text-lg leading-relaxed ${textPrimary}`} style={{ lineHeight: '1.8' }}>
            {scriptText}
          </p>
        </div>
      )}

      {/* Audio player (hidden) */}
      {audioUrl && (
        <audio
          ref={audioPlayerRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Recording UI */}
      <div className="flex flex-col items-center justify-center py-8">
        {/* Timer */}
        <div className={`text-4xl font-mono font-bold mb-6 ${textPrimary}`}>
          {formatTime(recordingTime)}
          <span className={`text-sm ${textSecondary} ml-2`}>/ {formatTime(maxDuration)}</span>
        </div>

        {/* Animated recording indicator */}
        {isRecording && (
          <motion.div
            className="w-32 h-32 rounded-full bg-red-500 flex items-center justify-center mb-6"
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <MicrophoneIcon className="w-16 h-16 text-white" />
          </motion.div>
        )}

        {/* Static mic when not recording */}
        {!isRecording && !audioBlob && (
          <div className={`w-32 h-32 rounded-full ${isLight ? 'bg-purple-100' : 'bg-purple-900/30'} flex items-center justify-center mb-6`}>
            <MicrophoneIcon className={`w-16 h-16 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
          </div>
        )}

        {/* Audio waveform placeholder when recorded */}
        {audioBlob && !isRecording && (
          <div className={`w-32 h-32 rounded-full ${isLight ? 'bg-green-100' : 'bg-green-900/30'} flex items-center justify-center mb-6`}>
            <CheckIcon className={`w-16 h-16 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
          </div>
        )}

        {/* Instructions */}
        <p className={`text-sm ${textSecondary} text-center mb-6 max-w-md`}>
          {!isRecording && !audioBlob && "Click the microphone to start recording your voicemail script"}
          {isRecording && "Recording... Click stop when you're done"}
          {audioBlob && !isRecording && "Recording complete! Listen to your recording or re-record"}
        </p>

        {/* Control buttons */}
        <div className="flex gap-3">
          {/* Start/Stop Recording */}
          {!audioBlob && (
            <>
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={permissionDenied}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <MicrophoneIcon className="w-5 h-5" />
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <StopIcon className="w-5 h-5" />
                  Stop Recording
                </button>
              )}
            </>
          )}

          {/* Playback controls when recorded */}
          {audioBlob && !isRecording && (
            <>
              {!isPlaying ? (
                <button
                  onClick={playRecording}
                  className={`px-6 py-3 ${isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-slate-700 hover:bg-slate-600'} rounded-lg font-medium transition-colors flex items-center gap-2`}
                >
                  <PlayIcon className="w-5 h-5" />
                  Play
                </button>
              ) : (
                <button
                  onClick={pausePlayback}
                  className={`px-6 py-3 ${isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-slate-700 hover:bg-slate-600'} rounded-lg font-medium transition-colors flex items-center gap-2`}
                >
                  <PauseIcon className="w-5 h-5" />
                  Pause
                </button>
              )}

              <button
                onClick={resetRecording}
                className={`px-6 py-3 ${isLight ? 'bg-gray-200 hover:bg-gray-300' : 'bg-slate-700 hover:bg-slate-600'} rounded-lg font-medium transition-colors flex items-center gap-2`}
              >
                <ArrowPathIcon className="w-5 h-5" />
                Re-record
              </button>

              <button
                onClick={handleConfirm}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                Use This Recording
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className={`mt-6 p-4 ${isLight ? 'bg-blue-50 border-blue-200' : 'bg-blue-900/10 border-blue-900/30'} border rounded-lg`}>
        <h4 className={`font-semibold mb-2 ${isLight ? 'text-blue-900' : 'text-blue-300'}`}>Recording Tips:</h4>
        <ul className={`text-sm space-y-1 ${isLight ? 'text-blue-800' : 'text-blue-400'}`}>
          <li>• Find a quiet environment to minimize background noise</li>
          <li>• Speak clearly and at a natural pace</li>
          <li>• Keep your recording under {maxDuration} seconds</li>
          <li>• Practice your script before recording</li>
          <li>• Use a friendly, professional tone</li>
        </ul>
      </div>
    </div>
  );
}
