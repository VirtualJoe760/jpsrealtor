'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import PipelineStepIndicator, { PipelineStep } from './PipelineStepIndicator';
import PipelineContactsStep from './PipelineContactsStep';
import PipelineScriptsStep from './PipelineScriptsStep';
import PipelineReviewStep from './PipelineReviewStep';
import PipelineAudioStep from './PipelineAudioStep';
import PipelineSendStep from './PipelineSendStep';

interface CampaignPipelineWizardProps {
  campaign: any; // Accepts any campaign object with an id
  initialStrategy?: 'voicemail' | 'text' | 'email';
  onRefresh?: () => void;
}

interface PipelineData {
  contactCount: number;
  scriptCount: number;
  audioCount: number;
}

export default function CampaignPipelineWizard({
  campaign,
  initialStrategy,
  onRefresh,
}: CampaignPipelineWizardProps) {
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';
  const [currentStep, setCurrentStep] = useState<PipelineStep>('contacts');
  const [completedSteps, setCompletedSteps] = useState<PipelineStep[]>([]);
  const [data, setData] = useState<PipelineData>({
    contactCount: 0,
    scriptCount: 0,
    audioCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [hasCheckedResume, setHasCheckedResume] = useState(false);

  // Fetch campaign stats
  const fetchCampaignStats = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/stats`);
      if (!response.ok) {
        // If stats endpoint doesn't exist, try to get data from existing endpoints
        const [contactsRes, scriptsRes] = await Promise.all([
          fetch(`/api/campaigns/${campaign.id}/contacts`),
          fetch(`/api/campaigns/${campaign.id}/scripts`),
        ]);

        const contactsData = await contactsRes.json();
        const scriptsData = await scriptsRes.json();

        const contacts = contactsData.contacts || [];
        const scripts = scriptsData.scripts || [];
        const audioCount = scripts.filter(
          (s: any) => s.audio?.status === 'completed' || s.audio?.url
        ).length;

        setData({
          contactCount: contacts.length,
          scriptCount: scripts.length,
          audioCount,
        });

        // Auto-complete steps based on current data
        const completed: PipelineStep[] = [];
        if (contacts.length > 0) completed.push('contacts');
        if (scripts.length > 0) completed.push('scripts');
        if (scripts.length > 0) completed.push('review');
        if (audioCount > 0) completed.push('audio');
        setCompletedSteps(completed);

        return;
      }

      const statsData = await response.json();
      setData({
        contactCount: statsData.contactCount || 0,
        scriptCount: statsData.scriptCount || 0,
        audioCount: statsData.audioCount || 0,
      });

      // Auto-complete steps based on current data
      const completed: PipelineStep[] = [];
      if (statsData.contactCount > 0) completed.push('contacts');
      if (statsData.scriptCount > 0) completed.push('scripts');
      if (statsData.scriptCount > 0) completed.push('review');
      if (statsData.audioCount > 0) completed.push('audio');
      setCompletedSteps(completed);
    } catch (error) {
      console.error('Error fetching campaign stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignStats();
  }, [campaign.id]);

  // Determine which step should be current based on progress
  useEffect(() => {
    if (isLoading) return;

    if (data.contactCount === 0) {
      setCurrentStep('contacts');
      setHasCheckedResume(true);
    } else if (data.scriptCount === 0) {
      setCurrentStep('scripts');
      setHasCheckedResume(true);
    } else if (data.audioCount === 0) {
      setCurrentStep('review');
      setHasCheckedResume(true);
    } else {
      // Everything is ready - check if user wants to resume or start fresh
      if (!hasCheckedResume) {
        setShowResumeModal(true);
      }
    }
  }, [data, isLoading, hasCheckedResume]);

  const handleNext = (fromStep: PipelineStep) => {
    // Mark current step as completed if it has required data
    if (!completedSteps.includes(fromStep)) {
      setCompletedSteps([...completedSteps, fromStep]);
    }

    // Move to next step
    const steps: PipelineStep[] = ['contacts', 'scripts', 'review', 'audio', 'send'];
    const currentIndex = steps.indexOf(fromStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = (fromStep: PipelineStep) => {
    const steps: PipelineStep[] = ['contacts', 'scripts', 'review', 'audio', 'send'];
    const currentIndex = steps.indexOf(fromStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleDataUpdate = () => {
    // Refresh campaign stats when data changes
    fetchCampaignStats();
  };

  const handleSendAgain = () => {
    setShowResumeModal(false);
    setHasCheckedResume(true);
    setCurrentStep('send');
  };

  const handleStartFresh = () => {
    setShowResumeModal(false);
    setHasCheckedResume(true);
    setCurrentStep('contacts');
    setCompletedSteps([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isLight ? 'border-blue-600' : 'border-emerald-500'} mx-auto mb-4`}></div>
          <p className={isLight ? 'text-gray-600' : 'text-gray-400'}>Loading campaign...</p>
        </div>
      </div>
    );
  }

  const handleStepClick = (step: PipelineStep) => {
    setCurrentStep(step);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Resume or Start Fresh Modal */}
      {showResumeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${isLight ? 'bg-white' : 'bg-gray-800'} rounded-lg shadow-xl max-w-md w-full mx-4 p-6`}>
            <h3 className={`text-xl font-bold mb-3 ${isLight ? 'text-gray-900' : 'text-white'}`}>
              Campaign Ready to Send
            </h3>
            <p className={`text-sm mb-6 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              This campaign has {data.contactCount} contacts, {data.scriptCount} scripts, and {data.audioCount} audio files ready.
              What would you like to do?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSendAgain}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isLight
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                Send Again
              </button>
              <button
                onClick={handleStartFresh}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isLight
                    ? 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                Start Fresh (New Contacts & Scripts)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step Indicator */}
      <PipelineStepIndicator
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Step Content */}
      <div className="mt-8">
        {currentStep === 'contacts' && (
          <PipelineContactsStep
            campaign={campaign}
            contactCount={data.contactCount}
            onNext={() => handleNext('contacts')}
            onBack={undefined}
          />
        )}

        {currentStep === 'scripts' && (
          <PipelineScriptsStep
            campaign={campaign}
            contactCount={data.contactCount}
            scriptCount={data.scriptCount}
            onNext={() => handleNext('scripts')}
            onBack={() => handleBack('scripts')}
            onScriptsGenerated={handleDataUpdate}
          />
        )}

        {currentStep === 'review' && (
          <PipelineReviewStep
            campaign={campaign}
            scriptCount={data.scriptCount}
            onNext={() => handleNext('review')}
            onBack={() => handleBack('review')}
            onScriptsUpdated={handleDataUpdate}
          />
        )}

        {currentStep === 'audio' && (
          <PipelineAudioStep
            campaign={campaign}
            scriptCount={data.scriptCount}
            audioCount={data.audioCount}
            onNext={() => handleNext('audio')}
            onBack={() => handleBack('audio')}
            onAudioGenerated={handleDataUpdate}
          />
        )}

        {currentStep === 'send' && (
          <PipelineSendStep
            campaign={campaign}
            contactCount={data.contactCount}
            scriptCount={data.scriptCount}
            audioCount={data.audioCount}
            onBack={() => handleBack('send')}
            onRefresh={onRefresh}
          />
        )}
      </div>

      {/* Quick Jump (for debugging/testing) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">Dev Tools - Quick Jump:</p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentStep('contacts')}
              className="text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50"
            >
              Contacts
            </button>
            <button
              onClick={() => setCurrentStep('scripts')}
              className="text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50"
            >
              Scripts
            </button>
            <button
              onClick={() => setCurrentStep('review')}
              className="text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50"
            >
              Review
            </button>
            <button
              onClick={() => setCurrentStep('audio')}
              className="text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50"
            >
              Audio
            </button>
            <button
              onClick={() => setCurrentStep('send')}
              className="text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50"
            >
              Send
            </button>
            <button
              onClick={handleDataUpdate}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Stats
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Stats: {data.contactCount} contacts, {data.scriptCount} scripts,{' '}
            {data.audioCount} audio
          </div>
        </div>
      )}
    </div>
  );
}
