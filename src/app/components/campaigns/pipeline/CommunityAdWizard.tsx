'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { uploadToCloudinary } from '@/app/utils/cloudinaryUpload';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import { adBudgetToCredits, AD_SPEND_CREDITS_PER_DOLLAR } from '@/config/credit-costs';
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
  type PageType = 'community' | 'landing' | 'blog' | 'custom';
  const [pageType, setPageType] = useState<PageType>('community');
  // Directory drill-down state
  const [regions, setRegions] = useState<any[]>([]);
  const [subdivisions, setSubdivisions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [communityPageVariant, setCommunityPageVariant] = useState<'buy' | 'sell' | 'community'>('buy');
  // Other page types
  const [landingPages, setLandingPages] = useState<CommunityPage[]>([]);
  const [blogPosts, setBlogPosts] = useState<CommunityPage[]>([]);
  const [pageSearch, setPageSearch] = useState('');
  const [selectedPage, setSelectedPage] = useState<CommunityPage | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [loadingPages, setLoadingPages] = useState(false);

  // --- Step 2: Audience ---
  const [metaAudienceType, setMetaAudienceType] = useState<'contacts' | 'visitors'>('visitors');
  const [geoCenter, setGeoCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [geoAddress, setGeoAddress] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(5);

  // --- Step 3: Configure ---
  // Google PPC
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [googleHeadlines, setGoogleHeadlines] = useState(['', '', '']);
  const [googleDescriptions, setGoogleDescriptions] = useState(['', '']);
  const [googleBudget, setGoogleBudget] = useState(10);

  // Meta Retargeting
  const [metaImageUrl, setMetaImageUrl] = useState('');
  const [metaMediaType, setMetaMediaType] = useState<'image' | 'video'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Fetch page data based on page type
  useEffect(() => {
    const fetchPages = async () => {
      setLoadingPages(true);
      try {
        if (pageType === 'community' && regions.length === 0) {
          // Lightweight reference endpoint — just names and slugs
          const res = await fetch('/api/neighborhoods/reference');
          const data = await res.json();
          if (data.regions) setRegions(data.regions);
        } else if (pageType === 'landing' && landingPages.length === 0) {
          // Must pass excludeLandingPages=false to get LP articles back
          const res = await fetch('/api/articles/list?excludeLandingPages=false&limit=100');
          const data = await res.json();
          if (data.articles) {
            setLandingPages(
              data.articles
                .filter((a: any) => a.category === 'landing-page')
                .map((a: any) => ({
                  name: a.title, city: '', slug: a.slug, url: `/lp/${a.slug}`,
                }))
            );
          }
        } else if (pageType === 'blog' && blogPosts.length === 0) {
          // Default excludeLandingPages=true already filters out LPs
          const res = await fetch('/api/articles/list?limit=100');
          const data = await res.json();
          if (data.articles) {
            setBlogPosts(data.articles.map((a: any) => ({
              name: a.title,
              city: a.category?.replace(/-/g, ' ') || '',
              slug: a.slug,
              url: `/insights/${a.category}/${a.slug}`,
            })));
          }
        }
      } catch {
        // Fallback
      } finally {
        setLoadingPages(false);
      }
    };
    fetchPages();
  }, [pageType]);

  // Lazy-load subdivisions when a city is selected
  useEffect(() => {
    if (!selectedCity) { setSubdivisions([]); return; }
    const fetchSubs = async () => {
      setLoadingSubs(true);
      try {
        const res = await fetch(`/api/neighborhoods/reference?city=${selectedCity}`);
        const data = await res.json();
        if (data.subdivisions) setSubdivisions(data.subdivisions);
      } catch {
        setSubdivisions([]);
      } finally {
        setLoadingSubs(false);
      }
    };
    fetchSubs();
  }, [selectedCity]);

  // Auto-generate keywords + ad copy when page is selected
  useEffect(() => {
    if (!selectedPage) return;

    const name = selectedPage.name;
    const city = selectedPage.city;

    if (pageType === 'community') {
      setKeywords([
        `${name} homes for sale`,
        `${city} homes for sale`,
        `homes for sale in ${name}`,
        `${name} real estate`,
        `${name} ${city} homes`,
      ]);
      setGoogleHeadlines([
        `${name} Homes for Sale`.substring(0, 30),
        `Browse ${name} Listings`.substring(0, 30),
        `${city} Real Estate`.substring(0, 30),
      ]);
      setGoogleDescriptions([
        `View all homes for sale in ${name}, ${city}. See prices, photos & market stats. Contact JP Sardella today.`.substring(0, 90),
        `Find your dream home in ${name}. Browse active listings with virtual tours and neighborhood details.`.substring(0, 90),
      ]);
      setMetaHeadline(`Homes for Sale in ${name}`.substring(0, 40));
      setMetaPrimaryText(`Looking for a home in ${name}, ${city}? Browse active listings with prices, photos, and market data. See what's available today.`);

    } else if (pageType === 'landing') {
      // Landing page — keywords from the title
      const titleWords = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
      setKeywords([
        name.toLowerCase().substring(0, 50),
        ...titleWords.slice(0, 3).map(w => `${w} real estate`),
      ].filter(Boolean));
      setGoogleHeadlines([
        name.substring(0, 30),
        `Learn More — Free Guide`.substring(0, 30),
        `JP Sardella, Realtor`.substring(0, 30),
      ]);
      setGoogleDescriptions([
        `${name}. Expert guidance from JP Sardella, DRE 02106916. Get started today.`.substring(0, 90),
        `Free resource for home buyers and sellers in the Coachella Valley. Learn more now.`.substring(0, 90),
      ]);
      setMetaHeadline(name.substring(0, 40));
      setMetaPrimaryText(`${name}. Get expert real estate guidance from JP Sardella. Click to learn more.`);

    } else if (pageType === 'blog') {
      // Blog post — keywords from title + category
      const category = city; // city field holds category for blog posts
      setKeywords([
        name.toLowerCase().substring(0, 50),
        `${category} coachella valley`,
        `coachella valley real estate`,
      ].filter(Boolean));
      setGoogleHeadlines([
        name.substring(0, 30),
        `Coachella Valley Insights`.substring(0, 30),
        `Read the Full Article`.substring(0, 30),
      ]);
      setGoogleDescriptions([
        `${name}. Real estate insights from JP Sardella, your Coachella Valley expert.`.substring(0, 90),
        `Stay informed on the Coachella Valley market. Expert analysis and local knowledge.`.substring(0, 90),
      ]);
      setMetaHeadline(name.substring(0, 40));
      setMetaPrimaryText(`${name}. Stay informed with expert Coachella Valley real estate insights from JP Sardella.`);
    }
  }, [selectedPage, pageType]);

  // Filtered lists for landing pages and blog posts
  const filteredLandingPages = landingPages.filter(c =>
    c.name.toLowerCase().includes(pageSearch.toLowerCase())
  ).slice(0, 20);
  const filteredBlogPosts = blogPosts.filter(c =>
    c.name.toLowerCase().includes(pageSearch.toLowerCase()) ||
    c.city.toLowerCase().includes(pageSearch.toLowerCase())
  ).slice(0, 20);

  // Directory drill-down helpers
  const currentRegion = regions.find((r: any) => r.slug === selectedRegion);
  const currentCounty = currentRegion?.counties?.find((c: any) => c.slug === selectedCounty);
  const currentCity = currentCounty?.cities?.find((c: any) => c.slug === selectedCity);

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

  const pageUrl = pageType === 'custom' ? customUrl : (selectedPage?.url ? `https://jpsrealtor.com${selectedPage.url}` : '');
  const totalBudget = (enableGoogle ? googleBudget : 0) + (enableMeta ? metaBudget : 0);

  const buildPayload = () => ({
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
  });

  const handleSaveDraft = async () => {
    setIsLaunching(true);
    setLaunchResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/save-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (res.ok) {
        setLaunchResult({ success: true, message: 'Ad configuration saved as draft. You can come back to edit or launch later.' });
        if (!completedSteps.includes('launch')) setCompletedSteps([...completedSteps, 'launch']);
        onRefresh?.();
      } else {
        setLaunchResult({ success: false, message: data.error || 'Failed to save' });
      }
    } catch {
      setLaunchResult({ success: false, message: 'Network error — please try again' });
    } finally {
      setIsLaunching(false);
    }
  };

  const handleLaunch = async () => {
    setIsLaunching(true);
    setLaunchResult(null);
    try {
      // Save config first
      await fetch(`/api/campaigns/${campaign.id}/save-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });

      // Launch via Google Ads API + Meta Marketing API
      const res = await fetch(`/api/campaigns/${campaign.id}/launch-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();

      setLaunchResult({
        success: data.success,
        message: data.message || (data.success ? 'Campaigns launched!' : 'Launch failed'),
      });
      if (data.success && !completedSteps.includes('launch')) {
        setCompletedSteps([...completedSteps, 'launch']);
      }
      onRefresh?.();
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

              {/* Page Type Tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {([
                  { id: 'community' as PageType, label: 'Community' },
                  { id: 'landing' as PageType, label: 'Landing Page' },
                  { id: 'blog' as PageType, label: 'Blog Post' },
                  { id: 'custom' as PageType, label: 'Custom URL' },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setPageType(tab.id);
                      setSelectedPage(null);
                      setPageSearch('');
                      setSelectedRegion(null);
                      setSelectedCounty(null);
                      setSelectedCity(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pageType === tab.id
                        ? isLight ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'
                        : isLight ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ---- COMMUNITY: Drill-down Region → County → City → Subdivision ---- */}
              {pageType === 'community' && (
                <div>
                  {/* Breadcrumb */}
                  {(selectedRegion || selectedCounty || selectedCity) && (
                    <div className={`flex items-center gap-1 text-sm mb-3 flex-wrap`}>
                      <button onClick={() => { setSelectedRegion(null); setSelectedCounty(null); setSelectedCity(null); setSelectedPage(null); }}
                        className={`${isLight ? 'text-purple-600 hover:text-purple-700' : 'text-indigo-400 hover:text-indigo-300'}`}>
                        All Regions
                      </button>
                      {selectedRegion && currentRegion && (
                        <>
                          <span className={textSecondary}>/</span>
                          <button onClick={() => { setSelectedCounty(null); setSelectedCity(null); setSelectedPage(null); }}
                            className={`${isLight ? 'text-purple-600 hover:text-purple-700' : 'text-indigo-400 hover:text-indigo-300'}`}>
                            {currentRegion.name}
                          </button>
                        </>
                      )}
                      {selectedCounty && currentCounty && (
                        <>
                          <span className={textSecondary}>/</span>
                          <button onClick={() => { setSelectedCity(null); setSelectedPage(null); }}
                            className={`${isLight ? 'text-purple-600 hover:text-purple-700' : 'text-indigo-400 hover:text-indigo-300'}`}>
                            {currentCounty.name}
                          </button>
                        </>
                      )}
                      {selectedCity && currentCity && (
                        <>
                          <span className={textSecondary}>/</span>
                          <span className={`font-medium ${textPrimary}`}>{currentCity.name}</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Buy / Sell / Community toggle — shown when city is selected */}
                  {selectedCity && (
                    <div className="flex gap-2 mb-3">
                      {([
                        { id: 'buy' as const, label: 'Buy Page' },
                        { id: 'sell' as const, label: 'Sell Page' },
                        { id: 'community' as const, label: 'Community Page' },
                      ]).map((v) => (
                        <button key={v.id}
                          onClick={() => {
                            setCommunityPageVariant(v.id);
                            if (selectedPage && currentCity) {
                              setSelectedPage({
                                ...selectedPage,
                                url: v.id === 'community'
                                  ? `/neighborhoods/${currentCity.slug}/${selectedPage.slug}`
                                  : `/neighborhoods/${currentCity.slug}/${selectedPage.slug}/${v.id}`,
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            communityPageVariant === v.id
                              ? isLight ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'
                              : isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="max-h-72 overflow-y-auto space-y-1">
                    {loadingPages ? (
                      <p className={`text-sm ${textSecondary} text-center py-4`}>Loading...</p>
                    ) : !selectedRegion ? (
                      /* Level 1: Regions */
                      regions.map((region: any) => (
                        <button key={region.slug} onClick={() => setSelectedRegion(region.slug)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isLight ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white' : 'border-gray-700 hover:border-indigo-500 hover:bg-indigo-900/20 bg-gray-800'
                          }`}>
                          <div className="flex justify-between items-center">
                            <p className={`font-medium ${textPrimary}`}>{region.name}</p>
                            <span className={textSecondary}>›</span>
                          </div>
                        </button>
                      ))
                    ) : !selectedCounty ? (
                      /* Level 2: Counties */
                      (currentRegion?.counties || []).map((county: any) => (
                        <button key={county.slug} onClick={() => setSelectedCounty(county.slug)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isLight ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white' : 'border-gray-700 hover:border-indigo-500 hover:bg-indigo-900/20 bg-gray-800'
                          }`}>
                          <div className="flex justify-between items-center">
                            <p className={`font-medium ${textPrimary}`}>{county.name}</p>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs ${textSecondary}`}>{county.cities?.length} cities</span>
                              <span className={textSecondary}>›</span>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : !selectedCity ? (
                      /* Level 3: Cities */
                      (currentCounty?.cities || []).map((city: any) => (
                        <button key={city.slug} onClick={() => setSelectedCity(city.slug)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            isLight ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white' : 'border-gray-700 hover:border-indigo-500 hover:bg-indigo-900/20 bg-gray-800'
                          }`}>
                          <div className="flex justify-between items-center">
                            <p className={`font-medium ${textPrimary}`}>{city.name}</p>
                            <span className={textSecondary}>›</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      /* Level 4: Subdivisions (lazy-loaded) */
                      <>
                        {loadingSubs ? (
                          <p className={`text-sm ${textSecondary} text-center py-4`}>Loading subdivisions...</p>
                        ) : subdivisions.length === 0 ? (
                          <p className={`text-sm ${textSecondary} text-center py-4`}>No subdivisions found in {currentCity?.name}</p>
                        ) : (
                          subdivisions.map((sub: any) => (
                            <button key={sub.slug}
                              onClick={() => setSelectedPage({
                                name: sub.name,
                                city: currentCity.name,
                                slug: sub.slug,
                                url: communityPageVariant === 'community'
                                  ? `/neighborhoods/${currentCity.slug}/${sub.slug}`
                                  : `/neighborhoods/${currentCity.slug}/${sub.slug}/${communityPageVariant}`,
                              })}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                selectedPage?.slug === sub.slug
                                  ? isLight ? 'border-purple-500 bg-purple-50' : 'border-indigo-500 bg-indigo-900/30'
                                  : isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                              }`}>
                              <p className={`font-medium ${textPrimary}`}>{sub.name}</p>
                            </button>
                          ))
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ---- LANDING PAGES & BLOG POSTS: Searchable list ---- */}
              {(pageType === 'landing' || pageType === 'blog') && (
                <>
                  <input type="text" value={pageSearch} onChange={(e) => setPageSearch(e.target.value)}
                    placeholder={pageType === 'landing' ? 'Search landing pages...' : 'Search blog posts...'}
                    className={`${inputClasses} mb-4`}
                  />
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {loadingPages ? (
                      <p className={`text-sm ${textSecondary} text-center py-4`}>Loading...</p>
                    ) : (pageType === 'landing' ? filteredLandingPages : filteredBlogPosts).length === 0 ? (
                      <p className={`text-sm ${textSecondary} text-center py-4`}>
                        {pageType === 'landing' ? 'No landing pages found' : 'No blog posts found'}
                      </p>
                    ) : (
                      (pageType === 'landing' ? filteredLandingPages : filteredBlogPosts).map((page) => (
                        <button key={page.slug} onClick={() => setSelectedPage(page)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            selectedPage?.slug === page.slug
                              ? isLight ? 'border-purple-500 bg-purple-50' : 'border-indigo-500 bg-indigo-900/30'
                              : isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-gray-700 hover:border-gray-600 bg-gray-800'
                          }`}>
                          <p className={`font-medium ${textPrimary}`}>{page.name}</p>
                          {page.city && <p className={`text-xs ${textSecondary} capitalize`}>{page.city}</p>}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}

              {/* ---- CUSTOM URL ---- */}
              {pageType === 'custom' && (
                <input type="url" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://jpsrealtor.com/..." className={inputClasses}
                />
              )}

              {/* Selected page summary */}
              {(selectedPage || (pageType === 'custom' && customUrl)) && (
                <div className={`mt-4 p-3 rounded-lg ${isLight ? 'bg-purple-50 border border-purple-200' : 'bg-indigo-900/20 border border-indigo-700/50'}`}>
                  <p className={`text-sm font-medium ${textPrimary}`}>
                    {selectedPage ? `${selectedPage.name}${selectedPage.city ? ` — ${selectedPage.city}` : ''}` : 'Custom URL'}
                  </p>
                  <p className={`text-xs ${isLight ? 'text-purple-600' : 'text-indigo-400'}`}>{pageUrl}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleNext('page')}
                disabled={!selectedPage && !(pageType === 'custom' && customUrl)}
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
                  type="range" min="1" max="50" value={radiusMiles}
                  onChange={(e) => setRadiusMiles(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className={`flex justify-between text-xs ${textSecondary}`}>
                  <span>1 mi</span><span>25 mi</span><span>50 mi</span>
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
                    <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Daily Budget (credits)</label>
                    <input type="number" min="5" value={googleBudget}
                      onChange={(e) => setGoogleBudget(parseFloat(e.target.value) || 0)}
                      className={inputClasses}
                    />
                    <p className={`text-xs ${textSecondary} mt-1`}>~{adBudgetToCredits(googleBudget, 30)} credits/month</p>
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
                  {/* Ad Creative Upload */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>Ad Creative</label>

                    {/* Upload area */}
                    {!metaImageUrl ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                          isLight
                            ? 'border-gray-300 hover:border-purple-400 hover:bg-purple-50'
                            : 'border-gray-600 hover:border-indigo-400 hover:bg-indigo-900/10'
                        }`}
                      >
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className={`animate-spin h-8 w-8 border-3 ${isLight ? 'border-purple-600' : 'border-indigo-400'} border-t-transparent rounded-full`} />
                            <p className={`text-sm ${textSecondary}`}>Uploading to Cloudinary...</p>
                          </div>
                        ) : (
                          <>
                            <div className={`text-3xl mb-2`}>📸</div>
                            <p className={`text-sm font-medium ${textPrimary}`}>Click to upload image or video</p>
                            <p className={`text-xs ${textSecondary} mt-1`}>JPG, PNG, MP4, MOV — max 10MB</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        {metaMediaType === 'video' ? (
                          <video src={metaImageUrl} controls className="w-full max-h-48 rounded-lg border" />
                        ) : (
                          <img src={metaImageUrl} alt="Ad creative" className="w-full max-h-48 object-cover rounded-lg border" />
                        )}
                        <button
                          onClick={() => { setMetaImageUrl(''); setMetaMediaType('image'); }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploading(true);
                        try {
                          const urls = await uploadToCloudinary([file], 'jpsrealtor/campaigns/ads');
                          if (urls[0]) {
                            setMetaImageUrl(urls[0]);
                            setMetaMediaType(file.type.startsWith('video/') ? 'video' : 'image');
                          }
                        } catch (err) {
                          console.error('Upload failed:', err);
                        } finally {
                          setIsUploading(false);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }
                      }}
                    />
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
                    <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Daily Budget (credits)</label>
                    <input type="number" min="5" value={metaBudget}
                      onChange={(e) => setMetaBudget(parseFloat(e.target.value) || 0)}
                      className={inputClasses}
                    />
                    <p className={`text-xs ${textSecondary} mt-1`}>~{adBudgetToCredits(metaBudget, 30)} credits/month</p>
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
                      <span className={`font-semibold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>{googleBudget * AD_SPEND_CREDITS_PER_DOLLAR} credits/day</span>
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
                      <span className={`font-semibold ${isLight ? 'text-pink-700' : 'text-pink-400'}`}>{metaBudget * AD_SPEND_CREDITS_PER_DOLLAR} credits/day</span>
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
                <p className={`text-3xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>{totalBudget * AD_SPEND_CREDITS_PER_DOLLAR} credits/day</p>
                <p className={`text-sm ${textSecondary}`}>~{adBudgetToCredits(totalBudget, 30)} credits/month</p>
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
                <div className="space-y-3">
                  <button
                    onClick={handleSaveDraft}
                    disabled={isLaunching || (!enableGoogle && !enableMeta)}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLaunching ? 'Saving...' : 'Save as Draft'}
                  </button>
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
                        Saving & Launching...
                      </span>
                    ) : (
                      `Launch Campaign — ${totalBudget * AD_SPEND_CREDITS_PER_DOLLAR} credits/day`
                    )}
                  </button>
                </div>
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
