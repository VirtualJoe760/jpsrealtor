"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  X,
  Building2,
  Clock,
  FileText,
  ChevronDown,
  ChevronRight,
  Image,
  Trash2,
  Upload,
  Info,
} from "lucide-react";

interface StepProps {
  formData: any;
  updateField: (path: string, value: any) => void;
  isLight: boolean;
  onSave: (stepFields: Record<string, any>) => Promise<void>;
  isSaving: boolean;
}

interface GbpPost {
  _id?: string;
  summary?: string;
  title?: string;
  url?: string;
  publishedAt?: string;
  createdAt?: string;
  status?: string;
}

const CTA_OPTIONS = [
  { value: "LEARN_MORE", label: "Learn More" },
  { value: "BOOK", label: "Book" },
  { value: "SIGN_UP", label: "Sign Up" },
  { value: "CALL", label: "Call" },
  { value: "GET_OFFER", label: "Get Offer" },
] as const;

const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const PHOTO_CATEGORIES = [
  { value: "ADDITIONAL", label: "Additional" },
  { value: "COVER", label: "Cover" },
  { value: "PROFILE", label: "Profile" },
  { value: "LOGO", label: "Logo" },
] as const;

interface GBPMediaItem {
  name?: string;
  sourceUrl?: string;
  googleUrl?: string;
  thumbnailUrl?: string;
  mediaFormat?: string;
  locationAssociation?: {
    category?: string;
  };
  createTime?: string;
}

interface HoursPeriod {
  openDay: string;
  openTime: { hours: number; minutes: number };
  closeDay: string;
  closeTime: { hours: number; minutes: number };
}

interface BusinessInfo {
  title?: string;
  profile?: { description?: string };
  phoneNumbers?: { primaryPhone?: string };
  websiteUri?: string;
  regularHours?: { periods: HoursPeriod[] };
}

export default function GoogleBusinessStep({
  formData,
  updateField,
  isLight,
  onSave,
  isSaving,
}: StepProps) {
  const [posts, setPosts] = useState<GbpPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Create post form state
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostSummary, setNewPostSummary] = useState("");
  const [newPostUrl, setNewPostUrl] = useState("");
  const [newPostImage, setNewPostImage] = useState("");

  // Collapsible section state
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(false);

  // Business info state
  const [bizInfo, setBizInfo] = useState<BusinessInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoDescription, setInfoDescription] = useState("");
  const [infoPhone, setInfoPhone] = useState("");
  const [infoWebsite, setInfoWebsite] = useState("");
  const [infoHours, setInfoHours] = useState<
    Record<string, { open: string; close: string; closed: boolean }>
  >(() => {
    const initial: Record<string, { open: string; close: string; closed: boolean }> = {};
    DAYS_OF_WEEK.forEach((day) => {
      initial[day] = { open: "09:00", close: "17:00", closed: false };
    });
    return initial;
  });

  // Photos state
  const [mediaItems, setMediaItems] = useState<GBPMediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadCategory, setUploadCategory] = useState<string>("ADDITIONAL");
  const [deletingMedia, setDeletingMedia] = useState<string | null>(null);

  const gbp = formData.adAccounts?.gbp || {};
  const isConnected = gbp.status === "connected";

  const autoPostArticles = gbp.autoPostArticles !== false; // default true
  const includeImage = gbp.includeImage !== false; // default true
  const defaultCtaType = gbp.defaultCtaType || "LEARN_MORE";

  const inputClass = `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
    isLight
      ? "bg-white border-gray-300 text-gray-900 focus:ring-blue-500"
      : "bg-gray-800 border-gray-700 text-white focus:ring-emerald-500"
  }`;

  const labelClass = `block text-sm font-medium mb-1.5 ${
    isLight ? "text-gray-700" : "text-gray-300"
  }`;

  const cardClass = `rounded-lg border p-5 ${
    isLight ? "bg-gray-50 border-gray-200" : "bg-gray-800/50 border-gray-700"
  }`;

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch("/api/gbp/post");
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : data.posts || []);
      }
    } catch {
      // Failed to load posts
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const fetchBusinessInfo = useCallback(async () => {
    setLoadingInfo(true);
    try {
      const res = await fetch("/api/gbp/info");
      if (res.ok) {
        const data = await res.json();
        const info = data.info as BusinessInfo;
        setBizInfo(info);
        setInfoDescription(info?.profile?.description || "");
        setInfoPhone(info?.phoneNumbers?.primaryPhone || "");
        setInfoWebsite(info?.websiteUri || "");

        // Parse hours
        if (info?.regularHours?.periods) {
          const parsed: Record<string, { open: string; close: string; closed: boolean }> = {};
          DAYS_OF_WEEK.forEach((day) => {
            parsed[day] = { open: "09:00", close: "17:00", closed: true };
          });
          for (const period of info.regularHours.periods) {
            const day = period.openDay;
            if (day && parsed[day]) {
              const oh = String(period.openTime?.hours || 0).padStart(2, "0");
              const om = String(period.openTime?.minutes || 0).padStart(2, "0");
              const ch = String(period.closeTime?.hours || 0).padStart(2, "0");
              const cm = String(period.closeTime?.minutes || 0).padStart(2, "0");
              parsed[day] = { open: `${oh}:${om}`, close: `${ch}:${cm}`, closed: false };
            }
          }
          setInfoHours(parsed);
        }
      }
    } catch {
      // Failed to load business info
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  const fetchMedia = useCallback(async () => {
    setLoadingMedia(true);
    try {
      const res = await fetch("/api/gbp/media");
      if (res.ok) {
        const data = await res.json();
        setMediaItems(data.mediaItems || []);
      }
    } catch {
      // Failed to load media
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      fetchPosts();
    }
  }, [isConnected, fetchPosts]);

  useEffect(() => {
    if (isConnected && infoExpanded && !bizInfo) {
      fetchBusinessInfo();
    }
  }, [isConnected, infoExpanded, bizInfo, fetchBusinessInfo]);

  useEffect(() => {
    if (isConnected && photosExpanded && mediaItems.length === 0) {
      fetchMedia();
    }
  }, [isConnected, photosExpanded, mediaItems.length, fetchMedia]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/agent/ad-accounts?platform=gbp", { method: "DELETE" });
      updateField("adAccounts.gbp", {
        status: "disconnected",
        accountId: undefined,
        locationId: undefined,
        connectedAt: undefined,
      });
    } catch {
      // Failed to disconnect
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostSummary.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/gbp/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPostTitle,
          summary: newPostSummary,
          url: newPostUrl || undefined,
          imageUrl: newPostImage || undefined,
          ctaType: defaultCtaType,
        }),
      });
      if (res.ok) {
        setNewPostTitle("");
        setNewPostSummary("");
        setNewPostUrl("");
        setNewPostImage("");
        setShowCreateForm(false);
        fetchPosts();
      }
    } catch {
      // Failed to create post
    } finally {
      setCreating(false);
    }
  };

  const handleSaveBusinessInfo = async () => {
    setSavingInfo(true);
    try {
      // Build regularHours periods from the form state
      const periods: HoursPeriod[] = [];
      for (const day of DAYS_OF_WEEK) {
        const h = infoHours[day];
        if (!h.closed) {
          const [oh, om] = h.open.split(":").map(Number);
          const [ch, cm] = h.close.split(":").map(Number);
          periods.push({
            openDay: day,
            openTime: { hours: oh, minutes: om },
            closeDay: day,
            closeTime: { hours: ch, minutes: cm },
          });
        }
      }

      await fetch("/api/gbp/info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: infoDescription,
          phoneNumbers: { primaryPhone: infoPhone },
          websiteUri: infoWebsite,
          regularHours: { periods },
        }),
      });

      // Refresh info after save
      setBizInfo(null);
      fetchBusinessInfo();
    } catch {
      // Failed to save
    } finally {
      setSavingInfo(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!uploadUrl.trim()) return;
    setUploadingPhoto(true);
    try {
      const res = await fetch("/api/gbp/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: uploadUrl,
          category: uploadCategory,
        }),
      });
      if (res.ok) {
        setUploadUrl("");
        setUploadCategory("ADDITIONAL");
        setShowUploadForm(false);
        fetchMedia();
      }
    } catch {
      // Failed to upload
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (mediaName: string) => {
    setDeletingMedia(mediaName);
    try {
      const res = await fetch("/api/gbp/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaName }),
      });
      if (res.ok) {
        setMediaItems((prev) => prev.filter((m) => m.name !== mediaName));
      }
    } catch {
      // Failed to delete
    } finally {
      setDeletingMedia(null);
    }
  };

  const handleSave = () => {
    const currentGbp = formData.adAccounts?.gbp || {};
    onSave({
      adAccounts: {
        ...formData.adAccounts,
        gbp: {
          ...currentGbp,
          autoPostArticles: currentGbp.autoPostArticles !== false,
          includeImage: currentGbp.includeImage !== false,
          defaultCtaType: currentGbp.defaultCtaType || "LEARN_MORE",
        },
      },
    });
  };

  return (
    <div
      className={`rounded-xl border p-6 ${
        isLight
          ? "bg-white border-gray-200"
          : "bg-gray-900/60 border-gray-800"
      }`}
    >
      <h2
        className={`text-xl font-bold mb-1 ${
          isLight ? "text-gray-900" : "text-white"
        }`}
      >
        Google Business Profile
      </h2>
      <p
        className={`text-sm mb-6 ${
          isLight ? "text-gray-500" : "text-gray-400"
        }`}
      >
        Connect your Google Business Profile to auto-publish articles and boost
        local SEO.
      </p>

      <div className="space-y-6">
        {/* ─── Section 1: Connection Status ─── */}
        <div className={cardClass}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isLight ? "bg-emerald-100" : "bg-emerald-900/30"
              }`}
            >
              <Building2
                className={`w-5 h-5 ${
                  isLight ? "text-emerald-600" : "text-emerald-400"
                }`}
              />
            </div>
            <div className="flex-1">
              <h3
                className={`font-semibold ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Connection Status
              </h3>
              <p
                className={`text-xs ${
                  isLight ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {isConnected
                  ? "Your Google Business Profile is connected"
                  : "Connect your GBP to get started"}
              </p>
            </div>
            {isConnected && (
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  isLight
                    ? "bg-green-100 text-green-700"
                    : "bg-green-900/30 text-green-400"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
            )}
          </div>

          {!isConnected ? (
            <div className="space-y-4">
              <p
                className={`text-sm ${
                  isLight ? "text-gray-600" : "text-gray-300"
                }`}
              >
                Google Business Profile (GBP) is a free tool from Google that
                lets you manage how your business appears on Google Search and
                Maps. Connecting your GBP lets you auto-publish articles as
                posts, improving your local SEO and keeping your listing active.
              </p>

              <div
                className={`p-4 rounded-lg ${
                  isLight ? "bg-emerald-50" : "bg-emerald-900/10"
                }`}
              >
                <a
                  href="/api/auth/gbp/connect"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                    isLight
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Connect Google Business Profile
                </a>
              </div>

              {/* Don't have a GBP? */}
              <div
                className={`p-4 rounded-lg border ${
                  isLight
                    ? "bg-amber-50 border-amber-200"
                    : "bg-amber-900/10 border-amber-800/30"
                }`}
              >
                <h4
                  className={`text-sm font-semibold mb-2 ${
                    isLight ? "text-amber-800" : "text-amber-300"
                  }`}
                >
                  Don&apos;t have a Google Business Profile?
                </h4>
                <ol
                  className={`text-sm space-y-1.5 list-decimal list-inside ${
                    isLight ? "text-amber-700" : "text-amber-400"
                  }`}
                >
                  <li>
                    Go to{" "}
                    <a
                      href="https://www.google.com/business/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      google.com/business
                    </a>
                  </li>
                  <li>Create your business listing with your name and address</li>
                  <li>
                    Wait for postcard verification (typically 5-14 days)
                  </li>
                  <li>Come back here and click Connect</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {gbp.accountId && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      isLight ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Account:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}
                  >
                    {gbp.accountId}
                  </span>
                </div>
              )}
              {gbp.locationId && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      isLight ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Location:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}
                  >
                    {gbp.locationId}
                  </span>
                </div>
              )}
              {gbp.connectedAt && (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      isLight ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Connected:
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}
                  >
                    {new Date(gbp.connectedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className={`flex items-center gap-1.5 text-sm mt-2 transition-colors ${
                  isLight
                    ? "text-red-600 hover:text-red-700"
                    : "text-red-400 hover:text-red-300"
                }`}
              >
                {disconnecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* ─── Section 2: Auto-Posting Preferences ─── */}
        {isConnected && (
          <div className={cardClass}>
            <h3
              className={`font-semibold mb-4 ${
                isLight ? "text-gray-900" : "text-white"
              }`}
            >
              Auto-Posting Preferences
            </h3>

            <div className="space-y-4">
              {/* Toggle: Auto-post articles */}
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isLight ? "text-gray-700" : "text-gray-200"
                    }`}
                  >
                    Auto-post articles to GBP
                  </p>
                  <p
                    className={`text-xs ${
                      isLight ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Automatically publish your articles as GBP posts when they go
                    live
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      "adAccounts.gbp.autoPostArticles",
                      !autoPostArticles
                    )
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoPostArticles
                      ? isLight
                        ? "bg-emerald-500"
                        : "bg-emerald-600"
                      : isLight
                      ? "bg-gray-300"
                      : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoPostArticles ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle: Include featured image */}
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className={`text-sm font-medium ${
                      isLight ? "text-gray-700" : "text-gray-200"
                    }`}
                  >
                    Include featured image in posts
                  </p>
                  <p
                    className={`text-xs ${
                      isLight ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Attach the article&apos;s featured image to the GBP post
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateField("adAccounts.gbp.includeImage", !includeImage)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    includeImage
                      ? isLight
                        ? "bg-emerald-500"
                        : "bg-emerald-600"
                      : isLight
                      ? "bg-gray-300"
                      : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      includeImage ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* CTA Button Style */}
              <div>
                <label className={labelClass}>CTA Button Style</label>
                <select
                  value={defaultCtaType}
                  onChange={(e) =>
                    updateField("adAccounts.gbp.defaultCtaType", e.target.value)
                  }
                  className={inputClass}
                >
                  {CTA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p
                  className={`text-xs mt-1 ${
                    isLight ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  The call-to-action button shown on your GBP posts
                </p>
              </div>

              {/* Post Preview */}
              <div>
                <p className={`text-xs font-medium mb-2 uppercase tracking-wider ${
                  isLight ? "text-gray-400" : "text-gray-500"
                }`}>
                  Post Preview
                </p>
                <div
                  className={`rounded-lg border p-4 ${
                    isLight
                      ? "bg-white border-gray-200"
                      : "bg-gray-900 border-gray-700"
                  }`}
                >
                  {includeImage && (
                    <div
                      className={`w-full h-32 rounded-lg mb-3 flex items-center justify-center ${
                        isLight ? "bg-gray-100" : "bg-gray-800"
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          isLight ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        Featured Image
                      </span>
                    </div>
                  )}
                  <p
                    className={`text-sm font-semibold mb-1 ${
                      isLight ? "text-gray-900" : "text-white"
                    }`}
                  >
                    Your Article Title Here
                  </p>
                  <p
                    className={`text-xs mb-3 ${
                      isLight ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    A brief excerpt from the article content that gives readers a
                    preview of what they will learn...
                  </p>
                  <span
                    className={`inline-block px-3 py-1.5 rounded text-xs font-medium ${
                      isLight
                        ? "bg-blue-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {CTA_OPTIONS.find((o) => o.value === defaultCtaType)
                      ?.label || "Learn More"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Section 3: Post History ─── */}
        {isConnected && (
          <div className={cardClass}>
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`font-semibold ${
                  isLight ? "text-gray-900" : "text-white"
                }`}
              >
                Post History
              </h3>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isLight
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    : "bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50"
                }`}
              >
                {showCreateForm ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    Create Post
                  </>
                )}
              </button>
            </div>

            {/* Create Post Form */}
            {showCreateForm && (
              <div
                className={`rounded-lg border p-4 mb-4 ${
                  isLight
                    ? "bg-white border-gray-200"
                    : "bg-gray-900 border-gray-700"
                }`}
              >
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input
                      type="text"
                      value={newPostTitle}
                      onChange={(e) => setNewPostTitle(e.target.value)}
                      placeholder="Post title"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Summary</label>
                    <textarea
                      rows={3}
                      value={newPostSummary}
                      onChange={(e) => setNewPostSummary(e.target.value)}
                      placeholder="What would you like to share?"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>URL (optional)</label>
                    <input
                      type="url"
                      value={newPostUrl}
                      onChange={(e) => setNewPostUrl(e.target.value)}
                      placeholder="https://yoursite.com/article"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Image URL (optional)</label>
                    <input
                      type="url"
                      value={newPostImage}
                      onChange={(e) => setNewPostImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className={inputClass}
                    />
                  </div>
                  <button
                    onClick={handleCreatePost}
                    disabled={creating || !newPostSummary.trim()}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                      isLight
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Publish Post
                  </button>
                </div>
              </div>
            )}

            {/* Posts List */}
            {loadingPosts ? (
              <div className="flex items-center justify-center py-6">
                <Loader2
                  className={`w-5 h-5 animate-spin ${
                    isLight ? "text-gray-400" : "text-gray-500"
                  }`}
                />
              </div>
            ) : posts.length === 0 ? (
              <p
                className={`text-sm text-center py-6 ${
                  isLight ? "text-gray-400" : "text-gray-500"
                }`}
              >
                No posts yet. Create your first GBP post above.
              </p>
            ) : (
              <div className="space-y-2">
                {posts.slice(0, 10).map((post, i) => (
                  <div
                    key={post._id || i}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      isLight ? "bg-white" : "bg-gray-900/50"
                    }`}
                  >
                    <FileText
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isLight ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          isLight ? "text-gray-900" : "text-white"
                        }`}
                      >
                        {post.summary
                          ? post.summary.length > 80
                            ? post.summary.slice(0, 80) + "..."
                            : post.summary
                          : post.title || "Untitled post"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`flex items-center gap-1 text-xs ${
                            isLight ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {post.publishedAt || post.createdAt
                            ? new Date(
                                (post.publishedAt || post.createdAt)!
                              ).toLocaleDateString()
                            : "Unknown date"}
                        </span>
                        {post.status && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${
                              post.status === "published" ||
                              post.status === "live"
                                ? isLight
                                  ? "bg-green-100 text-green-700"
                                  : "bg-green-900/30 text-green-400"
                                : isLight
                                ? "bg-gray-100 text-gray-600"
                                : "bg-gray-800 text-gray-400"
                            }`}
                          >
                            {post.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Section 4: Business Info (Collapsible) ─── */}
        {isConnected && (
          <div className={cardClass}>
            <button
              type="button"
              onClick={() => setInfoExpanded(!infoExpanded)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isLight ? "bg-blue-100" : "bg-blue-900/30"
                }`}
              >
                <Info
                  className={`w-5 h-5 ${
                    isLight ? "text-blue-600" : "text-blue-400"
                  }`}
                />
              </div>
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  Business Info
                </h3>
                <p
                  className={`text-xs ${
                    isLight ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  Edit description, phone, website, and hours
                </p>
              </div>
              {infoExpanded ? (
                <ChevronDown
                  className={`w-5 h-5 ${
                    isLight ? "text-gray-400" : "text-gray-500"
                  }`}
                />
              ) : (
                <ChevronRight
                  className={`w-5 h-5 ${
                    isLight ? "text-gray-400" : "text-gray-500"
                  }`}
                />
              )}
            </button>

            {infoExpanded && (
              <div className="mt-5 space-y-4">
                {loadingInfo ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2
                      className={`w-5 h-5 animate-spin ${
                        isLight ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  </div>
                ) : (
                  <>
                    {/* Business Name (read-only) */}
                    {bizInfo?.title && (
                      <div>
                        <label className={labelClass}>Business Name</label>
                        <div
                          className={`w-full px-4 py-3 rounded-lg border text-sm ${
                            isLight
                              ? "bg-gray-100 border-gray-300 text-gray-600"
                              : "bg-gray-800/70 border-gray-700 text-gray-400"
                          }`}
                        >
                          {bizInfo.title}
                        </div>
                        <p
                          className={`text-xs mt-1 ${
                            isLight ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          Business name cannot be edited here
                        </p>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <label className={labelClass}>Description</label>
                      <textarea
                        rows={4}
                        value={infoDescription}
                        onChange={(e) => setInfoDescription(e.target.value)}
                        placeholder="Describe your business..."
                        className={inputClass}
                        maxLength={750}
                      />
                      <p
                        className={`text-xs mt-1 ${
                          isLight ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {infoDescription.length}/750 characters
                      </p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className={labelClass}>Phone Number</label>
                      <input
                        type="tel"
                        value={infoPhone}
                        onChange={(e) => setInfoPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className={inputClass}
                      />
                    </div>

                    {/* Website */}
                    <div>
                      <label className={labelClass}>Website URL</label>
                      <input
                        type="url"
                        value={infoWebsite}
                        onChange={(e) => setInfoWebsite(e.target.value)}
                        placeholder="https://yourwebsite.com"
                        className={inputClass}
                      />
                    </div>

                    {/* Business Hours */}
                    <div>
                      <label className={labelClass}>Business Hours</label>
                      <div className="space-y-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <div
                            key={day}
                            className={`flex items-center gap-3 p-2.5 rounded-lg ${
                              isLight ? "bg-white" : "bg-gray-900/50"
                            }`}
                          >
                            <span
                              className={`w-10 text-sm font-medium ${
                                isLight ? "text-gray-700" : "text-gray-300"
                              }`}
                            >
                              {DAY_LABELS[day]}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                setInfoHours((prev) => ({
                                  ...prev,
                                  [day]: { ...prev[day], closed: !prev[day].closed },
                                }))
                              }
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                                !infoHours[day].closed
                                  ? isLight
                                    ? "bg-emerald-500"
                                    : "bg-emerald-600"
                                  : isLight
                                  ? "bg-gray-300"
                                  : "bg-gray-600"
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  !infoHours[day].closed
                                    ? "translate-x-[18px]"
                                    : "translate-x-[3px]"
                                }`}
                              />
                            </button>

                            {infoHours[day].closed ? (
                              <span
                                className={`text-sm ${
                                  isLight ? "text-gray-400" : "text-gray-500"
                                }`}
                              >
                                Closed
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="time"
                                  value={infoHours[day].open}
                                  onChange={(e) =>
                                    setInfoHours((prev) => ({
                                      ...prev,
                                      [day]: { ...prev[day], open: e.target.value },
                                    }))
                                  }
                                  className={`px-2 py-1 rounded border text-sm ${
                                    isLight
                                      ? "bg-white border-gray-300 text-gray-900"
                                      : "bg-gray-800 border-gray-700 text-white"
                                  }`}
                                />
                                <span
                                  className={`text-xs ${
                                    isLight ? "text-gray-400" : "text-gray-500"
                                  }`}
                                >
                                  to
                                </span>
                                <input
                                  type="time"
                                  value={infoHours[day].close}
                                  onChange={(e) =>
                                    setInfoHours((prev) => ({
                                      ...prev,
                                      [day]: { ...prev[day], close: e.target.value },
                                    }))
                                  }
                                  className={`px-2 py-1 rounded border text-sm ${
                                    isLight
                                      ? "bg-white border-gray-300 text-gray-900"
                                      : "bg-gray-800 border-gray-700 text-white"
                                  }`}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      onClick={handleSaveBusinessInfo}
                      disabled={savingInfo}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                        isLight
                          ? "bg-blue-600 hover:bg-blue-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      {savingInfo ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save Changes
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Section 5: Photos (Collapsible) ─── */}
        {isConnected && (
          <div className={cardClass}>
            <button
              type="button"
              onClick={() => setPhotosExpanded(!photosExpanded)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isLight ? "bg-purple-100" : "bg-purple-900/30"
                }`}
              >
                <Image
                  className={`w-5 h-5 ${
                    isLight ? "text-purple-600" : "text-purple-400"
                  }`}
                />
              </div>
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    isLight ? "text-gray-900" : "text-white"
                  }`}
                >
                  Photos
                </h3>
                <p
                  className={`text-xs ${
                    isLight ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  Manage your GBP photos and images
                </p>
              </div>
              {photosExpanded ? (
                <ChevronDown
                  className={`w-5 h-5 ${
                    isLight ? "text-gray-400" : "text-gray-500"
                  }`}
                />
              ) : (
                <ChevronRight
                  className={`w-5 h-5 ${
                    isLight ? "text-gray-400" : "text-gray-500"
                  }`}
                />
              )}
            </button>

            {photosExpanded && (
              <div className="mt-5 space-y-4">
                {/* Upload Button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isLight
                        ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                        : "bg-purple-900/30 text-purple-400 hover:bg-purple-900/50"
                    }`}
                  >
                    {showUploadForm ? (
                      <>
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        Upload Photo
                      </>
                    )}
                  </button>
                </div>

                {/* Upload Form */}
                {showUploadForm && (
                  <div
                    className={`rounded-lg border p-4 ${
                      isLight
                        ? "bg-white border-gray-200"
                        : "bg-gray-900 border-gray-700"
                    }`}
                  >
                    <div className="space-y-3">
                      <div>
                        <label className={labelClass}>
                          Image URL (Cloudinary or public URL)
                        </label>
                        <input
                          type="url"
                          value={uploadUrl}
                          onChange={(e) => setUploadUrl(e.target.value)}
                          placeholder="https://res.cloudinary.com/..."
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Category</label>
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value)}
                          className={inputClass}
                        >
                          {PHOTO_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleUploadPhoto}
                        disabled={uploadingPhoto || !uploadUrl.trim()}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                          isLight
                            ? "bg-purple-600 hover:bg-purple-700"
                            : "bg-purple-600 hover:bg-purple-700"
                        }`}
                      >
                        {uploadingPhoto ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        Upload
                      </button>
                    </div>
                  </div>
                )}

                {/* Photos Grid */}
                {loadingMedia ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2
                      className={`w-5 h-5 animate-spin ${
                        isLight ? "text-gray-400" : "text-gray-500"
                      }`}
                    />
                  </div>
                ) : mediaItems.length === 0 ? (
                  <p
                    className={`text-sm text-center py-6 ${
                      isLight ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    No photos found. Upload your first photo above.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mediaItems.map((item, i) => (
                      <div
                        key={item.name || i}
                        className={`relative rounded-lg overflow-hidden border group ${
                          isLight ? "border-gray-200" : "border-gray-700"
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-square relative">
                          <img
                            src={
                              item.thumbnailUrl ||
                              item.googleUrl ||
                              item.sourceUrl ||
                              ""
                            }
                            alt="GBP photo"
                            className="w-full h-full object-cover"
                          />
                          {/* Delete overlay */}
                          {item.name && (
                            <button
                              onClick={() => handleDeletePhoto(item.name!)}
                              disabled={deletingMedia === item.name}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
                            >
                              {deletingMedia === item.name ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                        {/* Category Badge */}
                        <div
                          className={`px-2 py-1.5 text-center ${
                            isLight ? "bg-gray-50" : "bg-gray-800"
                          }`}
                        >
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              item.locationAssociation?.category === "COVER"
                                ? isLight
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-blue-900/30 text-blue-400"
                                : item.locationAssociation?.category === "PROFILE"
                                ? isLight
                                  ? "bg-green-100 text-green-700"
                                  : "bg-green-900/30 text-green-400"
                                : item.locationAssociation?.category === "LOGO"
                                ? isLight
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-amber-900/30 text-amber-400"
                                : isLight
                                ? "bg-gray-100 text-gray-600"
                                : "bg-gray-700 text-gray-400"
                            }`}
                          >
                            {item.locationAssociation?.category || "ADDITIONAL"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save & Continue */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold text-white transition-colors disabled:opacity-50 ${
            isLight
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save &amp; Continue
        </button>
      </div>
    </div>
  );
}
