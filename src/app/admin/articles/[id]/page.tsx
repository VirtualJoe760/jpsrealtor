// src/app/admin/articles/[id]/page.tsx
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
  ArrowLeft,
} from "lucide-react";

export default function EditArticlePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;
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

  // Loading state
  const [isLoadingArticle, setIsLoadingArticle] = useState(true);

  // Claude drafting state
  const [isClaudeDrafting, setIsClaudeDrafting] = useState(false);
  const [claudePrompt, setClaudePrompt] = useState("");
  const [showClaudeModal, setShowClaudeModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // Article form state
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "articles",
    tags: [] as string[],
    status: "draft",
    featured: false,
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
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Load existing article
  useEffect(() => {
    if (status === "authenticated" && articleId) {
      fetchArticle();
    }
  }, [status, articleId]);

  const fetchArticle = async () => {
    try {
      setIsLoadingArticle(true);
      const response = await fetch(`/api/articles/${articleId}`);

      if (!response.ok) {
        if (response.status === 404) {
          alert(
            "Article not found in database.\n\n" +
            "This article may only exist as a published MDX file.\n" +
            "Please use the 'Edit Site' (Globe icon) button instead to edit published articles.\n\n" +
            "Redirecting to articles list..."
          );
        }
        throw new Error("Article not found");
      }

      const data = await response.json();

      // Populate form with existing article data
      setFormData({
        title: data.title || "",
        excerpt: data.excerpt || "",
        content: data.content || "",
        category: data.category || "articles",
        tags: data.tags || [],
        status: data.status || "draft",
        featured: data.featured || false,
        featuredImage: {
          url: data.featuredImage?.url || "",
          publicId: data.featuredImage?.publicId || "",
          alt: data.featuredImage?.alt || "",
        },
        seo: {
          title: data.seo?.title || "",
          description: data.seo?.description || "",
          keywords: data.seo?.keywords || [],
        },
      });
    } catch (error) {
      console.error("Failed to fetch article:", error);
      alert("Failed to load article. Redirecting to articles list...");
      router.push("/admin/articles");
    } finally {
      setIsLoadingArticle(false);
    }
  };

  // Handle Claude drafting for edits
  const handleClaudeDraft = async () => {
    if (!claudePrompt.trim()) {
      alert("Please enter instructions for Claude");
      return;
    }

    setIsClaudeDrafting(true);
    setShowClaudeModal(false);

    try {
      const response = await fetch("/api/claude/draft-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: claudePrompt,
          category: formData.category,
          keywords: formData.seo.keywords,
          tone: "professional yet approachable",
          length: "medium",
          existingArticleId: articleId, // Pass article ID for edit context
          userMessage: `Edit the existing article. Current content: ${formData.content.substring(0, 500)}...`,
        }),
      });

      if (!response.ok) throw new Error("Failed to draft article");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.substring(6));

                if (data.text) {
                  accumulatedContent += data.text;
                  setFormData((prev) => ({
                    ...prev,
                    content: accumulatedContent,
                  }));
                }

                if (data.type === "complete" && data.parsed) {
                  const { frontmatter, content } = data.parsed;

                  setFormData((prev) => ({
                    ...prev,
                    title: frontmatter.title || prev.title,
                    excerpt: frontmatter.excerpt || prev.excerpt,
                    content: content,
                    category: frontmatter.category || prev.category,
                    tags: frontmatter.tags || prev.tags,
                    seo: {
                      title: frontmatter.seo?.title || frontmatter.title || prev.seo.title,
                      description: frontmatter.seo?.description || frontmatter.excerpt || prev.seo.description,
                      keywords: frontmatter.seo?.keywords || frontmatter.tags || prev.seo.keywords,
                    },
                  }));
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Claude draft error:", error);
      alert("Failed to draft article with Claude");
    } finally {
      setIsClaudeDrafting(false);
    }
  };

  // Handle image upload
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "featured" | "og"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (type === "featured") {
        setFormData((prev) => ({
          ...prev,
          featuredImage: {
            url: data.url,
            publicId: data.publicId,
            alt: prev.title || "Featured image",
          },
        }));
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle update article
  const handleSave = async (publishNow: boolean = false) => {
    setIsSaving(true);

    try {
      const articleData = {
        ...formData,
        status: publishNow ? "published" : formData.status,
        publishedAt: publishNow ? new Date().toISOString() : undefined,
      };

      const response = await fetch(`/api/articles/${articleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) throw new Error("Failed to update article");

      const data = await response.json();
      alert("Article updated successfully!");
      router.push("/admin/articles");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to update article");
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
    if (keywordInput.trim() && !formData.seo.keywords.includes(keywordInput.trim())) {
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

  if (status === "loading" || isLoadingArticle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className={`w-16 h-16 border-4 ${isLight ? "border-blue-500" : "border-emerald-500"} border-t-transparent rounded-full animate-spin mx-auto mb-4`}></div>
          <p className={`${textSecondary}`}>Loading article...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" data-page="admin-edit-article">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 pt-16 md:pt-0">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <button
                onClick={() => router.push("/admin/articles")}
                className={`flex items-center gap-2 ${textSecondary} hover:${textPrimary} mb-3 transition-colors`}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Articles
              </button>
              <h1 className={`text-2xl md:text-4xl font-bold ${textPrimary} mb-2 flex items-center gap-2 md:gap-3`}>
                <FileText className={`w-8 h-8 md:w-10 md:h-10 ${isLight ? "text-blue-500" : "text-emerald-400"}`} />
                Edit Article
              </h1>
              <p className={`${textSecondary}`}>Update your blog article</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <button
                onClick={() => setShowClaudeModal(true)}
                disabled={isClaudeDrafting}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${isLight ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-600 hover:bg-purple-700"} text-white rounded-lg transition-colors font-semibold disabled:opacity-50`}
              >
                {isClaudeDrafting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Editing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                    Edit with Claude
                  </>
                )}
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${textPrimary} rounded-lg transition-colors font-semibold ${isLight ? "bg-gray-200 hover:bg-gray-300 border border-gray-300" : "bg-gray-700 hover:bg-gray-600 border border-gray-700"}`}
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                Save Changes
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white rounded-lg transition-colors font-semibold`}
              >
                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                {formData.status === "published" ? "Update & Publish" : "Publish Now"}
              </button>
              <button
                onClick={() => {
                  setShowPreview(!showPreview);
                  setPreviewKey(prev => prev + 1);
                }}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${showPreview ? (isLight ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-600 hover:bg-purple-700") : (isLight ? "bg-gray-200 hover:bg-gray-300 border border-gray-300" : "bg-gray-700 hover:bg-gray-600 border border-gray-700")} ${showPreview ? "text-white" : textPrimary} rounded-lg transition-colors font-semibold`}
              >
                <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
                {`${showPreview ? "Hide" : "Show"} Preview`}
              </button>
            </div>
          </div>
        </div>

        {/* Form and Preview */}
        <div className="grid gap-8 grid-cols-1">
          {/* Form Container */}
          <div className={`max-w-6xl mx-auto w-full transition-all ${showPreview ? "xl:mr-[25rem]" : ""}`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Title */}
                <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                  <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Enter article title..."
                    className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-blue-500 text-xl font-semibold`}
                  />
                </div>

              {/* Excerpt */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
              <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>
                Excerpt
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                }
                placeholder="Brief description (max 300 characters)..."
                maxLength={300}
                rows={3}
                className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none`}
              />
              <p className={`text-xs ${textMuted} mt-2`}>
                {formData.excerpt.length}/300 characters
              </p>
              </div>

              {/* Content Editor */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
              <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>
                Content (MDX)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Write your article content in MDX format..."
                rows={20}
                className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-sm resize-none`}
              />
              </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
              {/* Status Badge */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as any,
                    }))
                  }
                  className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} focus:outline-none focus:border-${isLight ? "blue" : "emerald"}-500`}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
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
                className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} focus:outline-none focus:border-${isLight ? "blue" : "emerald"}-500`}
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
                  className={`flex-1 px-4 py-2 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm`}
                />
                <button
                  onClick={handleAddTag}
                  className={`px-4 py-2 ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white rounded-lg transition-colors`}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          tags: prev.tags.filter((t) => t !== tag),
                        }))
                      }
                      className="hover:text-blue-300"
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
                    onChange={(e) => handleImageUpload(e, "featured")}
                    className="hidden"
                  />
                  <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    )}
                    <p className="text-sm text-gray-400">
                      {isUploading ? "Uploading..." : "Click to upload"}
                    </p>
                  </div>
                </label>
              )}
              </div>

              {/* SEO */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
              <h3 className={`text-sm font-semibold ${textSecondary} mb-4`}>SEO</h3>
              <div className="space-y-4">
                <div>
                  <label className={`block text-xs ${textMuted} mb-1`}>
                    Meta Title
                  </label>
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
                    className={`w-full px-3 py-2 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm`}
                  />
                  <p className={`text-xs ${textMuted} mt-1`}>
                    {formData.seo.title.length}/60
                  </p>
                </div>
                <div>
                  <label className={`block text-xs ${textMuted} mb-1`}>
                    Meta Description
                  </label>
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
                    className={`w-full px-3 py-2 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm resize-none`}
                  />
                  <p className={`text-xs ${textMuted} mt-1`}>
                    {formData.seo.description.length}/160
                  </p>
                </div>
                <div>
                  <label className={`block text-xs ${textMuted} mb-1`}>
                    Keywords
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddKeyword()}
                      placeholder="Add keyword..."
                      className={`flex-1 px-3 py-2 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm`}
                    />
                    <button
                      onClick={handleAddKeyword}
                      className={`px-3 py-2 ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white rounded-lg transition-colors text-sm`}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.seo.keywords.map((keyword, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs flex items-center gap-1"
                      >
                        {keyword}
                        <button
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              seo: {
                                ...prev.seo,
                                keywords: prev.seo.keywords.filter((k) => k !== keyword),
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

          {/* Preview Panel - Same as new article page */}
          {showPreview && (
            <>
              {/* Mobile: Full Screen Modal */}
              <div className="xl:hidden fixed inset-0 bg-black/95 z-50 overflow-y-auto">
                <div className="min-h-screen p-4">
                  <div className="flex items-center justify-between mb-4 sticky top-0 bg-black/95 py-4 z-10">
                    <h3 className={`text-lg font-semibold ${textPrimary}`}>Article Preview</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewKey(prev => prev + 1)}
                        className={`px-3 py-2 text-sm ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white rounded-lg transition-colors font-semibold`}
                      >
                        Refresh
                      </button>
                      <button
                        onClick={() => setShowPreview(false)}
                        className={`px-3 py-2 text-sm ${textPrimary} rounded-lg transition-colors font-semibold ${isLight ? "bg-gray-200 hover:bg-gray-300" : "bg-gray-700 hover:bg-gray-600"}`}
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Mobile Preview Frame */}
                  <div className="relative mx-auto max-w-md">
                    <div className="w-full rounded-2xl overflow-hidden border-4 border-gray-700 shadow-2xl bg-white" style={{ minHeight: '600px' }}>
                      <iframe
                        key={previewKey}
                        src={`/articles/preview?${new URLSearchParams({
                          title: formData.title || 'Untitled Article',
                          excerpt: formData.excerpt || '',
                          content: formData.content || '',
                          category: formData.category,
                          imageUrl: formData.featuredImage.url || ''
                        }).toString()}`}
                        className="w-full h-screen"
                        title="Article Preview"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop: Fixed Right Sidebar */}
              <div className="hidden xl:block fixed right-8 top-24 bottom-8 w-96 z-40">
                <div className={`${cardBg} ${cardBorder} rounded-xl p-6 h-full flex flex-col`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-semibold ${textPrimary}`}>Mobile Preview</h3>
                    <button
                      onClick={() => setPreviewKey(prev => prev + 1)}
                      className={`px-3 py-2 text-sm ${isLight ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white rounded-lg transition-colors font-semibold`}
                    >
                      Refresh
                    </button>
                  </div>

                  {/* iPhone-style Preview Frame */}
                  <div className="flex-1 flex items-center justify-center overflow-auto">
                    <div className="relative" style={{ width: '375px', height: '667px' }}>
                      {/* iPhone Notch */}
                      <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 ${isLight ? "bg-gray-200" : "bg-gray-900"} rounded-b-3xl z-10`}></div>

                      {/* Preview iframe */}
                      <div className="w-full h-full rounded-3xl overflow-hidden border-8 border-gray-800 shadow-2xl bg-white">
                        <iframe
                          key={previewKey}
                          src={`/articles/preview?${new URLSearchParams({
                            title: formData.title || 'Untitled Article',
                            excerpt: formData.excerpt || '',
                            content: formData.content || '',
                            category: formData.category,
                            imageUrl: formData.featuredImage.url || ''
                          }).toString()}`}
                          className="w-full h-full"
                          title="Article Preview"
                        />
                      </div>

                      {/* Home Indicator */}
                      <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 ${isLight ? "bg-gray-300" : "bg-gray-700"} rounded-full z-10`}></div>
                    </div>
                  </div>

                  <p className={`text-xs ${textMuted} text-center mt-4`}>
                    Preview updates when you click "Refresh"
                  </p>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Claude Modal */}
      {showClaudeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={`${cardBg} ${cardBorder} rounded-xl p-8 max-w-2xl w-full`}>
            <h2 className={`text-2xl font-bold ${textPrimary} mb-4 flex items-center gap-2`}>
              <Sparkles className="w-6 h-6 text-purple-400" />
              Edit Article with Claude
            </h2>
            <p className={`${textSecondary} mb-6`}>
              Tell Claude how you want to modify this article. I can expand sections,
              rewrite parts, change the tone, or add new content.
            </p>
            <textarea
              value={claudePrompt}
              onChange={(e) => setClaudePrompt(e.target.value)}
              placeholder="Example: Expand the section about investment returns and add more data about ROI trends in the Coachella Valley..."
              rows={6}
              className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none mb-6`}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClaudeModal(false)}
                className={`px-6 py-3 ${textPrimary} rounded-lg transition-colors font-semibold ${isLight ? "bg-gray-200 hover:bg-gray-300 border border-gray-300" : "bg-gray-700 hover:bg-gray-600 border border-gray-700"}`}
              >
                Cancel
              </button>
              <button
                onClick={handleClaudeDraft}
                disabled={!claudePrompt.trim()}
                className={`px-6 py-3 ${isLight ? "bg-emerald-600 hover:bg-emerald-700" : "bg-purple-600 hover:bg-purple-700"} text-white rounded-lg transition-colors font-semibold disabled:opacity-50 flex items-center gap-2`}
              >
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                Start Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
