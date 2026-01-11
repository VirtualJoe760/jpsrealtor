// src/app/agent/cms/edit/[slugId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import {
  Save,
  Monitor,
  Eye,
  Sparkles,
  Upload,
  Tag,
  Calendar,
  FileText,
  Loader2,
  Edit3,
  Wand2,
  Globe,
  ArrowLeft,
  FileEdit,
} from "lucide-react";
import AgentNav from "@/app/components/AgentNav";
import TipTapEditor from "@/app/components/TipTapEditor";
import RegenerateButton from "@/app/components/RegenerateButton";

type TabType = "edit" | "preview";

export default function EditArticlePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const slugId = params.slugId as string;
  const { currentTheme } = useTheme();
  const {
    cardBg,
    cardBorder,
    bgSecondary,
    textPrimary,
    textSecondary,
    textMuted,
    border,
  } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  // Mobile tab state
  const [activeTab, setActiveTab] = useState<TabType>("edit");

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Article form state
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "articles",
    featuredImage: {
      url: "",
      publicId: "",
      alt: "",
    },
    seo: {
      title: "",
      description: "",
      keywords: [] as string[],
    },
  });

  const [keywordInput, setKeywordInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingToDB, setIsSavingToDB] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Load article on mount
  useEffect(() => {
    if (status === "authenticated" && slugId) {
      loadArticle();
    }
  }, [status, slugId]);

  const loadArticle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, try to load from MongoDB by slug
      const dbResponse = await fetch(`/api/articles?search=${slugId}&limit=1`);
      const dbData = await dbResponse.json();

      // Check if we found the article in MongoDB (by matching slug)
      const dbArticle = dbData.articles?.find((a: any) => a.slug === slugId);

      if (dbArticle) {
        // Article found in MongoDB, use it
        console.log('Loading article from MongoDB');
        setFormData({
          title: dbArticle.title || '',
          excerpt: dbArticle.excerpt || '',
          content: dbArticle.content || '',
          category: dbArticle.category || 'articles',
          featuredImage: dbArticle.featuredImage || { url: '', publicId: '', alt: '' },
          seo: dbArticle.seo || { title: '', description: '', keywords: [] },
        });
      } else {
        // Not in MongoDB, try loading from published MDX file
        console.log('Article not in MongoDB, trying MDX file');
        const mdxResponse = await fetch(`/api/articles/load-published?slugId=${slugId}`);
        const mdxData = await mdxResponse.json();

        if (!mdxData.success) {
          throw new Error(mdxData.error || 'Article not found in MongoDB or MDX files');
        }

        const article = mdxData.article;
        setFormData({
          title: article.title,
          excerpt: article.excerpt,
          content: article.content,
          category: article.category,
          featuredImage: article.featuredImage,
          seo: article.seo,
        });
      }

    } catch (error) {
      console.error("Load error:", error);
      setError(error instanceof Error ? error.message : 'Failed to load article');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("type", "featured");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json();

      setFormData((prev) => ({
        ...prev,
        featuredImage: {
          url: data.url,
          publicId: data.publicId,
          alt: prev.title || "Featured image",
        },
      }));
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle republish to website (update MDX file)
  const handleRepublish = async (isDraft: boolean = false) => {
    if (!slugId) {
      alert("No slug ID available for republishing");
      return;
    }

    if (!formData.title || !formData.content || !formData.featuredImage.url) {
      alert("Please ensure you have a title, content, and featured image before publishing");
      return;
    }

    setIsPublishing(true);

    try {
      const response = await fetch("/api/articles/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slugId,
          article: {
            title: formData.title,
            excerpt: formData.excerpt,
            content: formData.content,
            category: formData.category,
            draft: isDraft,  // Add draft flag
            featuredImage: formData.featuredImage,
            seo: formData.seo,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        const draftMsg = isDraft ? ' (saved as draft)' : '';
        alert(`Article updated on website${draftMsg}!\n\nView at: ${data.url}\n\n${data.warnings?.length ? 'Warnings:\n' + data.warnings.join('\n') : ''}`);
      } else {
        const errors = data.errors?.join("\n") || "Unknown error";
        alert(`Failed to update:\n\n${errors}`);
      }
    } catch (error) {
      console.error("Republish error:", error);
      alert("Network error while updating article");
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle save as draft
  const handleSaveAsDraft = async () => {
    await handleRepublish(true);
  };

  // Handle save to database
  const handleSaveToDatabase = async () => {
    setIsSavingToDB(true);

    try {
      const articleData = {
        ...formData,
        status: "published",
        publishedAt: new Date().toISOString(),
      };

      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) throw new Error("Failed to save article");

      alert("Article saved to database successfully!");
    } catch (error) {
      console.error("Save to DB error:", error);
      alert("Failed to save to database");
    } finally {
      setIsSavingToDB(false);
    }
  };

  // Add keyword
  const handleAddKeyword = () => {
    if (
      keywordInput.trim() &&
      !formData.seo.keywords.includes(keywordInput.trim())
    ) {
      setFormData((prev) => ({
        ...prev,
        seo: {
          ...prev.seo,
          keywords: [...prev.seo.keywords, keywordInput.trim()],
        },
      }));
      setKeywordInput("");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className={`w-16 h-16 border-4 ${
              isLight ? "border-blue-500" : "border-emerald-500"
            } border-t-transparent rounded-full animate-spin mx-auto mb-4`}
          ></div>
          <p className={`${textSecondary}`}>Loading article...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push("/agent/cms")}
            className={`px-6 py-3 ${
              isLight
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white rounded-lg transition-colors`}
          >
            Back to Articles
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" data-page="admin-edit-article">
      <div className="max-w-7xl mx-auto">
        <AgentNav />

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <button
                onClick={() => router.push("/agent/cms")}
                className={`flex items-center gap-2 ${textSecondary} hover:${textPrimary} mb-3 transition-colors`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Articles
              </button>
              <h1
                className={`text-2xl md:text-4xl font-bold ${textPrimary} mb-2 flex items-center gap-2 md:gap-3`}
              >
                <FileText
                  className={`w-8 h-8 md:w-10 md:h-10 ${
                    isLight ? "text-blue-500" : "text-emerald-400"
                  }`}
                />
                Edit Article
              </h1>
              <p className={`${textSecondary}`}>
                Edit and republish your article
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <button
                onClick={handleSaveToDatabase}
                disabled={isSavingToDB || isPublishing}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-purple-600 hover:bg-purple-700"
                } text-white rounded-lg transition-colors font-semibold disabled:opacity-50`}
              >
                {isSavingToDB ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                    Backup to DB
                  </>
                )}
              </button>
              <button
                onClick={handleSaveAsDraft}
                disabled={isSavingToDB || isPublishing}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${
                  isLight
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-orange-600 hover:bg-orange-700"
                } text-white rounded-lg transition-colors font-semibold disabled:opacity-50`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <FileEdit className="w-4 h-4 sm:w-5 sm:h-5" />
                    Save as Draft
                  </>
                )}
              </button>
              <button
                onClick={() => handleRepublish(false)}
                disabled={isSavingToDB || isPublishing}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-lg transition-colors font-semibold disabled:opacity-50`}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
                    Update on Site
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden mb-6">
          <div className={`${cardBg} ${cardBorder} rounded-xl p-1 flex gap-1`}>
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "edit"
                  ? isLight
                    ? "bg-blue-600 text-white"
                    : "bg-blue-600 text-white"
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => {
                setActiveTab("preview");
                setPreviewKey((prev) => prev + 1);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "preview"
                  ? isLight
                    ? "bg-blue-600 text-white"
                    : "bg-blue-600 text-white"
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <Monitor className="w-4 h-4" />
              Preview
            </button>
          </div>
        </div>

        {/* Main Content - Side by Side on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Panel - Preview (40%) */}
          <div className={`lg:col-span-2 ${activeTab !== "edit" ? "hidden lg:block" : ""}`}>
            <div className={`${cardBg} ${cardBorder} rounded-xl p-6 space-y-6`}>
              <div>
                <h2 className={`text-xl font-bold ${textPrimary} mb-2 flex items-center gap-2`}>
                  <Monitor className={`w-5 h-5 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
                  Live Preview
                </h2>
                <p className={`text-sm ${textSecondary}`}>
                  See your changes in real-time
                </p>
              </div>

              <button
                onClick={() => setPreviewKey((prev) => prev + 1)}
                className={`w-full px-4 py-3 text-sm ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white rounded-lg transition-colors font-semibold`}
              >
                Refresh Preview
              </button>

              {/* Preview iframe */}
              <div className={`${border} rounded-lg overflow-hidden`} style={{ height: "800px" }}>
                <iframe
                  key={`sidebar-preview-${previewKey}`}
                  src={`/articles/preview?${new URLSearchParams({
                    title: formData.title || "Untitled Article",
                    excerpt: formData.excerpt || "",
                    content: formData.content || "",
                    category: formData.category,
                    imageUrl: formData.featuredImage.url || "",
                    theme: currentTheme,
                  }).toString()}`}
                  className="w-full h-full"
                  title="Article Preview"
                />
              </div>
              <p className={`text-xs ${textMuted}`}>
                Click refresh to see latest changes • Scroll right to edit →
              </p>
            </div>
          </div>

          {/* Right Panel - Editor (60%) */}
          <div className={`lg:col-span-3 ${activeTab !== "edit" ? "hidden lg:block" : ""}`}>
            <div className="space-y-6">
              {/* Title with Regenerate */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className={`block text-sm font-semibold ${textSecondary}`}
                  >
                    Title
                  </label>
                  <RegenerateButton
                    field="title"
                    currentValue={formData.title}
                    onRegenerate={(newValue) =>
                      setFormData((prev) => ({ ...prev, title: newValue as string }))
                    }
                    articleContext={{
                      category: formData.category,
                      excerpt: formData.excerpt,
                      content: formData.content.substring(0, 500),
                      keywords: formData.seo.keywords,
                    }}
                    isLight={isLight}
                  />
                </div>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter article title..."
                  className={`w-full px-4 py-3 rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none text-xl font-semibold transition-all ${
                    isLight
                      ? "bg-white border-2 border-slate-300 shadow-md hover:shadow-lg focus:shadow-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                      : "bg-gray-800 border-2 border-gray-700 shadow-lg shadow-black/50 hover:shadow-xl hover:shadow-black/60 focus:shadow-2xl focus:shadow-emerald-500/20 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                  }`}
                />
              </div>

              {/* Excerpt with Regenerate */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <div className="flex items-center justify-between mb-2">
                  <label
                    className={`block text-sm font-semibold ${textSecondary}`}
                  >
                    Excerpt
                  </label>
                  <RegenerateButton
                    field="excerpt"
                    currentValue={formData.excerpt}
                    onRegenerate={(newValue) =>
                      setFormData((prev) => ({ ...prev, excerpt: newValue as string }))
                    }
                    articleContext={{
                      title: formData.title,
                      category: formData.category,
                      content: formData.content.substring(0, 500),
                      keywords: formData.seo.keywords,
                    }}
                    isLight={isLight}
                  />
                </div>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      excerpt: e.target.value,
                    }))
                  }
                  placeholder="Brief description (max 300 characters)..."
                  maxLength={300}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none resize-none transition-all ${
                    isLight
                      ? "bg-white border-2 border-slate-300 shadow-md hover:shadow-lg focus:shadow-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                      : "bg-gray-800 border-2 border-gray-700 shadow-lg shadow-black/50 hover:shadow-xl hover:shadow-black/60 focus:shadow-2xl focus:shadow-emerald-500/20 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                  }`}
                />
                <p className={`text-xs ${textMuted} mt-2`}>
                  {formData.excerpt.length}/300 characters
                </p>
              </div>

              {/* Category */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <label
                  className={`block text-sm font-semibold ${textSecondary} mb-2`}
                >
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      category: e.target.value as any,
                    }))
                  }
                  className={`w-full px-4 py-3 rounded-lg ${textPrimary} focus:outline-none transition-all ${
                    isLight
                      ? "bg-white border-2 border-slate-300 shadow-md hover:shadow-lg focus:shadow-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                      : "bg-gray-800 border-2 border-gray-700 shadow-lg shadow-black/50 hover:shadow-xl hover:shadow-black/60 focus:shadow-2xl focus:shadow-emerald-500/20 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                  }`}
                >
                  <option value="articles">Articles</option>
                  <option value="market-insights">Market Insights</option>
                  <option value="real-estate-tips">Real Estate Tips</option>
                </select>
              </div>

              {/* Content Editor with Regenerate */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <label
                    className={`block text-sm font-semibold ${textSecondary}`}
                  >
                    Content
                  </label>
                  <RegenerateButton
                    field="content"
                    currentValue={formData.content}
                    onRegenerate={(newValue) =>
                      setFormData((prev) => ({ ...prev, content: newValue as string }))
                    }
                    articleContext={{
                      title: formData.title,
                      excerpt: formData.excerpt,
                      category: formData.category,
                      keywords: formData.seo.keywords,
                    }}
                    isLight={isLight}
                  />
                </div>
                <TipTapEditor
                  content={formData.content}
                  onChange={(content) =>
                    setFormData((prev) => ({ ...prev, content }))
                  }
                  placeholder="Write your article content..."
                  isLight={isLight}
                />
                <p className={`text-xs ${textMuted} mt-3`}>
                  Use the toolbar to format your content
                </p>
              </div>

              {/* Featured Image */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <label
                  className={`block text-sm font-semibold ${textSecondary} mb-2`}
                >
                  Featured Image
                </label>
                {formData.featuredImage.url ? (
                  <div className="relative">
                    <img
                      src={formData.featuredImage.url}
                      alt="Featured"
                      className="w-full rounded-lg mb-2"
                    />
                    <button
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          featuredImage: { url: "", publicId: "", alt: "" },
                        }))
                      }
                      className="absolute top-2 right-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div
                      className={`border-2 border-dashed ${
                        isLight ? "border-gray-300" : "border-gray-700"
                      } rounded-lg p-8 text-center cursor-pointer hover:border-${
                        isLight ? "blue" : "emerald"
                      }-500 transition-colors`}
                    >
                      {isUploading ? (
                        <Loader2
                          className={`w-8 h-8 ${
                            isLight ? "text-blue-400" : "text-emerald-400"
                          } animate-spin mx-auto mb-2`}
                        />
                      ) : (
                        <Upload
                          className={`w-8 h-8 ${
                            isLight ? "text-gray-500" : "text-gray-400"
                          } mx-auto mb-2`}
                        />
                      )}
                      <p className={`text-sm ${textMuted}`}>
                        {isUploading ? "Uploading..." : "Click to upload"}
                      </p>
                    </div>
                  </label>
                )}
              </div>

              {/* SEO with Regenerate buttons */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <h3 className={`text-sm font-semibold ${textSecondary} mb-4`}>
                  SEO
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-xs ${textMuted}`}>
                        Meta Title
                      </label>
                      <RegenerateButton
                        field="seoTitle"
                        currentValue={formData.seo.title}
                        onRegenerate={(newValue) =>
                          setFormData((prev) => ({
                            ...prev,
                            seo: { ...prev.seo, title: newValue as string },
                          }))
                        }
                        articleContext={{
                          title: formData.title,
                          category: formData.category,
                          excerpt: formData.excerpt,
                          keywords: formData.seo.keywords,
                        }}
                        isLight={isLight}
                      />
                    </div>
                    <input
                      type="text"
                      value={formData.seo.title}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, title: e.target.value },
                        }))
                      }
                      maxLength={60}
                      placeholder="SEO title..."
                      className={`w-full px-3 py-2 rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none text-sm transition-all ${
                      isLight
                        ? "bg-white border-2 border-slate-300 shadow-md hover:shadow-lg focus:shadow-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                        : "bg-gray-800 border-2 border-gray-700 shadow-lg shadow-black/50 hover:shadow-xl hover:shadow-black/60 focus:shadow-2xl focus:shadow-emerald-500/20 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                    }`}
                    />
                    <p className={`text-xs ${textMuted} mt-1`}>
                      {formData.seo.title.length}/60
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-xs ${textMuted}`}>
                        Meta Description
                      </label>
                      <RegenerateButton
                        field="seoDescription"
                        currentValue={formData.seo.description}
                        onRegenerate={(newValue) =>
                          setFormData((prev) => ({
                            ...prev,
                            seo: { ...prev.seo, description: newValue as string },
                          }))
                        }
                        articleContext={{
                          title: formData.title,
                          excerpt: formData.excerpt,
                          category: formData.category,
                          keywords: formData.seo.keywords,
                        }}
                        isLight={isLight}
                      />
                    </div>
                    <textarea
                      value={formData.seo.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          seo: { ...prev.seo, description: e.target.value },
                        }))
                      }
                      maxLength={160}
                      rows={3}
                      placeholder="SEO description..."
                      className={`w-full px-3 py-2 rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none text-sm resize-none transition-all ${
                        isLight
                          ? "bg-white border-2 border-slate-300 shadow-md hover:shadow-lg focus:shadow-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                          : "bg-gray-800 border-2 border-gray-700 shadow-lg shadow-black/50 hover:shadow-xl hover:shadow-black/60 focus:shadow-2xl focus:shadow-emerald-500/20 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                      }`}
                    />
                    <p className={`text-xs ${textMuted} mt-1`}>
                      {formData.seo.description.length}/160
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-xs ${textMuted}`}>
                        Keywords
                      </label>
                      <RegenerateButton
                        field="keywords"
                        currentValue={formData.seo.keywords}
                        onRegenerate={(newValue) => {
                          const keywords = Array.isArray(newValue)
                            ? newValue
                            : (newValue as string).split(",").map((k) => k.trim()).filter(Boolean);
                          setFormData((prev) => ({
                            ...prev,
                            seo: { ...prev.seo, keywords },
                          }));
                        }}
                        articleContext={{
                          title: formData.title,
                          excerpt: formData.excerpt,
                          category: formData.category,
                          keywords: formData.seo.keywords,
                        }}
                        isLight={isLight}
                      />
                    </div>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleAddKeyword()
                        }
                        placeholder="Add keyword..."
                        className={`flex-1 px-3 py-2 rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none text-sm transition-all ${
                      isLight
                        ? "bg-white border-2 border-slate-300 shadow-md hover:shadow-lg focus:shadow-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
                        : "bg-gray-800 border-2 border-gray-700 shadow-lg shadow-black/50 hover:shadow-xl hover:shadow-black/60 focus:shadow-2xl focus:shadow-emerald-500/20 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                    }`}
                      />
                      <button
                        onClick={handleAddKeyword}
                        className={`px-3 py-2 ${
                          isLight
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        } text-white rounded-lg transition-colors text-sm`}
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {formData.seo.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 ${
                            isLight
                              ? "bg-gray-200 text-gray-700"
                              : "bg-gray-700 text-gray-300"
                          } rounded text-xs flex items-center gap-1`}
                        >
                          {keyword}
                          <button
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                seo: {
                                  ...prev.seo,
                                  keywords: prev.seo.keywords.filter(
                                    (k) => k !== keyword
                                  ),
                                },
                              }))
                            }
                            className="hover:text-red-400"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Preview Panel - Mobile Only via Tab */}
          {activeTab === "preview" && (
            <div className="lg:hidden col-span-1">
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-semibold ${textPrimary}`}>
                    Article Preview
                  </h3>
                  <button
                    onClick={() => setPreviewKey((prev) => prev + 1)}
                    className={`px-3 py-2 text-sm ${
                      isLight
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white rounded-lg transition-colors font-semibold`}
                  >
                    Refresh
                  </button>
                </div>

                {/* Mobile Preview Frame */}
                <div className="relative mx-auto max-w-md">
                  <div
                    className="w-full rounded-2xl overflow-hidden border-4 border-gray-700 shadow-2xl bg-white"
                    style={{ minHeight: "600px" }}
                  >
                    <iframe
                      key={previewKey}
                      src={`/articles/preview?${new URLSearchParams({
                        title: formData.title || "Untitled Article",
                        excerpt: formData.excerpt || "",
                        content: formData.content || "",
                        category: formData.category,
                        imageUrl: formData.featuredImage.url || "",
                        theme: currentTheme,
                      }).toString()}`}
                      className="w-full h-screen"
                      title="Article Preview"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
