'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import PipelineStepIndicator from './PipelineStepIndicator';
import type { StepDefinition } from './PipelineStepIndicator';

// Leaflet must be loaded client-side only
const PinDropMap = dynamic(() => import('../PinDropMap'), { ssr: false });

type GeoType = 'radius' | 'zip';
type CallToAction = 'LEARN_MORE' | 'SIGN_UP' | 'GET_OFFER' | 'CONTACT_US';

interface DigitalAdsPipelineWizardProps {
  campaign: any;
  onRefresh?: () => void;
}

const STEPS: StepDefinition[] = [
  { id: 'platforms', label: 'Platforms', icon: '📡' },
  { id: 'audience', label: 'Audience', icon: '🎯' },
  { id: 'campaign', label: 'Campaign', icon: '⚙️' },
  { id: 'creative', label: 'Creative', icon: '✍️' },
  { id: 'launch', label: 'Launch', icon: '🚀' },
];

const CTA_OPTIONS: { value: CallToAction; label: string }[] = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'GET_OFFER', label: 'Get Offer' },
  { value: 'CONTACT_US', label: 'Contact Us' },
];

export default function DigitalAdsPipelineWizard({
  campaign,
  onRefresh,
}: DigitalAdsPipelineWizardProps) {
  const { currentTheme } = useTheme();
  const { cardBg, cardBorder, textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [currentStep, setCurrentStep] = useState('platforms');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [contactCount] = useState(campaign.totalContacts || 0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ success: boolean; message: string } | null>(null);

  // Platform selection
  const [enableGoogle, setEnableGoogle] = useState(true);
  const [enableMeta, setEnableMeta] = useState(true);

  // Audience
  const [useCustomAudience, setUseCustomAudience] = useState(false);
  const [useLookalike, setUseLookalike] = useState(false);
  const [geoType, setGeoType] = useState<GeoType>('radius');
  const [geoCenter, setGeoCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [geoAddress, setGeoAddress] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [zipCodes, setZipCodes] = useState('');

  // Campaign setup
  const [budget, setBudget] = useState(20);
  const [landingPageUrl, setLandingPageUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Google-specific
  const [adType, setAdType] = useState<'search' | 'display' | 'performance_max'>('search');
  const [bidStrategy, setBidStrategy] = useState<'maximize_conversions' | 'maximize_clicks' | 'target_cpa'>('maximize_conversions');

  // Meta-specific
  const [objective, setObjective] = useState<'OUTCOME_LEADS' | 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS'>('OUTCOME_LEADS');
  const [placements, setPlacements] = useState<string[]>(['facebook_feed', 'instagram_feed']);

  // Creative
  const [headlines, setHeadlines] = useState(['', '', '']);
  const [descriptions, setDescriptions] = useState(['', '']);
  const [primaryText, setPrimaryText] = useState('');
  const [headline, setHeadline] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [callToAction, setCallToAction] = useState<CallToAction>('LEARN_MORE');

  const steps = STEPS.map(s => s.id);

  const handleNext = (fromStep: string) => {
    if (!completedSteps.includes(fromStep)) setCompletedSteps([...completedSteps, fromStep]);
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

  const togglePlacement = (p: string) => {
    setPlacements(placements.includes(p) ? placements.filter(x => x !== p) : [...placements, p]);
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    setLaunchResult(null);
    try {
      const payload = {
        platforms: {
          google: enableGoogle,
          meta: enableMeta,
        },
        audience: {
          useCustomAudience,
          useLookalike,
          geoTargeting: {
            type: geoType,
            center: geoCenter,
            radiusMiles: geoType === 'radius' ? radiusMiles : undefined,
            zipCodes: geoType === 'zip' ? zipCodes.split(',').map(z => z.trim()) : undefined,
          },
        },
        budget,
        landingPageUrl,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        google: enableGoogle ? { adType, bidStrategy, headlines: headlines.filter(Boolean), descriptions: descriptions.filter(Boolean) } : undefined,
        meta: enableMeta ? { objective, placements, primaryText, headline, imageUrl, callToAction } : undefined,
      };

      const res = await fetch(`/api/campaigns/${campaign.id}/launch-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const platforms = [enableGoogle && 'Google', enableMeta && 'Meta'].filter(Boolean).join(' + ');
        setLaunchResult({ success: true, message: `${platforms} Ads campaign launched successfully!` });
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
        steps={STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={(step) => setCurrentStep(step)}
      />

      <div className="mt-8">
        {/* Step 1: Platform Selection */}
        {currentStep === 'platforms' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Choose Ad Platforms</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>
                Select which platforms to run ads on. You can enable one or both.
              </p>

              <div className="grid gap-4">
                {/* Google Ads */}
                <button
                  onClick={() => setEnableGoogle(!enableGoogle)}
                  className={`text-left p-5 rounded-lg border-2 transition-all ${
                    enableGoogle
                      ? isLight ? 'border-blue-500 bg-blue-50' : 'border-blue-500 bg-blue-900/30'
                      : isLight ? 'border-gray-200 bg-white opacity-60' : 'border-gray-700 bg-gray-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      enableGoogle ? 'border-blue-500 bg-blue-500 text-white' : isLight ? 'border-gray-300' : 'border-gray-600'
                    }`}>
                      {enableGoogle && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold text-lg ${textPrimary}`}>Google Ads</p>
                      <p className={`text-sm ${textSecondary}`}>Search, display, and Performance Max ads across Google</p>
                    </div>
                  </div>
                </button>

                {/* Meta Ads */}
                <button
                  onClick={() => setEnableMeta(!enableMeta)}
                  className={`text-left p-5 rounded-lg border-2 transition-all ${
                    enableMeta
                      ? isLight ? 'border-pink-500 bg-pink-50' : 'border-pink-500 bg-pink-900/30'
                      : isLight ? 'border-gray-200 bg-white opacity-60' : 'border-gray-700 bg-gray-800 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      enableMeta ? 'border-pink-500 bg-pink-500 text-white' : isLight ? 'border-gray-300' : 'border-gray-600'
                    }`}>
                      {enableMeta && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`font-semibold text-lg ${textPrimary}`}>Meta Ads</p>
                      <p className={`text-sm ${textSecondary}`}>Facebook and Instagram feed, Stories, and Reels</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleNext('platforms')}
                disabled={!enableGoogle && !enableMeta}
                className={`px-6 py-3 rounded-lg font-medium text-white ${
                  isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Audience →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Audience & Geo Targeting */}
        {currentStep === 'audience' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Target Audience</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>
                Define who sees your ads using location targeting and CRM audiences.
              </p>

              {/* CRM Audience Toggles */}
              <div className="mb-6 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={useCustomAudience} onChange={(e) => setUseCustomAudience(e.target.checked)} className="w-5 h-5 rounded" />
                  <div>
                    <p className={`font-medium ${textPrimary}`}>Custom Audience from CRM</p>
                    <p className={`text-sm ${textSecondary}`}>Target {contactCount} contacts from your database</p>
                  </div>
                </label>
                {enableMeta && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={useLookalike} onChange={(e) => setUseLookalike(e.target.checked)} className="w-5 h-5 rounded" />
                    <div>
                      <p className={`font-medium ${textPrimary}`}>Lookalike Audience (Meta only)</p>
                      <p className={`text-sm ${textSecondary}`}>Find people similar to your best contacts</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Geo Targeting Type */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-2`}>Location Targeting</label>
                <div className="flex gap-3 mb-4">
                  {(['radius', 'zip'] as GeoType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setGeoType(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        geoType === type
                          ? isLight ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'
                          : isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {type === 'zip' ? 'ZIP Codes' : 'Radius on Map'}
                    </button>
                  ))}
                </div>

                {geoType === 'radius' && (
                  <div className="space-y-3">
                    {/* Radius slider */}
                    <div>
                      <label className={`block text-sm ${textSecondary} mb-1`}>
                        Radius: <span className={`font-semibold ${textPrimary}`}>{radiusMiles} miles</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={radiusMiles}
                        onChange={(e) => setRadiusMiles(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <div className={`flex justify-between text-xs ${textSecondary}`}>
                        <span>1 mi</span>
                        <span>25 mi</span>
                        <span>50 mi</span>
                      </div>
                    </div>

                    {/* Pin Drop Map */}
                    <PinDropMap
                      lat={geoCenter?.lat}
                      lng={geoCenter?.lng}
                      radiusMiles={radiusMiles}
                      onChange={(loc) => {
                        setGeoCenter({ lat: loc.lat, lng: loc.lng });
                        if (loc.address) setGeoAddress(loc.address);
                      }}
                      height="350px"
                      searchPlaceholder="Search for a neighborhood, city, or address..."
                    />

                    {geoAddress && (
                      <p className={`text-sm ${textSecondary}`}>
                        Targeting area around: <span className={`font-medium ${textPrimary}`}>{geoAddress}</span>
                      </p>
                    )}
                  </div>
                )}

                {geoType === 'zip' && (
                  <div>
                    <input
                      type="text"
                      value={zipCodes}
                      onChange={(e) => setZipCodes(e.target.value)}
                      placeholder="92260, 92253, 92211, 92203..."
                      className={inputClasses}
                    />
                    <p className={`text-xs ${textSecondary} mt-1`}>Separate ZIP codes with commas</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => handleBack('audience')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
              <button onClick={() => handleNext('audience')} className={`px-6 py-3 rounded-lg font-medium text-white ${isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                Campaign Setup →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Campaign Setup */}
        {currentStep === 'campaign' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Campaign Setup</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>Configure budget, landing page, and platform-specific settings.</p>

              {/* Shared: Budget */}
              <div className="mb-4">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Daily Budget ($)</label>
                <input
                  type="number" min="1" value={budget}
                  onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                  className={inputClasses}
                />
                <p className={`text-xs ${textSecondary} mt-1`}>
                  Estimated monthly: ${(budget * 30).toFixed(0)}
                  {enableGoogle && enableMeta && ` ($${(budget * 15).toFixed(0)}/platform)`}
                </p>
              </div>

              {/* Shared: Landing Page */}
              <div className="mb-6">
                <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Landing Page URL</label>
                <input
                  type="url" value={landingPageUrl}
                  onChange={(e) => setLandingPageUrl(e.target.value)}
                  placeholder="https://jpsrealtor.com/lp/your-landing-page"
                  className={inputClasses}
                />
              </div>

              {/* Shared: Schedule */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClasses} />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${textPrimary} mb-1`}>End Date (optional)</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClasses} />
                </div>
              </div>

              {/* Google-specific settings */}
              {enableGoogle && (
                <div className={`p-4 rounded-lg mb-4 ${isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-700/50'}`}>
                  <h4 className={`text-sm font-semibold ${isLight ? 'text-blue-700' : 'text-blue-400'} mb-3`}>Google Ads Settings</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-xs font-medium ${textPrimary} mb-1`}>Ad Type</label>
                      <select value={adType} onChange={(e) => setAdType(e.target.value as any)} className={inputClasses}>
                        <option value="search">Search Ads</option>
                        <option value="display">Display Ads</option>
                        <option value="performance_max">Performance Max</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${textPrimary} mb-1`}>Bid Strategy</label>
                      <select value={bidStrategy} onChange={(e) => setBidStrategy(e.target.value as any)} className={inputClasses}>
                        <option value="maximize_conversions">Maximize Conversions</option>
                        <option value="maximize_clicks">Maximize Clicks</option>
                        <option value="target_cpa">Target CPA</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Meta-specific settings */}
              {enableMeta && (
                <div className={`p-4 rounded-lg mb-4 ${isLight ? 'bg-pink-50 border border-pink-200' : 'bg-pink-900/20 border border-pink-700/50'}`}>
                  <h4 className={`text-sm font-semibold ${isLight ? 'text-pink-700' : 'text-pink-400'} mb-3`}>Meta Ads Settings</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={`block text-xs font-medium ${textPrimary} mb-1`}>Objective</label>
                      <select value={objective} onChange={(e) => setObjective(e.target.value as any)} className={inputClasses}>
                        <option value="OUTCOME_LEADS">Lead Generation</option>
                        <option value="OUTCOME_TRAFFIC">Website Traffic</option>
                        <option value="OUTCOME_AWARENESS">Brand Awareness</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${textPrimary} mb-1`}>Call to Action</label>
                      <select value={callToAction} onChange={(e) => setCallToAction(e.target.value as CallToAction)} className={inputClasses}>
                        {CTA_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${textPrimary} mb-2`}>Placements</label>
                    <div className="flex flex-wrap gap-2">
                      {['facebook_feed', 'instagram_feed', 'instagram_stories', 'instagram_reels', 'audience_network'].map((p) => (
                        <button
                          key={p}
                          onClick={() => togglePlacement(p)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            placements.includes(p)
                              ? 'bg-pink-500 text-white'
                              : isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => handleBack('campaign')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
              <button onClick={() => handleNext('campaign')} className={`px-6 py-3 rounded-lg font-medium text-white ${isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                Creative →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Creative */}
        {currentStep === 'creative' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Ad Creative</h3>
              <p className={`text-sm ${textSecondary} mb-6`}>Create the copy and visuals for your ads.</p>

              {/* Google Headlines (if enabled) */}
              {enableGoogle && (
                <div className={`p-4 rounded-lg mb-6 ${isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-700/50'}`}>
                  <h4 className={`text-sm font-semibold ${isLight ? 'text-blue-700' : 'text-blue-400'} mb-3`}>Google Ads Copy</h4>
                  <div className="mb-3">
                    <label className={`block text-xs font-medium ${textPrimary} mb-2`}>Headlines (max 30 chars each)</label>
                    {headlines.map((h, i) => (
                      <input key={i} type="text" maxLength={30} value={h}
                        onChange={(e) => { const hl = [...headlines]; hl[i] = e.target.value; setHeadlines(hl); }}
                        placeholder={`Headline ${i + 1}`}
                        className={`${inputClasses} mb-2`}
                      />
                    ))}
                    {headlines.length < 15 && (
                      <button onClick={() => setHeadlines([...headlines, ''])} className={`text-xs ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                        + Add headline
                      </button>
                    )}
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${textPrimary} mb-2`}>Descriptions (max 90 chars each)</label>
                    {descriptions.map((d, i) => (
                      <textarea key={i} maxLength={90} value={d} rows={2}
                        onChange={(e) => { const desc = [...descriptions]; desc[i] = e.target.value; setDescriptions(desc); }}
                        placeholder={`Description ${i + 1}`}
                        className={`${inputClasses} mb-2`}
                      />
                    ))}
                    {descriptions.length < 4 && (
                      <button onClick={() => setDescriptions([...descriptions, ''])} className={`text-xs ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                        + Add description
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Meta Creative (if enabled) */}
              {enableMeta && (
                <div className={`p-4 rounded-lg mb-6 ${isLight ? 'bg-pink-50 border border-pink-200' : 'bg-pink-900/20 border border-pink-700/50'}`}>
                  <h4 className={`text-sm font-semibold ${isLight ? 'text-pink-700' : 'text-pink-400'} mb-3`}>Meta Ads Creative</h4>
                  <div className="mb-3">
                    <label className={`block text-xs font-medium ${textPrimary} mb-1`}>Primary Text</label>
                    <textarea value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} rows={3}
                      placeholder="The main body text people see first"
                      className={inputClasses}
                    />
                  </div>
                  <div className="mb-3">
                    <label className={`block text-xs font-medium ${textPrimary} mb-1`}>Headline</label>
                    <input type="text" value={headline} onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Bold headline below the image"
                      className={inputClasses}
                    />
                  </div>
                  <div className="mb-3">
                    <label className={`block text-xs font-medium ${textPrimary} mb-1`}>Image URL</label>
                    <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://example.com/ad-image.jpg"
                      className={inputClasses}
                    />
                    {imageUrl && (
                      <div className="mt-2 border rounded-lg overflow-hidden max-w-xs">
                        <img src={imageUrl} alt="Ad preview" className="w-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => handleBack('creative')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
              <button onClick={() => handleNext('creative')} className={`px-6 py-3 rounded-lg font-medium text-white ${isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                Review & Launch →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Launch */}
        {currentStep === 'launch' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Review & Launch</h3>

              <div className={`p-4 rounded-lg mb-6 ${isLight ? 'bg-gray-50' : 'bg-gray-800'}`}>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={textSecondary}>Platforms: </span>
                    <span className={`font-medium ${textPrimary}`}>
                      {[enableGoogle && 'Google', enableMeta && 'Meta'].filter(Boolean).join(' + ')}
                    </span>
                  </div>
                  <div>
                    <span className={textSecondary}>Daily Budget: </span>
                    <span className={`font-medium ${isLight ? 'text-green-600' : 'text-green-400'}`}>${budget}/day</span>
                  </div>
                  <div>
                    <span className={textSecondary}>Targeting: </span>
                    <span className={`font-medium ${textPrimary}`}>
                      {geoType === 'radius'
                        ? `${radiusMiles}mi radius${geoAddress ? ` — ${geoAddress.split(',').slice(0, 2).join(',')}` : ''}`
                        : `${zipCodes.split(',').length} ZIP codes`}
                    </span>
                  </div>
                  {useCustomAudience && (
                    <div>
                      <span className={textSecondary}>Custom Audience: </span>
                      <span className={`font-medium ${textPrimary}`}>{contactCount} contacts</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className={textSecondary}>Landing Page: </span>
                    <span className={`font-medium ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                      {landingPageUrl || 'Not set'}
                    </span>
                  </div>
                  {enableGoogle && (
                    <div className="col-span-2">
                      <span className={textSecondary}>Google Headlines: </span>
                      <span className={`font-medium ${textPrimary}`}>{headlines.filter(Boolean).join(' | ') || 'None'}</span>
                    </div>
                  )}
                  {enableMeta && (
                    <div className="col-span-2">
                      <span className={textSecondary}>Meta Headline: </span>
                      <span className={`font-medium ${textPrimary}`}>{headline || 'None'}</span>
                    </div>
                  )}
                  {enableMeta && placements.length > 0 && (
                    <div className="col-span-2">
                      <span className={textSecondary}>Placements: </span>
                      <span className={`font-medium ${textPrimary}`}>
                        {placements.map(p => p.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

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
                  className={`w-full py-4 rounded-lg font-semibold text-lg text-white transition-colors ${
                    isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLaunching ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Launching...
                    </span>
                  ) : (
                    `Launch ${[enableGoogle && 'Google', enableMeta && 'Meta'].filter(Boolean).join(' + ')} Ads — $${budget}/day`
                  )}
                </button>
              )}
            </div>

            <div className="flex justify-start">
              <button onClick={() => handleBack('launch')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back to Creative
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
