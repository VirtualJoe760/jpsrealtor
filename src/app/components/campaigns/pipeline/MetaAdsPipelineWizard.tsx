'use client';

import { useState } from 'react';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import { adBudgetToCredits, AD_SPEND_CREDITS_PER_DOLLAR } from '@/config/credit-costs';
import PipelineStepIndicator, { META_ADS_STEPS } from './PipelineStepIndicator';

type Objective = 'OUTCOME_LEADS' | 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS';
type Placement = 'facebook_feed' | 'instagram_feed' | 'instagram_stories' | 'instagram_reels' | 'audience_network';
type CallToAction = 'LEARN_MORE' | 'SIGN_UP' | 'GET_OFFER' | 'CONTACT_US';
type GeoType = 'radius' | 'zip';

interface MetaAdsPipelineWizardProps {
  campaign: any;
  onRefresh?: () => void;
}

interface MetaAdsConfig {
  objective: Objective;
  budget: number;
  geoTargeting: {
    type: GeoType;
    center?: { lat: number; lng: number };
    radiusMiles?: number;
    zipCodes: string;
  };
  landingPageUrl: string;
  headline: string;
  primaryText: string;
  description: string;
  imageUrl: string;
  videoUrl: string;
  callToAction: CallToAction;
  placements: Placement[];
  startDate: string;
  endDate: string;
}

const OBJECTIVE_OPTIONS: { value: Objective; label: string; description: string }[] = [
  { value: 'OUTCOME_LEADS', label: 'Lead Generation', description: 'Collect leads via forms — best for buyer/seller inquiries' },
  { value: 'OUTCOME_TRAFFIC', label: 'Website Traffic', description: 'Drive visitors to your landing page' },
  { value: 'OUTCOME_AWARENESS', label: 'Brand Awareness', description: 'Reach the most people in your target area' },
];

const PLACEMENT_OPTIONS: { value: Placement; label: string }[] = [
  { value: 'facebook_feed', label: 'Facebook Feed' },
  { value: 'instagram_feed', label: 'Instagram Feed' },
  { value: 'instagram_stories', label: 'Instagram Stories' },
  { value: 'instagram_reels', label: 'Instagram Reels' },
  { value: 'audience_network', label: 'Audience Network' },
];

const CTA_OPTIONS: { value: CallToAction; label: string }[] = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'CONTACT_US', label: 'Contact Us' },
];

export default function MetaAdsPipelineWizard({
  campaign,
  onRefresh,
}: MetaAdsPipelineWizardProps) {
  const { currentTheme } = useTheme();
  const { cardBg, cardBorder, textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [currentStep, setCurrentStep] = useState('audience');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [contactCount] = useState(campaign.totalContacts || 0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ success: boolean; message: string } | null>(null);
  const [useCustomAudience, setUseCustomAudience] = useState(false);
  const [useLookalike, setUseLookalike] = useState(false);

  const [config, setConfig] = useState<MetaAdsConfig>({
    objective: 'OUTCOME_LEADS',
    budget: 20,
    geoTargeting: {
      type: 'radius',
      radiusMiles: 25,
      zipCodes: '',
    },
    landingPageUrl: '',
    headline: '',
    primaryText: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    callToAction: 'LEARN_MORE',
    placements: ['facebook_feed', 'instagram_feed'],
    startDate: '',
    endDate: '',
  });

  const steps = META_ADS_STEPS.map(s => s.id);

  const handleNext = (fromStep: string) => {
    if (!completedSteps.includes(fromStep)) {
      setCompletedSteps([...completedSteps, fromStep]);
    }
    const idx = steps.indexOf(fromStep);
    if (idx < steps.length - 1) setCurrentStep(steps[idx + 1]);
  };

  const handleBack = (fromStep: string) => {
    const idx = steps.indexOf(fromStep);
    if (idx > 0) setCurrentStep(steps[idx - 1]);
  };

  const inputClasses = `w-full px-3 py-2 rounded-lg border ${
    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
  }`;

  const togglePlacement = (p: Placement) => {
    setConfig({
      ...config,
      placements: config.placements.includes(p)
        ? config.placements.filter(x => x !== p)
        : [...config.placements, p],
    });
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    setLaunchResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/launch-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'meta',
          ...config,
          geoTargeting: {
            ...config.geoTargeting,
            zipCodes: config.geoTargeting.zipCodes
              ? config.geoTargeting.zipCodes.split(',').map(z => z.trim())
              : [],
          },
          useCustomAudience,
          useLookalike,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLaunchResult({ success: true, message: 'Meta Ads campaign launched successfully!' });
        if (!completedSteps.includes('launch')) setCompletedSteps([...completedSteps, 'launch']);
        onRefresh?.();
      } else {
        setLaunchResult({ success: false, message: data.error || 'Failed to launch campaign' });
      }
    } catch {
      setLaunchResult({ success: false, message: 'Network error — please try again' });
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <PipelineStepIndicator
        steps={META_ADS_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(step) => setCurrentStep(step)}
      />

      <div className="mt-8">
        {/* Step 1: Audience */}
        {currentStep === 'audience' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Target Audience</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>
                Define who sees your Facebook and Instagram ads.
              </p>

              {/* Custom Audience */}
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCustomAudience}
                    onChange={(e) => setUseCustomAudience(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <p className={`font-medium ${textPrimary}`}>Custom Audience from CRM</p>
                    <p className={`text-sm ${textSecondary}`}>Target {contactCount} contacts from your database</p>
                  </div>
                </label>
              </div>

              {/* Lookalike */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useLookalike}
                    onChange={(e) => setUseLookalike(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <div>
                    <p className={`font-medium ${textPrimary}`}>Lookalike Audience</p>
                    <p className={`text-sm ${textSecondary}`}>Find people similar to your best contacts</p>
                  </div>
                </label>
              </div>

              {/* Geo Targeting */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-2`}>Location Targeting</label>
                <div className="flex gap-3 mb-3">
                  {(['radius', 'zip'] as GeoType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setConfig({
                        ...config,
                        geoTargeting: { ...config.geoTargeting, type },
                      })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                        config.geoTargeting.type === type
                          ? 'bg-pink-600 text-white'
                          : isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {type === 'zip' ? 'ZIP Codes' : 'Radius'}
                    </button>
                  ))}
                </div>

                {config.geoTargeting.type === 'radius' && (
                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="number"
                      value={config.geoTargeting.center?.lat || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        geoTargeting: {
                          ...config.geoTargeting,
                          center: { lat: parseFloat(e.target.value) || 0, lng: config.geoTargeting.center?.lng || 0 },
                        },
                      })}
                      placeholder="Latitude"
                      className={inputClasses}
                    />
                    <input
                      type="number"
                      value={config.geoTargeting.center?.lng || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        geoTargeting: {
                          ...config.geoTargeting,
                          center: { lat: config.geoTargeting.center?.lat || 0, lng: parseFloat(e.target.value) || 0 },
                        },
                      })}
                      placeholder="Longitude"
                      className={inputClasses}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={config.geoTargeting.radiusMiles || ''}
                        onChange={(e) => setConfig({
                          ...config,
                          geoTargeting: { ...config.geoTargeting, radiusMiles: parseInt(e.target.value) || 0 },
                        })}
                        placeholder="Miles"
                        className={inputClasses}
                      />
                      <span className={`text-sm ${textSecondary} whitespace-nowrap`}>mi</span>
                    </div>
                  </div>
                )}

                {config.geoTargeting.type === 'zip' && (
                  <input
                    type="text"
                    value={config.geoTargeting.zipCodes}
                    onChange={(e) => setConfig({
                      ...config,
                      geoTargeting: { ...config.geoTargeting, zipCodes: e.target.value },
                    })}
                    placeholder="92260, 92253, 92211..."
                    className={inputClasses}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleNext('audience')}
                className={`px-6 py-3 rounded-lg font-medium text-white bg-pink-600 hover:bg-pink-700`}
              >
                Campaign Setup →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Campaign Setup */}
        {currentStep === 'campaign' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Campaign Setup</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>Choose your objective, budget, and schedule.</p>

              {/* Objective */}
              <div className="mb-6">
                <label className={`block text-sm font-medium ${textPrimary} mb-3`}>Campaign Objective</label>
                <div className="grid gap-3">
                  {OBJECTIVE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setConfig({ ...config, objective: opt.value })}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        config.objective === opt.value
                          ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30'
                          : isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                      }`}
                    >
                      <p className={`font-medium ${textPrimary}`}>{opt.label}</p>
                      <p className={`text-sm ${textSecondary}`}>{opt.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Daily Budget (credits)</label>
                <input
                  type="number"
                  min="1"
                  value={config.budget}
                  onChange={(e) => setConfig({ ...config, budget: parseFloat(e.target.value) || 0 })}
                  className={inputClasses}
                />
                <p className={`text-xs ${textSecondary} mt-1`}>
                  Estimated monthly: {adBudgetToCredits(config.budget, 30)} credits
                </p>
              </div>

              {/* Landing Page */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Landing Page URL</label>
                <input
                  type="url"
                  value={config.landingPageUrl}
                  onChange={(e) => setConfig({ ...config, landingPageUrl: e.target.value })}
                  placeholder="https://chatrealty.io/lp/your-landing-page"
                  className={inputClasses}
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Start Date</label>
                  <input type="date" value={config.startDate} onChange={(e) => setConfig({ ...config, startDate: e.target.value })} className={inputClasses} />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textPrimary} mb-1`}>End Date (optional)</label>
                  <input type="date" value={config.endDate} onChange={(e) => setConfig({ ...config, endDate: e.target.value })} className={inputClasses} />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => handleBack('campaign')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
              <button onClick={() => handleNext('campaign')} className="px-6 py-3 rounded-lg font-medium text-white bg-pink-600 hover:bg-pink-700">
                Creative →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Creative */}
        {currentStep === 'creative' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Ad Creative</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>Create the visual and copy for your ad.</p>

              {/* Primary Text */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Primary Text</label>
                <textarea
                  value={config.primaryText}
                  onChange={(e) => setConfig({ ...config, primaryText: e.target.value })}
                  rows={3}
                  placeholder="The main body text of your ad — what people see first"
                  className={inputClasses}
                />
              </div>

              {/* Headline */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Headline</label>
                <input
                  type="text"
                  value={config.headline}
                  onChange={(e) => setConfig({ ...config, headline: e.target.value })}
                  placeholder="Bold headline below the image"
                  className={inputClasses}
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Description (optional)</label>
                <input
                  type="text"
                  value={config.description}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  placeholder="Additional description text"
                  className={inputClasses}
                />
              </div>

              {/* Image URL */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Image URL</label>
                <input
                  type="url"
                  value={config.imageUrl}
                  onChange={(e) => setConfig({ ...config, imageUrl: e.target.value })}
                  placeholder="https://example.com/ad-image.jpg"
                  className={inputClasses}
                />
                {config.imageUrl && (
                  <div className="mt-2 border rounded-lg overflow-hidden max-w-xs">
                    <img src={config.imageUrl} alt="Ad preview" className="w-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                )}
              </div>

              {/* Video URL */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Video URL (optional — overrides image)</label>
                <input
                  type="url"
                  value={config.videoUrl}
                  onChange={(e) => setConfig({ ...config, videoUrl: e.target.value })}
                  placeholder="https://example.com/ad-video.mp4"
                  className={inputClasses}
                />
              </div>

              {/* Call to Action */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Call to Action Button</label>
                <select
                  value={config.callToAction}
                  onChange={(e) => setConfig({ ...config, callToAction: e.target.value as CallToAction })}
                  className={inputClasses}
                >
                  {CTA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => handleBack('creative')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
              <button
                onClick={() => handleNext('creative')}
                disabled={!config.primaryText || !config.headline}
                className="px-6 py-3 rounded-lg font-medium text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Placements →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Placements */}
        {currentStep === 'placements' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Ad Placements</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>
                Choose where your ad appears. Select at least one placement.
              </p>

              <div className="grid gap-3">
                {PLACEMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => togglePlacement(opt.value)}
                    className={`text-left p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                      config.placements.includes(opt.value)
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/30'
                        : isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      config.placements.includes(opt.value)
                        ? 'border-pink-500 bg-pink-500 text-white'
                        : isLight ? 'border-gray-300' : 'border-gray-600'
                    }`}>
                      {config.placements.includes(opt.value) && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`font-medium ${textPrimary}`}>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => handleBack('placements')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
              <button
                onClick={() => handleNext('placements')}
                disabled={config.placements.length === 0}
                className="px-6 py-3 rounded-lg font-medium text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review & Launch →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Launch */}
        {currentStep === 'launch' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Review & Launch</h3>

              <div className={`p-4 rounded-lg mb-6 ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={textSecondary}>Objective: </span>
                    <span className={`font-medium ${textPrimary}`}>
                      {OBJECTIVE_OPTIONS.find(o => o.value === config.objective)?.label}
                    </span>
                  </div>
                  <div>
                    <span className={textSecondary}>Daily Budget: </span>
                    <span className={`font-medium ${isLight ? 'text-green-600' : 'text-green-400'}`}>{config.budget * AD_SPEND_CREDITS_PER_DOLLAR} credits/day</span>
                  </div>
                  <div>
                    <span className={textSecondary}>Placements: </span>
                    <span className={`font-medium ${textPrimary}`}>
                      {config.placements.map(p => p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className={textSecondary}>CTA: </span>
                    <span className={`font-medium ${textPrimary}`}>
                      {CTA_OPTIONS.find(c => c.value === config.callToAction)?.label}
                    </span>
                  </div>
                  {useCustomAudience && (
                    <div>
                      <span className={textSecondary}>Custom Audience: </span>
                      <span className={`font-medium ${textPrimary}`}>{contactCount} contacts</span>
                    </div>
                  )}
                  {useLookalike && (
                    <div>
                      <span className={`font-medium ${isLight ? 'text-pink-600' : 'text-pink-400'}`}>+ Lookalike Audience</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className={textSecondary}>Headline: </span>
                    <span className={`font-medium ${textPrimary}`}>{config.headline}</span>
                  </div>
                  <div className="col-span-2">
                    <span className={textSecondary}>Primary Text: </span>
                    <span className={`font-medium ${textPrimary}`}>{config.primaryText}</span>
                  </div>
                </div>
              </div>

              {/* Ad Preview Card */}
              {(config.imageUrl || config.headline) && (
                <div className={`rounded-lg overflow-hidden mb-6 max-w-sm mx-auto ${isLight ? 'bg-white shadow-lg' : 'bg-gray-800 shadow-lg'}`}>
                  {config.imageUrl && (
                    <img src={config.imageUrl} alt="Ad" className="w-full aspect-square object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div className="p-3">
                    <p className={`text-xs ${textSecondary} mb-1`}>jpsrealtor.com</p>
                    <p className={`font-semibold text-sm ${textPrimary}`}>{config.headline}</p>
                    {config.description && <p className={`text-xs ${textSecondary}`}>{config.description}</p>}
                    <div className={`mt-2 text-center py-2 rounded text-sm font-medium ${isLight ? 'bg-gray-100 text-gray-700' : 'bg-gray-700 text-gray-300'}`}>
                      {CTA_OPTIONS.find(c => c.value === config.callToAction)?.label}
                    </div>
                  </div>
                </div>
              )}

              {/* Launch Result */}
              {launchResult && (
                <div className={`p-4 rounded-lg mb-6 ${
                  launchResult.success
                    ? isLight ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-700/50'
                    : isLight ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-700/50'
                }`}>
                  <p className={`text-sm font-medium ${
                    launchResult.success ? isLight ? 'text-green-700' : 'text-green-400' : isLight ? 'text-red-700' : 'text-red-400'
                  }`}>
                    {launchResult.message}
                  </p>
                </div>
              )}

              {!launchResult?.success && (
                <button
                  onClick={handleLaunch}
                  disabled={isLaunching}
                  className="w-full py-4 rounded-lg font-semibold text-lg text-white bg-pink-600 hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLaunching ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Launching Meta Ads...
                    </span>
                  ) : (
                    `Launch Meta Ads — ${config.budget * AD_SPEND_CREDITS_PER_DOLLAR} credits/day`
                  )}
                </button>
              )}
            </div>

            <div className="flex justify-start">
              <button onClick={() => handleBack('launch')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back to Placements
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
