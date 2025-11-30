// src/app/admin/cms/new/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import AdminNav from "@/app/components/AdminNav";

type TabType = "generate" | "edit" | "preview";

export default function NewArticlePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
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
  const [activeTab, setActiveTab] = useState<TabType>("generate");

  // Groq generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationTopic, setGenerationTopic] = useState("");
  const [generationKeywords, setGenerationKeywords] = useState("");
  const [generatedPreview, setGeneratedPreview] = useState("");

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
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Handle Groq generation
  const handleGenerate = async () => {
    if (!generationTopic.trim()) {
      alert("Please enter a topic for article generation");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: generationTopic,
          category: formData.category,
          keywords: generationKeywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          tone: "professional yet approachable",
          length: "comprehensive",
        }),
      });

      if (!response.ok) throw new Error("Failed to generate article");

      const data = await response.json();

      if (data.success && data.article) {
        const article = data.article;

        // Update form with generated content
        setFormData((prev) => ({
          ...prev,
          title: article.title || prev.title,
          excerpt: article.excerpt || prev.excerpt,
          content: article.content || prev.content,
          tags: article.tags || prev.tags,
          seo: {
            title: article.seo?.title || article.title || prev.seo.title,
            description:
              article.seo?.description || article.excerpt || prev.seo.description,
            keywords: article.seo?.keywords || article.tags || prev.seo.keywords,
          },
        }));

        // Set preview
        setGeneratedPreview(article.content || "");

        // Switch to edit tab on mobile after generation
        if (window.innerWidth < 1024) {
          setActiveTab("edit");
        }
      }
    } catch (error) {
      console.error("Generation error:", error);
      alert("Failed to generate article with Groq");
    } finally {
      setIsGenerating(false);
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

  // Handle save article
  const handleSave = async (publishNow: boolean = false) => {
    setIsSaving(true);

    try {
      const articleData = {
        ...formData,
        status: publishNow ? "published" : formData.status,
        publishedAt: publishNow ? new Date().toISOString() : undefined,
      };

      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleData),
      });

      if (!response.ok) throw new Error("Failed to save article");

      const data = await response.json();
      alert(publishNow ? "Article published!" : "Article saved as draft!");
      router.push("/admin/cms");
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save article");
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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div
            className={`w-16 h-16 border-4 ${
              isLight ? "border-blue-500" : "border-emerald-500"
            } border-t-transparent rounded-full animate-spin mx-auto mb-4`}
          ></div>
          <p className={`${textSecondary}`}>Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" data-page="admin-new-article">
      <div className="max-w-7xl mx-auto">
        <AdminNav />

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h1
                className={`text-2xl md:text-4xl font-bold ${textPrimary} mb-2 flex items-center gap-2 md:gap-3`}
              >
                <FileText
                  className={`w-8 h-8 md:w-10 md:h-10 ${
                    isLight ? "text-blue-500" : "text-emerald-400"
                  }`}
                />
                New Article
              </h1>
              <p className={`${textSecondary}`}>
                Generate and edit articles with Groq AI
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <button
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${textPrimary} rounded-lg transition-colors font-semibold ${
                  isLight
                    ? "bg-gray-200 hover:bg-gray-300 border border-gray-300"
                    : "bg-gray-700 hover:bg-gray-600 border border-gray-700"
                }`}
              >
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                Save Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base ${
                  isLight
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                } text-white rounded-lg transition-colors font-semibold`}
              >
                <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                Publish Now
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden mb-6">
          <div className={`${cardBg} ${cardBorder} rounded-xl p-1 flex gap-1`}>
            <button
              onClick={() => setActiveTab("generate")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "generate"
                  ? isLight
                    ? "bg-blue-600 text-white"
                    : "bg-emerald-600 text-white"
                  : `${textSecondary} hover:${textPrimary}`
              }`}
            >
              <Wand2 className="w-4 h-4" />
              Generate
            </button>
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "edit"
                  ? isLight
                    ? "bg-blue-600 text-white"
                    : "bg-emerald-600 text-white"
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
                    : "bg-emerald-600 text-white"
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
          {/* Generator Panel - Left 40% */}
          <div
            className={`lg:col-span-2 ${
              activeTab !== "generate" ? "hidden lg:block" : ""
            }`}
          >
            <div className={`${cardBg} ${cardBorder} rounded-xl p-6 space-y-6`}>
              <div>
                <h2
                  className={`text-xl font-bold ${textPrimary} mb-2 flex items-center gap-2`}
                >
                  <Sparkles
                    className={`w-5 h-5 ${
                      isLight ? "text-blue-500" : "text-emerald-400"
                    }`}
                  />
                  AI Article Generator
                </h2>
                <p className={`text-sm ${textSecondary}`}>
                  Powered by Groq AI for lightning-fast article generation
                </p>
              </div>

              {/* Topic Input */}
              <div>
                <label
                  className={`block text-sm font-semibold ${textSecondary} mb-2`}
                >
                  Topic
                </label>
                <textarea
                  value={generationTopic}
                  onChange={(e) => setGenerationTopic(e.target.value)}
                  placeholder="Example: Benefits of investing in Palm Desert golf communities, focusing on ROI and lifestyle amenities..."
                  rows={4}
                  className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                    isLight ? "blue" : "emerald"
                  }-500 resize-none`}
                />
              </div>

              {/* Category Selection */}
              <div>
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
                  className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} focus:outline-none focus:border-${
                    isLight ? "blue" : "emerald"
                  }-500`}
                >
                  <option value="articles">Articles</option>
                  <option value="market-insights">Market Insights</option>
                  <option value="real-estate-tips">Real Estate Tips</option>
                </select>
              </div>

              {/* Keywords Input */}
              <div>
                <label
                  className={`block text-sm font-semibold ${textSecondary} mb-2`}
                >
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={generationKeywords}
                  onChange={(e) => setGenerationKeywords(e.target.value)}
                  placeholder="golf, palm desert, investment, luxury homes"
                  className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                    isLight ? "blue" : "emerald"
                  }-500`}
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !generationTopic.trim()}
                className={`w-full flex items-center justify-center gap-2 px-6 py-4 text-base ${
                  isLight
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-purple-600 hover:bg-purple-700"
                } text-white rounded-lg transition-colors font-semibold disabled:opacity-50`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating Article...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Article
                  </>
                )}
              </button>

              {/* Generation Preview */}
              {generatedPreview && (
                <div className="mt-6">
                  <h3
                    className={`text-sm font-semibold ${textSecondary} mb-3`}
                  >
                    Generated Content Preview
                  </h3>
                  <div
                    className={`${bgSecondary} ${border} rounded-lg p-4 max-h-64 overflow-y-auto`}
                  >
                    <pre
                      className={`text-xs ${textPrimary} whitespace-pre-wrap font-mono`}
                    >
                      {generatedPreview.substring(0, 500)}...
                    </pre>
                  </div>
                  <p className={`text-xs ${textMuted} mt-2`}>
                    Full content is loaded in the editor →
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Editor Panel - Right 60% */}
          <div
            className={`lg:col-span-3 ${
              activeTab !== "edit" ? "hidden lg:block" : ""
            }`}
          >
            <div className="space-y-6">
              {/* Title */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <label
                  className={`block text-sm font-semibold ${textSecondary} mb-2`}
                >
                  Title
                </label>
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

              {/* Excerpt */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <label
                  className={`block text-sm font-semibold ${textSecondary} mb-2`}
                >
                  Excerpt
                </label>
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

              {/* Content Editor */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <label
                  className={`block text-sm font-semibold ${textSecondary} mb-2`}
                >
                  Content (MDX)
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Write your article content in MDX format..."
                  rows={20}
                  className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                    isLight ? "blue" : "emerald"
                  }-500 font-mono text-sm resize-none`}
                />
              </div>

              {/* Tags */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <label
                  className={`block text-sm font-semibold ${textSecondary} mb-2`}
                >
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
                      onChange={(e) => handleImageUpload(e, "featured")}
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

              {/* SEO */}
              <div className={`${cardBg} ${cardBorder} rounded-xl p-6`}>
                <h3 className={`text-sm font-semibold ${textSecondary} mb-4`}>
                  SEO
                </h3>
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
                      className={`w-full px-3 py-2 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                        isLight ? "blue" : "emerald"
                      }-500 text-sm`}
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
                      className={`w-full px-3 py-2 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-${
                        isLight ? "blue" : "emerald"
                      }-500 text-sm resize-none`}
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
                        : "bg-emerald-600 hover:bg-emerald-700"
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
