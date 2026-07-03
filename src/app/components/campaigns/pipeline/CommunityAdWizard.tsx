'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { DateRange } from 'react-day-picker';
import { uploadToCloudinary } from '@/app/utils/cloudinaryUpload';
import { useTheme, useThemeClasses } from '@/app/contexts/ThemeContext';
import { adBudgetToCredits, CREDITS_PER_SPEND_DOLLAR as AD_SPEND_CREDITS_PER_DOLLAR } from '@/config/credits';
import { Calendar } from '@/app/components/ui/calendar';
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
  citySlug?: string;
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
  // Unified search across community pages, landing pages, and blog posts
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchCommunities, setSearchCommunities] = useState<Array<{ name: string; slug: string; city: string; citySlug: string }>>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // --- Step 2: Audience ---
  type MetaAudience = 'contacts' | 'visitors';
  type YoutubeAudience = 'cold' | 'visitors' | 'channelViewers';
  const [metaAudienceTypes, setMetaAudienceTypes] = useState<MetaAudience[]>(['visitors']);
  const [geoCenter, setGeoCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [geoAddress, setGeoAddress] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(5);
  // YouTube
  const [youtubeAudienceTypes, setYoutubeAudienceTypes] = useState<YoutubeAudience[]>(['visitors']);
  const [youtubeGeoCenter, setYoutubeGeoCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [youtubeGeoAddress, setYoutubeGeoAddress] = useState('');
  const [youtubeRadiusMiles, setYoutubeRadiusMiles] = useState(5);

  const toggleMetaAudience = (a: MetaAudience) => {
    setMetaAudienceTypes(metaAudienceTypes.includes(a)
      ? metaAudienceTypes.filter(x => x !== a)
      : [...metaAudienceTypes, a]);
  };
  const toggleYoutubeAudience = (a: YoutubeAudience) => {
    setYoutubeAudienceTypes(youtubeAudienceTypes.includes(a)
      ? youtubeAudienceTypes.filter(x => x !== a)
      : [...youtubeAudienceTypes, a]);
  };

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
  // Meta schedule — 'continuous' runs until paused; 'scheduled' uses metaDateRange
  const [metaScheduleMode, setMetaScheduleMode] = useState<'continuous' | 'scheduled'>('continuous');
  const [metaDateRange, setMetaDateRange] = useState<DateRange | undefined>(undefined);

  // YouTube Video (the ad creative MUST be a video hosted on YouTube)
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState('');
  const [youtubeBudget, setYoutubeBudget] = useState(10);
  const [youtubeHeadline, setYoutubeHeadline] = useState('');
  const [youtubeCallToAction, setYoutubeCallToAction] = useState('Learn more');

  // Extract the 11-char YouTube video id from a URL (or accept a bare id).
  const parseYoutubeId = (url: string): string => {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([A-Za-z0-9_-]{11})/);
    return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(url.trim()) ? url.trim() : '');
  };

  // Agent's custom domain for ad landing pages — falls back to chatrealty.io
  // if the agent hasn't set one up. Fetched from /api/user/profile.
  const [agentDomain, setAgentDomain] = useState<string>('chatrealty.io');

  // --- Step 4: Launch ---
  const [enableGoogle, setEnableGoogle] = useState(true);
  const [enableMeta, setEnableMeta] = useState(true);
  const [enableYoutube, setEnableYoutube] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ success: boolean; message: string } | null>(null);
  const [launchData, setLaunchData] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const inputClasses = `w-full px-3 py-2 rounded-lg border ${
    isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'
  }`;

  // Preload regions, landing pages, blog posts, and agent profile on mount.
  // Agent profile is fetched for the customDomain used in ad landing-page URLs.
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingPages(true);
      try {
        const [refRes, lpRes, blogRes, profileRes] = await Promise.all([
          fetch('/api/neighborhoods/reference').then(r => r.json()).catch(() => ({})),
          // mine=true → the logged-in agent's own content (ads must promote
          // THEIR pages, not the domain owner's)
          fetch('/api/articles/list?excludeLandingPages=false&limit=100&mine=true').then(r => r.json()).catch(() => ({})),
          fetch('/api/articles/list?limit=100&mine=true').then(r => r.json()).catch(() => ({})),
          fetch('/api/user/profile').then(r => r.json()).catch(() => ({})),
        ]);
        const customDomain = profileRes?.agentProfile?.customDomain || profileRes?.customDomain;
        if (customDomain) setAgentDomain(customDomain);
        if (refRes?.regions) setRegions(refRes.regions);
        if (lpRes?.articles) {
          setLandingPages(
            lpRes.articles
              .filter((a: any) => a.category === 'landing-page')
              .map((a: any) => ({ name: a.title, city: '', slug: a.slug, url: `/lp/${a.slug}` }))
          );
        }
        if (blogRes?.articles) {
          setBlogPosts(blogRes.articles.map((a: any) => ({
            name: a.title,
            city: a.category?.replace(/-/g, ' ') || '',
            slug: a.slug,
            url: `/insights/${a.category}/${a.slug}`,
          })));
        }
      } finally {
        setLoadingPages(false);
      }
    };
    fetchAll();
  }, []);

  // Debounced subdivision search — only fires when unified search has 2+ chars.
  useEffect(() => {
    const q = globalSearch.trim();
    if (q.length < 2) { setSearchCommunities([]); return; }
    let cancelled = false;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/neighborhoods/reference?search=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!cancelled && data?.subdivisions) setSearchCommunities(data.subdivisions);
      } catch {
        if (!cancelled) setSearchCommunities([]);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [globalSearch]);

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

  // Build landing-page URL on the agent's custom domain. Falls back to chatrealty.io
  // if the agent hasn't set up a custom domain yet.
  const pageUrl = pageType === 'custom'
    ? customUrl
    : (selectedPage?.url ? `https://${agentDomain.replace(/^https?:\/\//, '')}${selectedPage.url}` : '');
  const totalBudget = (enableGoogle ? googleBudget : 0) + (enableMeta ? metaBudget : 0) + (enableYoutube ? youtubeBudget : 0);

  // Days the Meta campaign will run. Null = continuous (until paused).
  const metaDurationDays = (metaScheduleMode === 'scheduled' && metaDateRange?.from && metaDateRange?.to)
    ? Math.max(1, Math.round((metaDateRange.to.getTime() - metaDateRange.from.getTime()) / 86400000) + 1)
    : null;

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
      audienceTypes: metaAudienceTypes,
      audienceType: metaAudienceTypes[0],
      imageUrl: metaImageUrl,
      primaryText: metaPrimaryText,
      headline: metaHeadline,
      placements: metaPlacements,
      budget: metaBudget,
      schedule: {
        mode: metaScheduleMode,
        startDate: metaScheduleMode === 'scheduled' ? metaDateRange?.from?.toISOString() ?? null : null,
        endDate: metaScheduleMode === 'scheduled' ? metaDateRange?.to?.toISOString() ?? null : null,
        durationDays: metaDurationDays,
      },
    } : undefined,
    youtube: enableYoutube ? {
      audienceTypes: youtubeAudienceTypes,
      geoTargeting: youtubeGeoCenter ? { type: 'radius', center: youtubeGeoCenter, radiusMiles: youtubeRadiusMiles } : undefined,
      youtubeVideoId: parseYoutubeId(youtubeVideoUrl),
      budget: youtubeBudget,
      headline: youtubeHeadline,
      callToAction: youtubeCallToAction,
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
      if (data.success) {
        setLaunchData(data);
        setShowSuccessModal(true);
        if (!completedSteps.includes('launch')) {
          setCompletedSteps([...completedSteps, 'launch']);
        }
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

              {/* Unified Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search community pages, landing pages, or blog posts..."
                  className={inputClasses}
                />
              </div>

              {/* Search Results — replaces tabs/drill-down when active */}
              {globalSearch.trim().length >= 2 ? (
                <div className="space-y-4">
                  {/* Communities */}
                  <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wide ${textSecondary} mb-2`}>
                      Communities {searchLoading && '(loading...)'}
                    </h4>
                    {searchCommunities.length === 0 ? (
                      <p className={`text-sm ${textSecondary} italic`}>No matching communities</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {searchCommunities.map((sub) => (
                          <button
                            key={`${sub.citySlug}-${sub.slug}`}
                            onClick={() => {
                              setPageType('community');
                              setSelectedPage({
                                name: sub.name,
                                city: sub.city,
                                slug: sub.slug,
                                citySlug: sub.citySlug,
                                url: communityPageVariant === 'community'
                                  ? `/neighborhoods/${sub.citySlug}/${sub.slug}`
                                  : `/neighborhoods/${sub.citySlug}/${sub.slug}/${communityPageVariant}`,
                              });
                              setGlobalSearch('');
                            }}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              isLight ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white' : 'border-gray-700 hover:border-indigo-500 hover:bg-indigo-900/20 bg-gray-800'
                            }`}
                          >
                            <p className={`font-medium ${textPrimary}`}>{sub.name}</p>
                            <p className={`text-xs ${textSecondary}`}>{sub.city}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Landing Pages */}
                  <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wide ${textSecondary} mb-2`}>Landing Pages</h4>
                    {(() => {
                      const matches = landingPages.filter(p =>
                        p.name.toLowerCase().includes(globalSearch.toLowerCase())
                      ).slice(0, 15);
                      return matches.length === 0 ? (
                        <p className={`text-sm ${textSecondary} italic`}>No matching landing pages</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {matches.map((page) => (
                            <button
                              key={page.slug}
                              onClick={() => {
                                setPageType('landing');
                                setSelectedPage(page);
                                setGlobalSearch('');
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                isLight ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white' : 'border-gray-700 hover:border-indigo-500 hover:bg-indigo-900/20 bg-gray-800'
                              }`}
                            >
                              <p className={`font-medium ${textPrimary}`}>{page.name}</p>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Blog Posts */}
                  <div>
                    <h4 className={`text-xs font-semibold uppercase tracking-wide ${textSecondary} mb-2`}>Blog Posts</h4>
                    {(() => {
                      const matches = blogPosts.filter(p =>
                        p.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
                        p.city.toLowerCase().includes(globalSearch.toLowerCase())
                      ).slice(0, 15);
                      return matches.length === 0 ? (
                        <p className={`text-sm ${textSecondary} italic`}>No matching blog posts</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {matches.map((page) => (
                            <button
                              key={page.slug}
                              onClick={() => {
                                setPageType('blog');
                                setSelectedPage(page);
                                setGlobalSearch('');
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-all ${
                                isLight ? 'border-gray-200 hover:border-purple-300 hover:bg-purple-50 bg-white' : 'border-gray-700 hover:border-indigo-500 hover:bg-indigo-900/20 bg-gray-800'
                              }`}
                            >
                              <p className={`font-medium ${textPrimary}`}>{page.name}</p>
                              {page.city && <p className={`text-xs ${textSecondary} capitalize`}>{page.city}</p>}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
              <>
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
                                citySlug: currentCity.slug,
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
                  placeholder={`https://${agentDomain}/...`} className={inputClasses}
                />
              )}
              </>
              )}

              {/* Selected page summary */}
              {(selectedPage || (pageType === 'custom' && customUrl)) && (
                <div className={`mt-4 p-3 rounded-lg ${isLight ? 'bg-purple-50 border border-purple-200' : 'bg-indigo-900/20 border border-indigo-700/50'}`}>
                  <p className={`text-sm font-medium ${textPrimary}`}>
                    {selectedPage ? `${selectedPage.name}${selectedPage.city ? ` — ${selectedPage.city}` : ''}` : 'Custom URL'}
                  </p>
                  <p className={`text-xs ${isLight ? 'text-purple-600' : 'text-indigo-400'}`}>{pageUrl}</p>

                  {/* Buy / Sell / Community variant — visible after a community page is selected */}
                  {pageType === 'community' && selectedPage && (selectedPage.citySlug || currentCity) && (
                    <div className="mt-3 pt-3 border-t border-current/10">
                      <p className={`text-xs ${textSecondary} mb-2`}>Page variant:</p>
                      <div className="flex gap-2 flex-wrap">
                        {([
                          { id: 'buy' as const, label: 'Buy Page' },
                          { id: 'sell' as const, label: 'Sell Page' },
                          { id: 'community' as const, label: 'Community Page' },
                        ]).map((v) => (
                          <button
                            key={v.id}
                            onClick={() => {
                              setCommunityPageVariant(v.id);
                              const citySlug = selectedPage.citySlug || currentCity?.slug;
                              if (!citySlug) return;
                              setSelectedPage({
                                ...selectedPage,
                                url: v.id === 'community'
                                  ? `/neighborhoods/${citySlug}/${selectedPage.slug}`
                                  : `/neighborhoods/${citySlug}/${selectedPage.slug}/${v.id}`,
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              communityPageVariant === v.id
                                ? isLight ? 'bg-purple-600 text-white' : 'bg-indigo-600 text-white'
                                : isLight ? 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
            <p className={`text-sm ${textSecondary}`}>
              Toggle either channel on or off. You can run Meta retargeting, Google PPC, or both — neither section is required.
            </p>

            {/* Meta Audience */}
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6 ${!enableMeta ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-2 gap-4">
                <div>
                  <h3 className={`text-lg font-semibold ${textPrimary}`}>Meta Retargeting Audience</h3>
                  <p className={`text-sm ${textSecondary} mt-1`}>
                    Who should see retargeting ads on Facebook and Instagram?
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-1">
                  <input type="checkbox" checked={enableMeta} onChange={(e) => setEnableMeta(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className={`text-sm ${textSecondary}`}>Enabled</span>
                </label>
              </div>

              {enableMeta && (
                <>
                  <p className={`text-xs ${textSecondary} mt-4 mb-2`}>Select one or more audiences. Ads will reach people in any of the selected lists.</p>
                  <div className="space-y-3 mb-4">
                    {([
                      { id: 'visitors' as const, label: 'Website Visitors', desc: 'Retarget people who visited your site (via Meta Pixel) — shows ads to people who already know you' },
                      { id: 'contacts' as const, label: 'CRM Contacts', desc: 'Upload your contacts as a Custom Audience — show ads to people in your database' },
                    ]).map((opt) => {
                      const checked = metaAudienceTypes.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleMetaAudience(opt.id)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-start gap-3 ${
                            checked
                              ? isLight ? 'border-pink-500 bg-pink-50' : 'border-pink-500 bg-pink-900/30'
                              : isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800'
                          }`}
                        >
                          <input type="checkbox" checked={checked} readOnly className="mt-1 w-4 h-4 rounded pointer-events-none" />
                          <div>
                            <p className={`font-medium ${textPrimary}`}>{opt.label}</p>
                            <p className={`text-sm ${textSecondary}`}>{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {metaAudienceTypes.length === 0 && (
                    <div className={`p-3 mb-3 rounded-lg text-sm ${isLight ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-amber-900/20 border border-amber-700/50 text-amber-300'}`}>
                      No audience selected — Meta requires at least one Custom Audience for retargeting.
                    </div>
                  )}

                  <div className={`p-3 rounded-lg text-sm ${isLight ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-yellow-900/20 border border-yellow-700/50 text-yellow-300'}`}>
                    Housing Special Ad Category is auto-applied. No age, gender, or ZIP targeting on Meta.
                  </div>
                </>
              )}
            </div>

            {/* Google PPC Geo Targeting */}
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6 ${!enableGoogle ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-2 gap-4">
                <div>
                  <h3 className={`text-lg font-semibold ${textPrimary}`}>Google PPC Targeting Area</h3>
                  <p className={`text-sm ${textSecondary} mt-1`}>
                    Drop a pin on the map to set the area where your Google search ads will show.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-1">
                  <input type="checkbox" checked={enableGoogle} onChange={(e) => setEnableGoogle(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className={`text-sm ${textSecondary}`}>Enabled</span>
                </label>
              </div>

              {enableGoogle && (
                <>
                  <div className="mb-3 mt-4">
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
                </>
              )}
            </div>

            {/* YouTube Video Ads */}
            <div className={`${cardBg} ${cardBorder} rounded-lg p-6 ${!enableYoutube ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-2 gap-4">
                <div>
                  <h3 className={`text-lg font-semibold ${textPrimary}`}>YouTube Video Ads</h3>
                  <p className={`text-sm ${textSecondary} mt-1`}>
                    Run skippable in-stream or in-feed video ads on YouTube. Targets viewers in your area and (optionally) people already familiar with your brand.
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-1">
                  <input type="checkbox" checked={enableYoutube} onChange={(e) => setEnableYoutube(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className={`text-sm ${textSecondary}`}>Enabled</span>
                </label>
              </div>

              {enableYoutube && (
                <>
                  <p className={`text-xs ${textSecondary} mt-4 mb-2`}>Select any combination. Cold Reach overrides retargeting (everyone in geo). Visitors + Channel Viewers reaches the union of both lists.</p>
                  <div className="space-y-3 mb-4">
                    {([
                      { id: 'cold' as const, label: 'Cold Reach', desc: 'Target by location only — broad reach to viewers in your radius who haven’t seen you before' },
                      { id: 'visitors' as const, label: 'Website Visitors (Retargeting)', desc: 'Show video ads to people who visited your site (via Google Ads remarketing tag) — warm audience, already aware of you' },
                      { id: 'channelViewers' as const, label: 'YouTube Channel Viewers (Retargeting)', desc: 'Re-engage people who’ve watched videos on your YouTube channel' },
                    ]).map((opt) => {
                      const checked = youtubeAudienceTypes.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          onClick={() => toggleYoutubeAudience(opt.id)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all flex items-start gap-3 ${
                            checked
                              ? isLight ? 'border-red-500 bg-red-50' : 'border-red-500 bg-red-900/30'
                              : isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800'
                          }`}
                        >
                          <input type="checkbox" checked={checked} readOnly className="mt-1 w-4 h-4 rounded pointer-events-none" />
                          <div>
                            <p className={`font-medium ${textPrimary}`}>{opt.label}</p>
                            <p className={`text-sm ${textSecondary}`}>{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {youtubeAudienceTypes.length === 0 && (
                    <div className={`p-3 mb-3 rounded-lg text-sm ${isLight ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-amber-900/20 border border-amber-700/50 text-amber-300'}`}>
                      No audience selected — pick at least one (Cold Reach for broad targeting, or one of the retargeting lists).
                    </div>
                  )}

                  <div className="mb-3">
                    <label className={`block text-sm ${textSecondary} mb-1`}>
                      Radius: <span className={`font-semibold ${textPrimary}`}>{youtubeRadiusMiles} miles</span>
                    </label>
                    <input
                      type="range" min="1" max="50" value={youtubeRadiusMiles}
                      onChange={(e) => setYoutubeRadiusMiles(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className={`flex justify-between text-xs ${textSecondary}`}>
                      <span>1 mi</span><span>25 mi</span><span>50 mi</span>
                    </div>
                  </div>

                  <PinDropMap
                    radiusMiles={youtubeRadiusMiles}
                    onChange={(loc) => {
                      setYoutubeGeoCenter({ lat: loc.lat, lng: loc.lng });
                      if (loc.address) setYoutubeGeoAddress(loc.address);
                    }}
                    height="300px"
                    searchPlaceholder="Search for the area to target..."
                  />

                  {youtubeGeoAddress && (
                    <p className={`text-sm ${textSecondary} mt-2`}>
                      Video ads will show to viewers near: <span className={`font-medium ${textPrimary}`}>{youtubeGeoAddress}</span>
                    </p>
                  )}

                  <div className={`mt-4 p-3 rounded-lg text-sm ${isLight ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-yellow-900/20 border border-yellow-700/50 text-yellow-300'}`}>
                    Housing Special Ad Category restrictions: no ZIP code, age, gender, parental, or marital targeting. CRM Customer Match is not available. Radius targeting is allowed (Google&apos;s minimum is ~1 km).
                  </div>
                </>
              )}
            </div>

            {!enableGoogle && !enableMeta && !enableYoutube && (
              <div className={`p-3 rounded-lg text-sm ${isLight ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-900/20 border border-red-700/50 text-red-400'}`}>
                Enable at least one channel (Meta, Google PPC, or YouTube) to continue.
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => handleBack('audience')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
              <button
                onClick={() => handleNext('audience')}
                disabled={!enableGoogle && !enableMeta && !enableYoutube}
                className={`px-6 py-3 rounded-lg font-medium text-white ${isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
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
                    <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Daily Budget</label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${textSecondary} pointer-events-none`}>$</span>
                      <input
                        type="number" min="5" step="1" value={googleBudget}
                        onChange={(e) => setGoogleBudget(parseFloat(e.target.value) || 0)}
                        className={`${inputClasses} pl-7`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textSecondary} pointer-events-none`}>/ day</span>
                    </div>
                    <p className={`text-xs ${textSecondary} mt-1`}>
                      ${googleBudget.toFixed(2)}/day ={' '}
                      <span className={`font-medium ${textPrimary}`}>{adBudgetToCredits(googleBudget, 1)} credits/day</span>
                      {' '}· ~{adBudgetToCredits(googleBudget, 30).toLocaleString()} credits/month
                    </p>
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
                    <label className={`block text-sm font-medium ${textPrimary} mb-1`}>Daily Budget</label>
                    <div className="relative">
                      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${textSecondary} pointer-events-none`}>$</span>
                      <input
                        type="number" min="5" step="1" value={metaBudget}
                        onChange={(e) => setMetaBudget(parseFloat(e.target.value) || 0)}
                        className={`${inputClasses} pl-7`}
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${textSecondary} pointer-events-none`}>/ day</span>
                    </div>
                    <p className={`text-xs ${textSecondary} mt-1`}>
                      ${metaBudget.toFixed(2)}/day ={' '}
                      <span className={`font-medium ${textPrimary}`}>{adBudgetToCredits(metaBudget, 1)} credits/day</span>
                      {' '}· ~{adBudgetToCredits(metaBudget, 30).toLocaleString()} credits/month
                    </p>
                  </div>

                  {/* Schedule */}
                  <div>
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>Schedule</label>
                    <div className="flex gap-2 mb-3">
                      {([
                        { id: 'continuous' as const, label: 'Run Continuously', desc: 'No end date — runs until paused' },
                        { id: 'scheduled' as const, label: 'Set Date Range', desc: 'Pick start and end dates' },
                      ]).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setMetaScheduleMode(opt.id)}
                          className={`flex-1 text-left p-3 rounded-lg border-2 transition-all ${
                            metaScheduleMode === opt.id
                              ? isLight ? 'border-pink-500 bg-pink-50' : 'border-pink-500 bg-pink-900/30'
                              : isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800'
                          }`}
                        >
                          <p className={`text-sm font-medium ${textPrimary}`}>{opt.label}</p>
                          <p className={`text-xs ${textSecondary}`}>{opt.desc}</p>
                        </button>
                      ))}
                    </div>

                    {metaScheduleMode === 'scheduled' && (
                      <div className={`rounded-lg border ${isLight ? 'border-gray-200 bg-white' : 'border-gray-700 bg-gray-800'} flex justify-center`}>
                        <Calendar
                          mode="range"
                          selected={metaDateRange}
                          onSelect={setMetaDateRange}
                          disabled={{ before: new Date() }}
                          numberOfMonths={1}
                        />
                      </div>
                    )}

                    {metaScheduleMode === 'scheduled' && metaDurationDays !== null && (
                      <p className={`text-xs ${textSecondary} mt-2`}>
                        Runs for <span className={`font-medium ${textPrimary}`}>{metaDurationDays} day{metaDurationDays === 1 ? '' : 's'}</span>
                        {' '}· Total: <span className={`font-medium ${textPrimary}`}>{adBudgetToCredits(metaBudget, metaDurationDays).toLocaleString()} credits</span>
                        {' '}(${(metaBudget * metaDurationDays).toFixed(2)})
                      </p>
                    )}
                    {metaScheduleMode === 'scheduled' && !metaDurationDays && (
                      <p className={`text-xs ${textSecondary} mt-2 italic`}>Select a start and end date above.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* YouTube Video config — the creative + budget the backend needs */}
            {enableYoutube && (
              <div className={`${cardBg} ${cardBorder} rounded-lg p-6`}>
                <h3 className={`text-lg font-semibold ${textPrimary} mb-1`}>YouTube Video Ad</h3>
                <p className={`text-sm ${textSecondary} mb-4`}>Video ads must use a video hosted on YouTube — paste the link to your video.</p>

                <label className={`block text-sm ${textSecondary} mb-1`}>YouTube video link</label>
                <input type="url" value={youtubeVideoUrl} onChange={(e) => setYoutubeVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className={`w-full px-3 py-2 rounded-lg border text-sm mb-1 ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'}`} />
                {youtubeVideoUrl && !parseYoutubeId(youtubeVideoUrl) && (
                  <p className="text-xs text-red-500 mb-2">That doesn&apos;t look like a YouTube video link.</p>
                )}
                {parseYoutubeId(youtubeVideoUrl) && (
                  <p className={`text-xs ${textSecondary} mb-3`}>Detected video id: <span className="font-mono">{parseYoutubeId(youtubeVideoUrl)}</span></p>
                )}

                <label className={`block text-sm ${textSecondary} mb-1 mt-2`}>Headline</label>
                <input value={youtubeHeadline} onChange={(e) => setYoutubeHeadline(e.target.value)} maxLength={90}
                  placeholder="e.g. Homes for sale in Palm Desert Country Club"
                  className={`w-full px-3 py-2 rounded-lg border text-sm mb-3 ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'}`} />

                <label className={`block text-sm ${textSecondary} mb-1`}>Call-to-action button</label>
                <input value={youtubeCallToAction} onChange={(e) => setYoutubeCallToAction(e.target.value)} maxLength={25}
                  placeholder="Learn more"
                  className={`w-full px-3 py-2 rounded-lg border text-sm mb-3 ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'}`} />

                <label className={`block text-sm ${textSecondary} mb-1`}>Daily budget</label>
                <div className="flex items-center gap-2">
                  <span className={textSecondary}>$</span>
                  <input type="number" min="5" step="1" value={youtubeBudget}
                    onChange={(e) => setYoutubeBudget(Math.max(5, parseInt(e.target.value) || 0))}
                    className={`w-28 px-3 py-2 rounded-lg border text-sm ${isLight ? 'border-gray-300 bg-white text-gray-900' : 'border-gray-600 bg-gray-700 text-white'}`} />
                  <span className={`text-sm ${textSecondary}`}>/day</span>
                </div>
                <p className={`text-xs ${textSecondary} mt-1`}>
                  ${youtubeBudget.toFixed(2)}/day = <span className={`font-medium ${textPrimary}`}>{adBudgetToCredits(youtubeBudget, 1)} credits/day</span>
                  {' '}· ~{adBudgetToCredits(youtubeBudget, 30).toLocaleString()} credits/month
                </p>
                <div className={`mt-3 p-3 rounded-lg text-xs ${isLight ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-amber-900/20 border border-amber-700/50 text-amber-300'}`}>
                  YouTube runs through Google Ads — your Google Ads account must be connected. Launches PAUSED for your review in Google Ads Manager.
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button onClick={() => handleBack('configure')} className={`px-6 py-3 rounded-lg font-medium ${isLight ? 'bg-gray-200 hover:bg-gray-300 text-gray-900' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                Back
              </button>
              <button
                onClick={() => handleNext('configure')}
                disabled={!enableGoogle && !enableMeta && !enableYoutube}
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
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <h4 className={`font-medium ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>Google Search PPC</h4>
                      <div className={`text-right ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                        <p className="font-semibold">${googleBudget.toFixed(2)}/day</p>
                        <p className="text-xs">{googleBudget * AD_SPEND_CREDITS_PER_DOLLAR} credits/day</p>
                      </div>
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
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <h4 className={`font-medium ${isLight ? 'text-pink-700' : 'text-pink-400'}`}>Meta Retargeting</h4>
                      <div className={`text-right ${isLight ? 'text-pink-700' : 'text-pink-400'}`}>
                        <p className="font-semibold">${metaBudget.toFixed(2)}/day</p>
                        <p className="text-xs">{metaBudget * AD_SPEND_CREDITS_PER_DOLLAR} credits/day</p>
                      </div>
                    </div>
                    <div className={`text-sm ${textSecondary} space-y-1`}>
                      <p>Audience: {metaAudienceTypes.length === 0
                        ? 'None selected'
                        : metaAudienceTypes.map(a => a === 'visitors' ? 'Website Visitors (Pixel)' : 'CRM Contacts').join(' + ')}</p>
                      <p>Placements: {metaPlacements.map(p => p.replace(/_/g, ' ')).join(', ')}</p>
                      <p>Headline: {metaHeadline}</p>
                      <p>
                        Schedule: {metaScheduleMode === 'continuous'
                          ? 'Runs continuously until paused'
                          : metaDurationDays
                            ? `${metaDateRange!.from!.toLocaleDateString()} → ${metaDateRange!.to!.toLocaleDateString()} (${metaDurationDays} days)`
                            : 'No date range selected'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Total Budget */}
              {(() => {
                const dailyCredits = totalBudget * AD_SPEND_CREDITS_PER_DOLLAR;
                const days = enableMeta && metaScheduleMode === 'scheduled' && metaDurationDays ? metaDurationDays : null;
                const totalDollars = days ? totalBudget * days : null;
                const totalCredits = days ? dailyCredits * days : null;
                return (
                  <div className={`p-4 rounded-lg mb-6 text-center ${isLight ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-700/50'}`}>
                    <p className={`text-sm ${textSecondary}`}>Daily Ad Spend</p>
                    <p className={`text-3xl font-bold ${isLight ? 'text-green-600' : 'text-green-400'}`}>${totalBudget.toFixed(2)}/day</p>
                    <p className={`text-sm ${textSecondary}`}>= {dailyCredits} credits/day deducted from balance</p>

                    {days !== null ? (
                      <div className={`mt-3 pt-3 border-t ${isLight ? 'border-green-200' : 'border-green-700/50'}`}>
                        <p className={`text-sm ${textSecondary}`}>Total over {days} day{days === 1 ? '' : 's'}</p>
                        <p className={`text-lg font-semibold ${textPrimary}`}>${totalDollars!.toFixed(2)} · {totalCredits!.toLocaleString()} credits</p>
                      </div>
                    ) : (
                      <div className={`mt-3 pt-3 border-t ${isLight ? 'border-green-200' : 'border-green-700/50'}`}>
                        <p className={`text-sm ${textSecondary}`}>Continuous — approx ${(totalBudget * 30).toFixed(2)}/mo · {adBudgetToCredits(totalBudget, 30).toLocaleString()} credits/mo</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Launch Error (inline) */}
              {launchResult && !launchResult.success && (
                <div className={`p-4 rounded-lg mb-4 ${isLight ? 'bg-red-50 border border-red-200' : 'bg-red-900/20 border border-red-700/50'}`}>
                  <p className={`text-sm font-medium ${isLight ? 'text-red-700' : 'text-red-400'}`}>{launchResult.message}</p>
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
                    ) : (() => {
                      const dailyCredits = totalBudget * AD_SPEND_CREDITS_PER_DOLLAR;
                      const days = enableMeta && metaScheduleMode === 'scheduled' && metaDurationDays ? metaDurationDays : null;
                      return days
                        ? `Launch Campaign — ${(dailyCredits * days).toLocaleString()} credits ($${(totalBudget * days).toFixed(2)})`
                        : `Launch Campaign — ${dailyCredits} credits/day ($${totalBudget.toFixed(2)}/day)`;
                    })()}
                  </button>
                </div>
              )}

              {/* Launched — show link to return */}
              {launchResult?.success && (
                <div className="space-y-3">
                  <div className={`p-4 rounded-lg text-center ${isLight ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-700/50'}`}>
                    <p className={`text-sm font-medium ${isLight ? 'text-green-700' : 'text-green-400'}`}>
                      Campaigns created successfully!
                    </p>
                  </div>
                  <button
                    onClick={() => setShowSuccessModal(true)}
                    className={`w-full py-3 rounded-lg font-medium text-white ${isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    View Launch Details
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

      {/* ============ SUCCESS MODAL ============ */}
      {showSuccessModal && launchData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSuccessModal(false)}>
          <div
            className={`w-full max-w-lg rounded-2xl shadow-2xl ${isLight ? 'bg-white' : 'bg-slate-800'} overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 text-center ${isLight ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-green-600 to-emerald-600'} text-white`}>
              <div className="text-4xl mb-2">&#x2705;</div>
              <h2 className="text-xl font-bold">Campaigns Launched!</h2>
              <p className="text-sm text-green-100 mt-1">Created PAUSED — review and enable in Ads Manager</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Campaign IDs */}
              {launchData.results?.meta?.success && (
                <div className={`p-4 rounded-lg ${isLight ? 'bg-pink-50 border border-pink-200' : 'bg-pink-900/20 border border-pink-700/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold ${isLight ? 'text-pink-700' : 'text-pink-400'}`}>Meta Ads</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400'}`}>PAUSED</span>
                  </div>
                  <p className={`text-xs font-mono ${textSecondary} mb-2`}>
                    Campaign ID: {launchData.results.meta.campaignId}
                  </p>
                  <a
                    href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${process.env.NEXT_PUBLIC_META_AD_ACCOUNT_ID?.replace('act_', '') || '160011552'}&campaign_ids=${launchData.results.meta.campaignId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-sm font-medium ${isLight ? 'text-pink-600 hover:text-pink-700' : 'text-pink-400 hover:text-pink-300'}`}
                  >
                    View in Meta Ads Manager &#x2197;
                  </a>
                </div>
              )}

              {launchData.results?.google?.success && (
                <div className={`p-4 rounded-lg ${isLight ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-700/50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className={`font-semibold ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>Google Ads</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${isLight ? 'bg-yellow-100 text-yellow-700' : 'bg-yellow-900/30 text-yellow-400'}`}>PAUSED</span>
                  </div>
                  <p className={`text-xs font-mono ${textSecondary} mb-2`}>
                    Resource: {launchData.results.google.campaignResourceName}
                  </p>
                  <a
                    href="https://ads.google.com/aw/campaigns"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-sm font-medium ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                  >
                    View in Google Ads Manager &#x2197;
                  </a>
                </div>
              )}

              {/* Errors */}
              {launchData.results?.meta && !launchData.results.meta.success && (
                <div className={`p-3 rounded-lg text-sm ${isLight ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-900/20 border border-red-700/50 text-red-400'}`}>
                  Meta: {launchData.results.meta.error}
                </div>
              )}
              {launchData.results?.google && !launchData.results.google.success && (
                <div className={`p-3 rounded-lg text-sm ${isLight ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-900/20 border border-red-700/50 text-red-400'}`}>
                  Google: {launchData.results.google.error}
                </div>
              )}

              {/* Credit Cost Summary */}
              {launchData.credits && (
                <div className={`p-4 rounded-lg ${isLight ? 'bg-green-50 border border-green-200' : 'bg-green-900/20 border border-green-700/50'}`}>
                  <h4 className={`font-semibold ${isLight ? 'text-green-700' : 'text-green-400'} mb-2`}>Credit Cost</h4>
                  <div className={`grid grid-cols-2 gap-2 text-sm ${textSecondary}`}>
                    <span>Daily budget:</span>
                    <span className={`font-medium ${textPrimary}`}>${launchData.credits.dailyBudget}/day</span>
                    <span>Daily credits:</span>
                    <span className={`font-medium ${textPrimary}`}>{launchData.credits.estimatedDaily} credits</span>
                    <span>Monthly estimate:</span>
                    <span className={`font-medium ${textPrimary}`}>{launchData.credits.estimatedMonthly} credits</span>
                  </div>
                </div>
              )}

              {/* PAUSED Warning */}
              <div className={`p-3 rounded-lg text-sm ${isLight ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-yellow-900/20 border border-yellow-700/50 text-yellow-300'}`}>
                <strong>Important:</strong> All campaigns launch PAUSED. Review your ads in the platform&apos;s Ads Manager, then enable them when you&apos;re ready. Credits will be debited daily once campaigns are active.
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`px-6 pb-6`}>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  // Triggers parent to refetch the campaign. The overview tab
                  // sees metaAdsConfig.campaignId populated and renders the
                  // active-campaign state instead of the wizard.
                  onRefresh?.();
                }}
                className={`w-full py-3 rounded-lg font-medium text-white ${isLight ? 'bg-purple-600 hover:bg-purple-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
