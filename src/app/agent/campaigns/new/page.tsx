// app/agent/campaigns/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  MapPinIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import AgentNav from '@/app/components/AgentNav';
import ContactSelector from '@/app/components/campaigns/ContactSelector';
import { useThemeClasses, useTheme } from '@/app/contexts/ThemeContext';

// Campaign Types
const campaignTypes = [
  {
    id: 'sphere_of_influence',
    label: 'Sphere of Influence',
    description: 'Regular touchpoints with your network of contacts',
    icon: UserGroupIcon,
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'past_clients',
    label: 'Past Clients',
    description: 'Re-engage with clients you\'ve worked with before',
    icon: SparklesIcon,
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 'neighborhood_expireds',
    label: 'Expired Listings',
    description: 'Target expired listings in specific neighborhoods',
    icon: MapPinIcon,
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 'high_equity',
    label: 'High Equity',
    description: 'Homeowners with significant equity positions',
    icon: SparklesIcon,
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'custom',
    label: 'Custom Campaign',
    description: 'Build a custom campaign from scratch',
    icon: SparklesIcon,
    gradient: 'from-indigo-500 to-blue-500',
  },
];

// Strategy options
const strategies = [
  {
    id: 'voicemail',
    label: 'Voicemail Drop',
    description: 'Automated voicemail messages',
    icon: PhoneIcon,
    color: 'purple',
  },
  {
    id: 'email',
    label: 'Email',
    description: 'Personalized email campaigns',
    icon: EnvelopeIcon,
    color: 'blue',
  },
  {
    id: 'text',
    label: 'SMS/Text',
    description: 'Text message outreach',
    icon: ChatBubbleLeftIcon,
    color: 'green',
  },
];

type CampaignType = 'sphere_of_influence' | 'past_clients' | 'neighborhood_expireds' | 'high_equity' | 'custom';

interface CampaignFormData {
  type: CampaignType | null;
  name: string;
  description: string;
  neighborhood: string;
  strategies: {
    voicemail: boolean;
    email: boolean;
    text: boolean;
  };
  contactIds: string[];
  schedule: 'immediate' | 'scheduled';
  scheduledDate?: string;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const { cardBg, cardBorder, textPrimary, textSecondary, buttonPrimary, bgSecondary, border } = useThemeClasses();
  const { currentTheme } = useTheme();
  const isLight = currentTheme === 'lightgradient';

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<CampaignFormData>({
    type: null,
    name: '',
    description: '',
    neighborhood: '',
    strategies: {
      voicemail: false,
      email: false,
      text: false,
    },
    contactIds: [],
    schedule: 'immediate',
  });

  const totalSteps = 5;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Successfully created campaign
        router.push('/agent/campaigns');
      } else {
        // Handle error
        console.error('Failed to create campaign:', data.error);
        alert(data.error || 'Failed to create campaign');
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      alert('An error occurred while creating the campaign');
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.type !== null;
      case 2:
        return formData.name.trim() !== '';
      case 3:
        return formData.strategies.voicemail || formData.strategies.email || formData.strategies.text;
      case 4:
        return formData.contactIds.length > 0;
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AgentNav />

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/agent/campaigns')}
            className={`flex items-center gap-2 ${textSecondary} hover:${textPrimary} transition-colors mb-4`}
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Campaigns
          </button>
          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>
            Create New Campaign
          </h1>
          <p className={textSecondary}>
            Set up a new marketing campaign in {totalSteps} easy steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className={`${cardBg} ${cardBorder} rounded-xl p-6 mb-8`}>
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => {
              const isCompleted = currentStep > step;
              const isCurrent = currentStep === step;

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                        isCompleted
                          ? `${isLight ? 'bg-blue-600' : 'bg-emerald-600'} text-white`
                          : isCurrent
                          ? `${isLight ? 'border-2 border-blue-600 text-blue-600' : 'border-2 border-emerald-500 text-emerald-400'} ${cardBg}`
                          : `${bgSecondary} ${textSecondary}`
                      }`}
                    >
                      {isCompleted ? <CheckIcon className="w-5 h-5" /> : step}
                    </div>
                    <div className={`text-xs mt-2 font-medium ${isCurrent ? textPrimary : textSecondary}`}>
                      {step === 1 && 'Type'}
                      {step === 2 && 'Details'}
                      {step === 3 && 'Strategies'}
                      {step === 4 && 'Contacts'}
                      {step === 5 && 'Review'}
                    </div>
                  </div>
                  {step < 5 && (
                    <div
                      className={`h-0.5 flex-1 -mt-8 ${
                        currentStep > step
                          ? `${isLight ? 'bg-blue-600' : 'bg-emerald-600'}`
                          : bgSecondary
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: Campaign Type */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>
                  Select Campaign Type
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaignTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === type.id;

                    return (
                      <motion.button
                        key={type.id}
                        onClick={() => setFormData({ ...formData, type: type.id as CampaignType })}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative ${cardBg} rounded-xl border-2 p-6 text-left transition-all ${
                          isSelected
                            ? `${isLight ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-emerald-500 shadow-lg shadow-emerald-500/20'}`
                            : `${cardBorder} hover:${isLight ? 'border-blue-300' : 'border-emerald-700'}`
                        }`}
                      >
                        {/* Gradient Header */}
                        <div className={`h-2 w-full bg-gradient-to-r ${type.gradient} rounded-t-lg absolute top-0 left-0 right-0`} />

                        <div className="mt-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className={`p-3 rounded-lg ${isLight ? 'bg-gray-100' : 'bg-slate-700'}`}>
                              <Icon className={`w-6 h-6 ${textPrimary}`} />
                            </div>
                            {isSelected && (
                              <div className={`p-1 rounded-full ${isLight ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                                <CheckIcon className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
                            {type.label}
                          </h3>
                          <p className={`text-sm ${textSecondary}`}>
                            {type.description}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Campaign Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>
                  Campaign Details
                </h2>
                <div className={`${cardBg} ${cardBorder} rounded-xl p-6 space-y-6`}>
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                      Campaign Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., PDCC Expired Listings - Q1 2026"
                      className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg focus:ring-2 ${
                        isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
                      } focus:border-transparent ${textPrimary} placeholder-gray-400`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the purpose and goals of this campaign..."
                      rows={4}
                      className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg focus:ring-2 ${
                        isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
                      } focus:border-transparent ${textPrimary} placeholder-gray-400 resize-none`}
                    />
                  </div>

                  {(formData.type === 'neighborhood_expireds' || formData.type === 'high_equity') && (
                    <div>
                      <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        Target Neighborhood
                      </label>
                      <input
                        type="text"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        placeholder="e.g., PDCC, Indian Wells, La Quinta"
                        className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg focus:ring-2 ${
                          isLight ? 'focus:ring-blue-500' : 'focus:ring-emerald-500'
                        } focus:border-transparent ${textPrimary} placeholder-gray-400`}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Strategy Selection */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>
                  Select Communication Strategies
                </h2>
                <p className={`${textSecondary} mb-6`}>
                  Choose one or more communication channels for this campaign
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {strategies.map((strategy) => {
                    const Icon = strategy.icon;
                    const isSelected = formData.strategies[strategy.id as keyof typeof formData.strategies];

                    return (
                      <motion.button
                        key={strategy.id}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            strategies: {
                              ...formData.strategies,
                              [strategy.id]: !isSelected,
                            },
                          })
                        }
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`${cardBg} rounded-xl border-2 p-6 text-left transition-all ${
                          isSelected
                            ? `${isLight ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-emerald-500 shadow-lg shadow-emerald-500/20'}`
                            : `${cardBorder} hover:${isLight ? 'border-blue-300' : 'border-emerald-700'}`
                        }`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div
                            className={`p-3 rounded-lg ${
                              strategy.color === 'purple'
                                ? isLight
                                  ? 'bg-purple-100'
                                  : 'bg-purple-900/30'
                                : strategy.color === 'blue'
                                ? isLight
                                  ? 'bg-blue-100'
                                  : 'bg-blue-900/30'
                                : isLight
                                ? 'bg-green-100'
                                : 'bg-green-900/30'
                            }`}
                          >
                            <Icon
                              className={`w-6 h-6 ${
                                strategy.color === 'purple'
                                  ? isLight
                                    ? 'text-purple-600'
                                    : 'text-purple-400'
                                  : strategy.color === 'blue'
                                  ? isLight
                                    ? 'text-blue-600'
                                    : 'text-blue-400'
                                  : isLight
                                  ? 'text-green-600'
                                  : 'text-green-400'
                              }`}
                            />
                          </div>
                          {isSelected && (
                            <div className={`p-1 rounded-full ${isLight ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                              <CheckIcon className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>
                          {strategy.label}
                        </h3>
                        <p className={`text-sm ${textSecondary}`}>
                          {strategy.description}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 4: Select Contacts */}
            {currentStep === 4 && (
              <ContactSelector
                selectedContactIds={formData.contactIds}
                onContactsChange={(contactIds) => setFormData({ ...formData, contactIds })}
              />
            )}

            {/* Step 5: Review & Launch */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className={`text-2xl font-bold ${textPrimary} mb-6`}>
                  Review & Launch
                </h2>
                <div className={`${cardBg} ${cardBorder} rounded-xl p-6 space-y-6`}>
                  <div>
                    <h3 className={`text-sm font-medium ${textSecondary} mb-2`}>Campaign Type</h3>
                    <p className={`text-lg ${textPrimary}`}>
                      {campaignTypes.find((t) => t.id === formData.type)?.label}
                    </p>
                  </div>

                  <div className={`border-t ${border} pt-6`}>
                    <h3 className={`text-sm font-medium ${textSecondary} mb-2`}>Campaign Name</h3>
                    <p className={`text-lg ${textPrimary}`}>{formData.name}</p>
                  </div>

                  {formData.description && (
                    <div className={`border-t ${border} pt-6`}>
                      <h3 className={`text-sm font-medium ${textSecondary} mb-2`}>Description</h3>
                      <p className={textPrimary}>{formData.description}</p>
                    </div>
                  )}

                  {formData.neighborhood && (
                    <div className={`border-t ${border} pt-6`}>
                      <h3 className={`text-sm font-medium ${textSecondary} mb-2`}>Target Neighborhood</h3>
                      <p className={textPrimary}>{formData.neighborhood}</p>
                    </div>
                  )}

                  <div className={`border-t ${border} pt-6`}>
                    <h3 className={`text-sm font-medium ${textSecondary} mb-2`}>Active Strategies</h3>
                    <div className="flex gap-3 mt-3">
                      {formData.strategies.voicemail && (
                        <div className={`flex items-center gap-2 px-3 py-2 ${isLight ? 'bg-purple-100' : 'bg-purple-900/30'} rounded-lg`}>
                          <PhoneIcon className={`w-5 h-5 ${isLight ? 'text-purple-600' : 'text-purple-400'}`} />
                          <span className={`text-sm font-medium ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>
                            Voicemail
                          </span>
                        </div>
                      )}
                      {formData.strategies.email && (
                        <div className={`flex items-center gap-2 px-3 py-2 ${isLight ? 'bg-blue-100' : 'bg-blue-900/30'} rounded-lg`}>
                          <EnvelopeIcon className={`w-5 h-5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                          <span className={`text-sm font-medium ${isLight ? 'text-blue-700' : 'text-blue-300'}`}>
                            Email
                          </span>
                        </div>
                      )}
                      {formData.strategies.text && (
                        <div className={`flex items-center gap-2 px-3 py-2 ${isLight ? 'bg-green-100' : 'bg-green-900/30'} rounded-lg`}>
                          <ChatBubbleLeftIcon className={`w-5 h-5 ${isLight ? 'text-green-600' : 'text-green-400'}`} />
                          <span className={`text-sm font-medium ${isLight ? 'text-green-700' : 'text-green-300'}`}>
                            SMS
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={`border-t ${border} pt-6`}>
                    <h3 className={`text-sm font-medium ${textSecondary} mb-2`}>Selected Contacts</h3>
                    <p className={`text-lg ${textPrimary} mb-6`}>
                      {formData.contactIds.length} contact{formData.contactIds.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>

                  <div className={`border-t ${border} pt-6`}>
                    <h3 className={`text-sm font-medium ${textSecondary} mb-4`}>Launch Schedule</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.schedule === 'immediate'}
                          onChange={() => setFormData({ ...formData, schedule: 'immediate' })}
                          className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-emerald-500'}`}
                        />
                        <span className={textPrimary}>Launch immediately after creation</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.schedule === 'scheduled'}
                          onChange={() => setFormData({ ...formData, schedule: 'scheduled' })}
                          className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-emerald-500'}`}
                        />
                        <span className={textPrimary}>Save as draft (launch later)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pb-8">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              currentStep === 1
                ? `${textSecondary} cursor-not-allowed opacity-50`
                : `${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-700' : 'bg-slate-700 hover:bg-slate-600 text-white'}`
            }`}
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                canProceed()
                  ? `${buttonPrimary}`
                  : `${textSecondary} cursor-not-allowed opacity-50`
              }`}
            >
              Next
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`flex items-center gap-2 px-6 py-3 ${buttonPrimary} rounded-lg font-medium shadow-lg hover:shadow-xl transition-all ${
                submitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {submitting ? (
                <>
                  <div className={`w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin`}></div>
                  Creating Campaign...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  {formData.schedule === 'immediate' ? 'Create & Launch Campaign' : 'Save as Draft'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
