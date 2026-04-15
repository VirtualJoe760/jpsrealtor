'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import PipelineStepIndicator from './PipelineStepIndicator';
import type { StepDefinition } from './PipelineStepIndicator';

const PinDropMap = dynamic(() => import('../PinDropMap'), { ssr: false });

interface CommunityAdWizardProps {
  campaign: any;
  onRefresh?: () => void;
}

const STEPS: StepDefinition[] = [
  { id: 'page', label: 'Page', icon: '🏘️' },
  { id: 'audience', label: 'Audience', icon: '🎯' },
  { id: 'configure', label: 'Configure', icon: '⚙️' },
  { id: 'launch', label: 'Launch', icon: '🚀' },
];

interface CommunityPage {
  name: string;
  city: string;
  slug: string;
  url: string;
  listingCount?: number;
}

// --- Meta Placements ---
const META_PLACEMENTS = [
  { id: 'facebook_feed', label: 'Facebook Feed' },
  { id: 'instagram_feed', label: 'Instagram Feed' },
  { id: 'instagram_stories', label: 'Instagram Stories' },
  { id: 'instagram_reels', label: 'Instagram Reels' },
];

export default function CommunityAdWizard({ campaign, onRefresh }: CommunityAdWizardProps) {
  const { currentTheme } = useTheme();
  const { cardBg, cardBorder, textPrimary, textSecondary } = useThemeClasses();
  const isLight = currentTheme === 'lightgradient';

  const [currentStep, setCurrentStep] = useState('page');
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // --- Step 1: Page Selection ---
  const [communities, setCommunities] = useState<CommunityPage[]>([]);
  const [communitySearch, setCommunitySearch] = useState('');
  const [selectedPage, setSelectedPage] = useState<CommunityPage | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [loadingCommunities, setLoadingCommunities] = useState(false);

  // --- Step 2: Audience ---
  const [metaAudienceType, setMetaAudienceType] = useState<'contacts' | 'visitors'>('visitors');
  const [geoCenter, setGeoCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [geoAddress, setGeoAddress] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(10);

  // --- Step 3: Configure ---
  // Google PPC
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [googleHeadlines, setGoogleHeadlines] = useState(['', '', '']);
  const [googleDescriptions, setGoogleDescriptions] = useState(['', '']);
  const [googleBudget, setGoogleBudget] = useState(10);

  // Meta Retargeting
  const [metaImageUrl, setMetaImageUrl] = useState('');
  const [metaPrimaryText, setMetaPrimaryText] = useState('');
  const [metaHeadline, setMetaHeadline] = useState('');
  const [metaPlacements, setMetaPlacements] = useState(['facebook_feed', 'instagram_feed']);
  const [metaBudget, setMetaBudget] = useState(8);

  // --- Step 4: Launch ---
  const [enableGoogle, setEnableGoogle] = useState(true);
  const [enableMeta, setEnableMeta] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ success: boolean; message: string } | null>(null);

  const inputClasses = `w-full px-3 py-2 rounded-lg border ${
    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
  }`;

  // Fetch communities for page selector
  useEffect(() => {
    const fetchCommunities = async () => {
      setLoadingCommunities(true);
      try {
        const res = await fetch('/api/subdivisions?limit=200&sortBy=listingCount');
        const data = await res.json();
        if (data.subdivisions) {
          setCommunities(data.subdivisions.map((s: any) => ({
            name: s.name,
            city: s.city,
            slug: s.slug,
            url: `/neighborhoods/${s.cityId || s.city?.toLowerCase().replace(/\s+/g, '-')}/${s.slug}/buy`,
            listingCount: s.listingCount || s.cmaStats?.totalListings || 0,
          })));
        }
      } catch {
        // Fallback — communities will load from search
      } finally {
        setLoadingCommunities(false);
      }
    };
    fetchCommunities();
  }, []);

  // Auto-generate keywords + ad copy when page is selected
  useEffect(() => {
    if (!selectedPage) return;

    const name = selectedPage.name;
    const city = selectedPage.city;

    // Auto-suggest keywords
    setKeywords([
      `${name} homes for sale`,
      `${city} homes for sale`,
      `homes for sale in ${name}`,
      `${name} real estate`,
      `${name} ${city} homes`,
    ]);

    // Auto-generate Google ad copy
    setGoogleHeadlines([
      `${name} Homes for Sale`.substring(0, 30),
      `Browse ${name} Listings`.substring(0, 30),
      `${city} Real Estate`.substring(0, 30),
    ]);
    setGoogleDescriptions([
      `View all homes for sale in ${name}, ${city}. See prices, photos & market stats. Contact JP Sardella today.`.substring(0, 90),
      `Find your dream home in ${name}. Browse active listings with virtual tours and neighborhood details.`.substring(0, 90),
    ]);

    // Auto-generate Meta ad copy
    setMetaHeadline(`Homes for Sale in ${name}`.substring(0, 40));
    setMetaPrimaryText(`Looking for a home in ${name}, ${city}? Browse active listings with prices, photos, and market data. See what's available today.`);
  }, [selectedPage]);

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(communitySearch.toLowerCase()) ||
    c.city.toLowerCase().includes(communitySearch.toLowerCase())
  ).slice(0, 20);

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

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const togglePlacement = (p: string) => {
    setMetaPlacements(metaPlacements.includes(p)
      ? metaPlacements.filter(x => x !== p)
      : [...metaPlacements, p]);
  };

  const pageUrl = useCustomUrl ? customUrl : (selectedPage?.url ? `https://jpsrealtor.com${selectedPage.url}` : '');
  const totalBudget = (enableGoogle ? googleBudget : 0) + (enableMeta ? metaBudget : 0);

  const handleLaunch = async () => {
    setIsLaunching(true);
    setLaunchResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/launch-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl,
          pageName: selectedPage?.name || 'Custom',
          google: enableGoogle ? {
            keywords,
            headlines: googleHeadlines.filter(Boolean),
            descriptions: googleDescriptions.filter(Boolean),
            budget: googleBudget,
            geoTargeting: geoCenter ? { type: 'radius', center: geoCenter, radiusMiles } : undefined,
          } : undefined,
          meta: enableMeta ? {
            audienceType: metaAudienceType,
            imageUrl: metaImageUrl,
            primaryText: metaPrimaryText,
            headline: metaHeadline,
            placements: metaPlacements,
            budget: metaBudget,
          } : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLaunchResult({ success: true, message: 'Campaign launched successfully!' });
        if (!completedSteps.includes('launch')) setCompletedSteps([...completedSteps, 'launch']);
        onRefresh?.();
      } else {
        setLaunchResult({ success: false, message: data.error || 'Failed to launch' });
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

        {/* ============ STEP 1: SELECT PAGE ============ */}
        {currentStep === 'page' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Select a Community Page</h3>
              <p className={`text-sm ${textSecondary} mb-4`}>
                Choose which community or neighborhood page to promote. Google PPC will drive search traffic to this page, and Meta will retarget visitors.
              </p>

              {/* Toggle: Community vs Custom URL */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setUseCustomUrl(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !useCustomUrl
                      ? isLight ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'
                      : isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Community Page
                </button>
                <button
                  onClick={() => setUseCustomUrl(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    useCustomUrl
                      ? isLight ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'
                      : isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Custom URL
                </button>
              </div>

              {!useCustomUrl ? (
                <>
                  {/* Search */}
                  <input
                    type="text"
                    value={communitySearch}
                    onChange={(e) => setCommunitySearch(e.target.value)}
                    placeholder="Search communities..."
                    className={`${inputClasses} mb-4`}
                  />

                  {/* Community List */}
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {loadingCommunities ? (
                      <p className={`text-sm ${textSecondary} text-center py-4`}>Loading communities...</p>
                    ) : filteredCommunities.length === 0 ? (
                      <p className={`text-sm ${textSecondary} text-center py-4`}>No communities found</p>
                    ) : (
                      filteredCommunities.map((community) => (
                        <button
                          key={community.slug}
                          onClick={() => setSelectedPage(community)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            selectedPage?.slug === community.slug
                              ? isLight ? 'border-purple-500 bg-purple-50' : 'border-indigo-500 bg-indigo-900/30'
                              : isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className={`font-medium ${textPrimary}`}>{community.name}</p>
                              <p className={`text-xs ${textSecondary}`}>{community.city}</p>
                            </div>
                            {community.listingCount > 0 && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                isLight ? 'bg-gray-100 text-gray-600' : 'bg-gray-700 text-gray-400'
                              }`}>
                                {community.listingCount} listings
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://jpsrealtor.com/neighborhoods/..."
                  className={inputClasses}
                />
              )}

              {/* Selected page summary */}
              {(selectedPage || customUrl) && (
                <div className={`mt-4 p-3 rounded-lg ${isLight ? 'bg-purple-50 border border-purple-200' : 'bg-indigo-900/20 border border-indigo-700/50'}`}>
                  <p className={`text-sm font-medium ${textPrimary}`}>
                    {selectedPage ? `${selectedPage.name} — ${selectedPage.city}` : 'Custom URL'}
                  </p>
                  <p className={`text-xs ${isLight ? 'text-purple-600' : 'text-indigo-400'}`}>{pageUrl}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleNext('page')}
                disabled={!selectedPage && !customUrl}
                className={`px-6 py-3 rounded-lg font-medium text-white ${
                  isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Set Audience →
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 2: AUDIENCE ============ */}
        {currentStep === 'audience' && (
          <div className="space-y-6">
            {/* Meta Audience */}
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Meta Retargeting Audience</h3>
              <p className={`text-sm ${textSecondary} mb-4`}>
                Who should see retargeting ads on Facebook and Instagram?
              </p>

              <div className="space-y-3 mb-4">
                <button
                  onClick={() => setMetaAudienceType('visitors')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    metaAudienceType === 'visitors'
                      ? isLight ? 'border-pink-500 bg-pink-50' : 'border-pink-500 bg-pink-900/30'
                      : isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  <p className={`font-medium ${textPrimary}`}>Website Visitors</p>
                  <p className={`text-sm ${textSecondary}`}>Retarget people who visited your site (via Meta Pixel) — shows ads to people who already know you</p>
                </button>
                <button
                  onClick={() => setMetaAudienceType('contacts')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    metaAudienceType === 'contacts'
                      ? isLight ? 'border-pink-500 bg-pink-50' : 'border-pink-500 bg-pink-900/30'
                      : isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800'
                  }`}
                >
                  <p className={`font-medium ${textPrimary}`}>CRM Contacts</p>
                  <p className={`text-sm ${textSecondary}`}>Upload your contacts as a Custom Audience — show ads to people in your database</p>
                </button>
              </div>

              <div className={`p-3 rounded-lg text-sm ${isLight ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-yellow-900/20 border border-yellow-700/50 text-yellow-300'}`}>
                Housing Special Ad Category is auto-applied. No age, gender, or ZIP targeting on Meta.
              </div>
            </div>

            {/* Google PPC Geo Targeting */}
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Google PPC Targeting Area</h3>
              <p className={`text-sm ${textSecondary} mb-4`}>
                Drop a pin on the map to set the area where your Google search ads will show.
              </p>

              <div className="mb-3">
                <label className={`block text-sm ${textSecondary} mb-1`}>
                  Radius: <span className={`font-semibold ${textPrimary}`}>{radiusMiles} miles</span>
                </label>
                <input
                  type="range" min="5" max="50" value={radiusMiles}
                  onChange={(e) => setRadiusMiles(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className={`flex justify-between text-xs ${textSecondary}`}>
                  <span>5 mi</span><span>25 mi</span><span>50 mi</span>
                </div>
              </div>

              <PinDropMap
                radiusMiles={radiusMiles}
                onChange={(loc) => {
                  setGeoCenter({ lat: loc.lat, lng: loc.lng });
                  if (loc.address) setGeoAddress(loc.address);
                }}
                height="300px"
                searchPlaceholder="Search for the community or neighborhood..."
              />

              {geoAddress && (
                <p className={`text-sm ${textSecondary} mt-2`}>
                  Ads will show to searchers near: <span className={`font-medium ${textPrimary}`}>{geoAddress}</span>
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => handleBack('audience')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
              <button onClick={() => handleNext('audience')} className={`px-6 py-3 rounded-lg font-medium text-white ${isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                Configure Ads →
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 3: CONFIGURE ============ */}
        {currentStep === 'configure' && (
          <div className="space-y-6">

            {/* Google PPC Config */}
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>Google Search PPC</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={enableGoogle} onChange={(e) => setEnableGoogle(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className={`text-sm ${textSecondary}`}>Enabled</span>
                </label>
              </div>

              {enableGoogle && (
                <div className="space-y-4">
                  {/* Keywords */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>Keywords</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {keywords.map((kw) => (
                        <span key={kw} className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                          isLight ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/40 text-blue-300'
                        }`}>
                          {kw}
                          <button onClick={() => removeKeyword(kw)} className="hover:opacity-70">&times;</button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                        placeholder="Add keyword..."
                        className={inputClasses}
                      />
                      <button onClick={addKeyword} className={`px-4 py-2 rounded-lg text-sm font-medium ${isLight ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Headlines */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>Headlines (max 30 chars)</label>
                    {googleHeadlines.map((h, i) => (
                      <input key={i} type="text" maxLength={30} value={h}
                        onChange={(e) => { const hl = [...googleHeadlines]; hl[i] = e.target.value; setGoogleHeadlines(hl); }}
                        placeholder={`Headline ${i + 1}`}
                        className={`${inputClasses} mb-2`}
                      />
                    ))}
                  </div>

                  {/* Descriptions */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>Descriptions (max 90 chars)</label>
                    {googleDescriptions.map((d, i) => (
                      <textarea key={i} maxLength={90} value={d} rows={2}
                        onChange={(e) => { const desc = [...googleDescriptions]; desc[i] = e.target.value; setGoogleDescriptions(desc); }}
                        placeholder={`Description ${i + 1}`}
                        className={`${inputClasses} mb-2`}
                      />
                    ))}
                  </div>

                  {/* Budget */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Daily Budget ($)</label>
                    <input type="number" min="5" value={googleBudget}
                      onChange={(e) => setGoogleBudget(parseFloat(e.target.value) || 0)}
                      className={inputClasses}
                    />
                    <p className={`text-xs ${textSecondary} mt-1`}>~${(googleBudget * 30).toFixed(0)}/month</p>
                  </div>
                </div>
              )}
            </div>

            {/* Meta Retargeting Config */}
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>Meta Retargeting</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={enableMeta} onChange={(e) => setEnableMeta(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className={`text-sm ${textSecondary}`}>Enabled</span>
                </label>
              </div>

              {enableMeta && (
                <div className="space-y-4">
                  {/* Image */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Ad Image URL</label>
                    <input type="url" value={metaImageUrl}
                      onChange={(e) => setMetaImageUrl(e.target.value)}
                      placeholder="https://example.com/community-photo.jpg"
                      className={inputClasses}
                    />
                    {metaImageUrl && (
                      <div className="mt-2 border rounded-lg overflow-hidden max-w-xs">
                        <img src={metaImageUrl} alt="Ad" className="w-full" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>

                  {/* Primary Text */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Primary Text</label>
                    <textarea value={metaPrimaryText}
                      onChange={(e) => setMetaPrimaryText(e.target.value)}
                      rows={3} className={inputClasses}
                    />
                  </div>

                  {/* Headline */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Headline</label>
                    <input type="text" value={metaHeadline}
                      onChange={(e) => setMetaHeadline(e.target.value)}
                      className={inputClasses}
                    />
                  </div>

                  {/* Placements */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>Placements</label>
                    <div className="flex flex-wrap gap-2">
                      {META_PLACEMENTS.map((p) => (
                        <button key={p.id} onClick={() => togglePlacement(p.id)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            metaPlacements.includes(p.id)
                              ? 'bg-pink-500 text-white'
                              : isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Budget */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Daily Budget ($)</label>
                    <input type="number" min="5" value={metaBudget}
                      onChange={(e) => setMetaBudget(parseFloat(e.target.value) || 0)}
                      className={inputClasses}
                    />
                    <p className={`text-xs ${textSecondary} mt-1`}>~${(metaBudget * 30).toFixed(0)}/month</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => handleBack('configure')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
              <button
                onClick={() => handleNext('configure')}
                disabled={!enableGoogle && !enableMeta}
                className={`px-6 py-3 rounded-lg font-medium text-white ${isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Review & Launch →
              </button>
            </div>
          </div>
        )}

        {/* ============ STEP 4: REVIEW & LAUNCH ============ */}
        {currentStep === 'launch' && (
          <div className="space-y-6">
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Review & Launch</h3>

              {/* Page */}
              <div className={`p-4 rounded-lg mb-4 ${isLight ? 'bg-purple-50 border border-purple-200' : 'bg-indigo-900/20 border border-indigo-700/50'}`}>
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {selectedPage ? `${selectedPage.name} — ${selectedPage.city}` : 'Custom URL'}
                </p>
                <p className={`text-xs ${isLight ? 'text-purple-600' : 'text-indigo-400'}`}>{pageUrl}</p>
              </div>

              {/* Channel summaries */}
              <div className="space-y-3 mb-6">
                {enableGoogle && (
                  <div className={`p-4 rounded-lg ${isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-700/50'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className={`font-medium ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>Google Search PPC</h4>
                      <span className={`font-semibold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>${googleBudget}/day</span>
                    </div>
                    <div className={`text-sm ${textSecondary} space-y-1`}>
                      <p>Keywords: {keywords.length} ({keywords.slice(0, 3).join(', ')}{keywords.length > 3 ? '...' : ''})</p>
                      <p>Headlines: {googleHeadlines.filter(Boolean).join(' | ')}</p>
                      {geoAddress && <p>Geo: {radiusMiles}mi around {geoAddress.split(',').slice(0, 2).join(',')}</p>}
                    </div>
                  </div>
                )}

                {enableMeta && (
                  <div className={`p-4 rounded-lg ${isLight ? 'bg-pink-50 border border-pink-200' : 'bg-pink-900/20 border border-pink-700/50'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className={`font-medium ${isLight ? 'text-pink-700' : 'text-pink-400'}`}>Meta Retargeting</h4>
                      <span className={`font-semibold ${isLight ? 'text-pink-700' : 'text-pink-400'}`}>${metaBudget}/day</span>
                    </div>
                    <div className={`text-sm ${textSecondary} space-y-1`}>
                      <p>Audience: {metaAudienceType === 'visitors' ? 'Website Visitors (Pixel)' : 'CRM Contacts'}</p>
                      <p>Placements: {metaPlacements.map(p => p.replace(/_/g, ' ')).join(', ')}</p>
                      <p>Headline: {metaHeadline}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Budget */}
              <div className={`p-4 rounded-lg mb-6 text-center ${isLight ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-700/50'}`}>
                <p className={`text-sm ${textSecondary}`}>Total Daily Budget</p>
                <p className={`text-3xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>${totalBudget}/day</p>
                <p className={`text-sm ${textSecondary}`}>~${(totalBudget * 30).toFixed(0)}/month</p>
              </div>

              {/* Launch Result */}
              {launchResult && (
                <div className={`p-4 rounded-lg mb-4 ${
                  launchResult.success
                    ? isLight ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-700/50'
                    : isLight ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-700/50'
                }`}>
                  <p className={`text-sm font-medium ${
                    launchResult.success ? isLight ? 'text-green-700' : 'text-green-400' : isLight ? 'text-red-700' : 'text-red-400'
                  }`}>{launchResult.message}</p>
                </div>
              )}

              {!launchResult?.success && (
                <button
                  onClick={handleLaunch}
                  disabled={isLaunching || (!enableGoogle && !enableMeta)}
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
                    `Launch Campaign — $${totalBudget}/day`
                  )}
                </button>
              )}
            </div>

            <div className="flex justify-start">
              <button onClick={() => handleBack('launch')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
