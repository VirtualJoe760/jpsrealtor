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

  useEffect(() => {
    if (isConnected) {
      fetchPosts();
    }
  }, [isConnected, fetchPosts]);

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

  const handleSave = () => {
    onSave({
      adAccounts: {
        ...formData.adAccounts,
        gbp: {
          ...gbp,
          autoPostArticles,
          includeImage,
          defaultCtaType,
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

        {/* ─── Section 4: Business Info Sync ─── */}
        {isConnected && (
          <div className={cardClass}>
            <h3
              className={`font-semibold mb-3 ${
                isLight ? "text-gray-900" : "text-white"
              }`}
            >
              Business Info Sync
            </h3>
            <p
              className={`text-sm mb-3 ${
                isLight ? "text-gray-600" : "text-gray-300"
              }`}
            >
              Your GBP business hours, description, and photos can be managed
              through the Google Business Profile dashboard.
            </p>
            <a
              href="https://business.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                isLight
                  ? "text-blue-600 hover:text-blue-700"
                  : "text-blue-400 hover:text-blue-300"
              }`}
            >
              <ExternalLink className="w-4 h-4" />
              Open Google Business Profile Dashboard
            </a>
            <p
              className={`text-xs mt-3 ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Syncing business info directly from this platform is planned for a
              future update.
            </p>
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
