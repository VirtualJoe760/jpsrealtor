// src/app/admin/cms/edit/[slugId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";
import {
  Save,
  ArrowLeft,
  Globe,
  Loader2,
  FileText,
  Upload,
  X,
  AlertCircle,
} from "lucide-react";
import AdminNav from "@/app/components/AdminNav";
import TipTapEditor from "@/app/components/TipTapEditor";
import RegenerateButton from "@/app/components/RegenerateButton";

export default function EditPublishedArticlePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const slugId = params?.slugId as string;
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

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "articles",
    tags: [] as string[],
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

  const [tagInput, setTagInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && slugId) {
      loadPublishedArticle();
    }
  }, [status, slugId]);

  const loadPublishedArticle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/articles/load-published?slugId=${slugId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load article');
      }

      const article = data.article;

      setFormData({
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        tags: article.tags || [],
        featuredImage: article.featuredImage,
        seo: article.seo,
      });

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
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("type", "featured");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
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

  // Handle republish (save changes back to MDX file)
  const handleRepublish = async () => {
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
            tags: formData.tags,
            featuredImage: formData.featuredImage,
            seo: formData.seo,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Article updated successfully!\n\nView at: ${data.url}\n\n${data.warnings?.length ? 'Warnings:\n' + data.warnings.join('\n') : ''}`);
      } else {
        const errors = data.errors?.join("\n") || "Unknown error";
        alert(`Failed to update:\n\n${errors}`);
      }
    } catch (error) {
      console.error("Publish error:", error);
      alert("Network error while updating article");
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle save to database (optional backup)
  const handleSaveToDatabase = async () => {
    setIsSaving(true);

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

      alert("Article saved to database as backup!");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save article to database");
    } finally {
      setIsSaving(false);
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
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
      <div className="min-h-screen py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <AdminNav />
          <div className={`${cardBg} ${cardBorder} rounded-xl p-8 text-center mt-8`}>
            <AlertCircle className={`w-16 h-16 ${isLight ? 'text-red-600' : 'text-red-400'} mx-auto mb-4`} />
            <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>Failed to Load Article</h2>
            <p className={`${textSecondary} mb-6`}>{error}</p>
            <button
              onClick={() => router.push('/admin/cms')}
              className={`px-6 py-3 ${
                isLight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
              } text-white rounded-lg transition-colors`}
            >
              Back to CMS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" data-page="admin-edit-article">
      <div className="max-w-5xl mx-auto">
        <AdminNav />

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <button
                onClick={() => router.push('/admin/cms')}
                className={`flex items-center gap-2 ${textSecondary} hover:${textPrimary} mb-4`}
              >
                <ArrowLeft className="w-5 h-5" />
                Back to CMS
              </button>
              <h1
                className={`text-2xl md:text-4xl font-bold ${textPrimary} mb-2 flex items-center gap-2 md:gap-3`}
              >
                <FileText
                  className={`w-8 h-8 md:w-10 md:h-10 ${
                    isLight ? "text-blue-500" : "text-emerald-400"
                  }`}
                />
                Edit Published Article
              </h1>
              <p className={`${textSecondary}`}>
                Editing: {slugId}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <button
                onClick={handleSaveToDatabase}
                disabled={isSaving || isPublishing}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${
                  isLight
                    ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                } rounded-lg transition-colors font-semibold disabled:opacity-50`}
              >
                {isSaving ? (
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
                onClick={handleRepublish}
                disabled={isSaving || isPublishing}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${
                  isLight
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
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

        {/* Editor Form */}
        <div className="space-y-6">
          {/* Title with Regenerate Button */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-2">
              <label className={`block text-sm font-semibold ${textSecondary}`}>
                Title
              </label>
              <RegenerateButton
                field="title"
                currentValue={formData.title}
                articleContext={{
                  title: formData.title,
                  excerpt: formData.excerpt,
                  content: formData.content,
                  category: formData.category,
                  keywords: formData.seo.keywords,
                }}
                onRegenerate={(newValue) =>
                  setFormData((prev) => ({ ...prev, title: newValue as string }))
                }
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
              className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                isLight ? "blue" : "emerald"
              }-500 text-xl font-semibold`}
            />
          </div>

          {/* Excerpt with Regenerate Button */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-2">
              <label className={`block text-sm font-semibold ${textSecondary}`}>
                Excerpt
              </label>
              <RegenerateButton
                field="excerpt"
                currentValue={formData.excerpt}
                articleContext={{
                  title: formData.title,
                  excerpt: formData.excerpt,
                  content: formData.content,
                  category: formData.category,
                  keywords: formData.seo.keywords,
                }}
                onRegenerate={(newValue) =>
                  setFormData((prev) => ({ ...prev, excerpt: newValue as string }))
                }
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
              className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                isLight ? "blue" : "emerald"
              }-500 resize-none`}
            />
            <p className={`text-xs ${textMuted} mt-2`}>
              {formData.excerpt.length}/300 characters
            </p>
          </div>

          {/* Content Editor with Regenerate Button */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <label className={`block text-sm font-semibold ${textSecondary}`}>
                Content
              </label>
              <RegenerateButton
                field="content"
                currentValue={formData.content}
                articleContext={{
                  title: formData.title,
                  excerpt: formData.excerpt,
                  content: formData.content,
                  category: formData.category,
                  keywords: formData.seo.keywords,
                }}
                onRegenerate={(newValue) =>
                  setFormData((prev) => ({ ...prev, content: newValue as string }))
                }
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
          </div>

          {/* Category */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>
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
              className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} focus:outline-none focus:border-${
                isLight ? "blue" : "emerald"
              }-500`}
            >
              <option value="articles">Articles</option>
              <option value="market-insights">Market Insights</option>
              <option value="real-estate-tips">Real Estate Tips</option>
            </select>
          </div>

          {/* Tags */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>
              Tags
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                placeholder="Add tag..."
                className={`flex-1 px-4 py-2 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                  isLight ? "blue" : "emerald"
                }-500 text-sm`}
              />
              <button
                onClick={handleAddTag}
                className={`px-4 py-2 ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                } text-white rounded-lg transition-colors`}
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1 ${
                    isLight
                      ? "bg-blue-500/20 text-blue-600"
                      : "bg-blue-500/20 text-blue-400"
                  } rounded-full text-sm flex items-center gap-2`}
                >
                  {tag}
                  <button
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        tags: prev.tags.filter((t) => t !== tag),
                      }))
                    }
                    className={`${
                      isLight
                        ? "hover:text-blue-800"
                        : "hover:text-blue-300"
                    }`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Featured Image */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>
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

          {/* SEO Section */}
          <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
            <h3 className={`text-sm font-semibold ${textSecondary} mb-4`}>
              SEO
            </h3>
            <div className="space-y-4">
              {/* SEO Title with Regenerate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-xs ${textMuted}`}>
                    Meta Title
                  </label>
                  <RegenerateButton
                    field="seoTitle"
                    currentValue={formData.seo.title}
                    articleContext={{
                      title: formData.title,
                      excerpt: formData.excerpt,
                      content: formData.content,
                      category: formData.category,
                      keywords: formData.seo.keywords,
                    }}
                    onRegenerate={(newValue) =>
                      setFormData((prev) => ({
                        ...prev,
                        seo: { ...prev.seo, title: newValue as string },
                      }))
                    }
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
                  className={`w-full px-3 py-2 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                    isLight ? "blue" : "emerald"
                  }-500 text-sm`}
                />
                <p className={`text-xs ${textMuted} mt-1`}>
                  {formData.seo.title.length}/60
                </p>
              </div>

              {/* SEO Description with Regenerate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-xs ${textMuted}`}>
                    Meta Description
                  </label>
                  <RegenerateButton
                    field="seoDescription"
                    currentValue={formData.seo.description}
                    articleContext={{
                      title: formData.title,
                      excerpt: formData.excerpt,
                      content: formData.content,
                      category: formData.category,
                      keywords: formData.seo.keywords,
                    }}
                    onRegenerate={(newValue) =>
                      setFormData((prev) => ({
                        ...prev,
                        seo: { ...prev.seo, description: newValue as string },
                      }))
                    }
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
                  className={`w-full px-3 py-2 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                    isLight ? "blue" : "emerald"
                  }-500 text-sm resize-none`}
                />
                <p className={`text-xs ${textMuted} mt-1`}>
                  {formData.seo.description.length}/160
                </p>
              </div>

              {/* Keywords with Regenerate */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={`block text-xs ${textMuted}`}>
                    Keywords
                  </label>
                  <RegenerateButton
                    field="keywords"
                    currentValue={formData.seo.keywords}
                    articleContext={{
                      title: formData.title,
                      excerpt: formData.excerpt,
                      content: formData.content,
                      category: formData.category,
                      keywords: formData.seo.keywords,
                    }}
                    onRegenerate={(newValue) =>
                      setFormData((prev) => ({
                        ...prev,
                        seo: { ...prev.seo, keywords: newValue as string[] },
                      }))
                    }
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
                    className={`flex-1 px-3 py-2 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                      isLight ? "blue" : "emerald"
                    }-500 text-sm`}
                  />
                  <button
                    onClick={handleAddKeyword}
                    className={`px-3 py-2 ${
                      isLight
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-emerald-600 hover:bg-emerald-700"
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
    </div>
  );
}
