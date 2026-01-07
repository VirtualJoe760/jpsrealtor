// app/agent/voice-training/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  MicrophoneIcon
} from '@heroicons/react/24/outline';
import AgentNav from '@/app/components/AgentNav';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';
import { toast } from 'react-toastify';

const trainingQuestions = [
  {
    id: 'introduction',
    question: 'Tell me about yourself',
    placeholder: 'Share your background, what got you into real estate, what drives you...',
    helpText: 'Be natural and conversational, like you\'re talking to a friend.',
  },
  {
    id: 'story',
    question: 'Tell me a memorable story from your real estate career',
    placeholder: 'Maybe a challenging deal you closed, a difficult client you helped, or a lesson you learned...',
    helpText: 'This helps us understand your storytelling style and how you connect with people.',
  },
  {
    id: 'nickname',
    question: 'What do people call you?',
    placeholder: 'Do you go by a nickname? How do clients refer to you?',
    helpText: 'Helps us understand your personal brand and approachability.',
  },
  {
    id: 'coldCall',
    question: 'How would you handle a basic cold call to a homeowner with high equity?',
    placeholder: 'Walk me through what you\'d say, your approach, your tone...',
    helpText: 'This shows us your communication style in a real scenario.',
  },
  {
    id: 'valueProposition',
    question: 'What makes you different from other agents?',
    placeholder: 'What\'s your unique approach? Your specialty? Your edge?',
    helpText: 'Understanding your competitive advantage helps us position you authentically.',
  },
  {
    id: 'tone',
    question: 'How would you describe your communication style?',
    placeholder: 'Professional? Casual? Data-driven? Relationship-focused? Humorous?',
    helpText: 'Are you more formal or conversational? Direct or consultative?',
  },
];

export default function VoiceTrainingPage() {
  const router = useRouter();
  const { cardBg, cardBorder, textPrimary, textSecondary, buttonPrimary, bgSecondary } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Load existing training if available
  useEffect(() => {
    const loadExistingTraining = async () => {
      try {
        const response = await fetch('/api/user/voice-training');
        const data = await response.json();

        if (data.success && data.training) {
          setResponses(data.training);
          // If they have all questions answered, mark as complete
          const allAnswered = trainingQuestions.every(q => data.training[q.id]);
          if (allAnswered) {
            setIsComplete(true);
          }
        }
      } catch (error) {
        console.error('Error loading training:', error);
      }
    };

    loadExistingTraining();
  }, []);

  const currentQuestion = trainingQuestions[currentStep];
  const progress = ((currentStep + 1) / trainingQuestions.length) * 100;

  const handleResponseChange = (value: string) => {
    setResponses({
      ...responses,
      [currentQuestion.id]: value,
    });
  };

  const handleNext = () => {
    if (!responses[currentQuestion.id]?.trim()) {
      toast.error('Please provide an answer before continuing');
      return;
    }

    if (currentStep < trainingQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSaveTraining();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveTraining = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/voice-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Voice training saved! Your scripts will now match your personality.');
        setIsComplete(true);
      } else {
        toast.error('Failed to save training: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving training:', error);
      toast.error('Error saving training. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetrain = () => {
    setIsComplete(false);
    setCurrentStep(0);
  };

  if (isComplete) {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <AgentNav />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${cardBg} ${cardBorder} rounded-2xl p-8 text-center mt-8`}
          >
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full ${isLight ? 'bg-green-100' : 'bg-green-900/30'} flex items-center justify-center`}>
              <CheckCircleIcon className={`w-12 h-12 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
            </div>

            <h1 className={`text-3xl font-bold ${textPrimary} mb-4`}>
              Voice Training Complete!
            </h1>

            <p className={`${textSecondary} text-lg mb-8 max-w-2xl mx-auto`}>
              Your AI voice personality has been trained. All future voicemail scripts will match your unique communication style, tone, and personality.
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push('/agent/campaigns')}
                className={`px-6 py-3 ${buttonPrimary} rounded-lg font-medium shadow-lg hover:shadow-xl transition-all`}
              >
                Go to Campaigns
              </button>
              <button
                onClick={handleRetrain}
                className={`px-6 py-3 ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-800' : 'bg-slate-700 hover:bg-slate-600 text-white'} rounded-lg font-medium transition-all`}
              >
                Update Training
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <AgentNav />

        {/* Header */}
        <div className="mt-8 mb-8 text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 ${isLight ? 'bg-purple-100 text-purple-700' : 'bg-purple-900/30 text-purple-400'} rounded-full mb-4`}>
            <MicrophoneIcon className="w-5 h-5" />
            <span className="text-sm font-medium">AI Voice Training</span>
          </div>

          <h1 className={`text-4xl font-bold ${textPrimary} mb-4`}>
            Train Your AI Voice
          </h1>

          <p className={`${textSecondary} text-lg max-w-2xl mx-auto`}>
            Answer these questions naturally, like you're talking to a colleague. This helps our AI capture your unique personality and communication style.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${textSecondary}`}>
              Question {currentStep + 1} of {trainingQuestions.length}
            </span>
            <span className={`text-sm font-medium ${textPrimary}`}>
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className={`w-full ${isLight ? 'bg-gray-200' : 'bg-slate-700'} rounded-full h-2`}>
            <motion.div
              className={`h-2 rounded-full ${isLight ? 'bg-purple-600' : 'bg-purple-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Question Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className={`${cardBg} ${cardBorder} rounded-2xl p-8 shadow-xl`}
        >
          <div className="mb-6">
            <div className={`inline-flex items-center gap-2 px-3 py-1 ${isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-400'} rounded-full text-sm font-medium mb-4`}>
              <SparklesIcon className="w-4 h-4" />
              Question {currentStep + 1}
            </div>

            <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>
              {currentQuestion.question}
            </h2>

            <p className={`${textSecondary} text-sm`}>
              {currentQuestion.helpText}
            </p>
          </div>

          <textarea
            value={responses[currentQuestion.id] || ''}
            onChange={(e) => handleResponseChange(e.target.value)}
            placeholder={currentQuestion.placeholder}
            className={`w-full h-48 px-4 py-3 ${bgSecondary} ${cardBorder} rounded-lg focus:ring-2 ${isLight ? 'focus:ring-purple-500' : 'focus:ring-purple-400'} focus:border-transparent transition-all ${textPrimary} resize-none`}
          />

          <div className="flex items-center justify-between mt-6">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 ${isLight ? 'text-gray-600 hover:text-gray-900' : 'text-gray-400 hover:text-gray-200'} transition-colors disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Back
            </button>

            <button
              onClick={handleNext}
              disabled={isSaving}
              className={`flex items-center gap-2 px-6 py-3 ${buttonPrimary} rounded-lg font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : currentStep === trainingQuestions.length - 1 ? (
                <>
                  Complete Training
                  <CheckCircleIcon className="w-5 h-5" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Skip Option */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/agent/campaigns')}
            className={`text-sm ${textSecondary} hover:${textPrimary} transition-colors`}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
