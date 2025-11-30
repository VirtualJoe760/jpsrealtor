"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, Eye, Save } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";

interface ArticleGeneratorProps {
  onArticleGenerated?: (article: any) => void;
  onClose?: () => void;
}

export default function ArticleGenerator({ onArticleGenerated, onClose }: ArticleGeneratorProps) {
  const { currentTheme } = useTheme();
  const { bgSecondary, textPrimary, textSecondary, border, cardBg } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState<"articles" | "market-insights" | "real-estate-tips">("articles");
  const [keywords, setKeywords] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedArticle, setGeneratedArticle] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/articles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          category,
          keywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
          tone: "professional yet approachable",
          length: "comprehensive"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate article");
      }

      if (data.success) {
        setGeneratedArticle(data.article);
        setShowPreview(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (generatedArticle && onArticleGenerated) {
      onArticleGenerated(generatedArticle);
    }
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setTopic("");
    setKeywords("");
    setGeneratedArticle(null);
    setShowPreview(false);
    setError("");
    if (onClose) onClose();
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 ${isLight ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-600 hover:bg-purple-700"} text-white rounded-lg transition-colors font-semibold`}
      >
        <Sparkles className="w-5 h-5" />
        <span className="hidden sm:inline">Generate Article</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className={`${cardBg} ${border} rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b ${border}">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                <h2 className={`text-2xl font-bold ${textPrimary}`}>
                  {showPreview ? "Preview Article" : "Generate Article with AI"}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className={`p-2 rounded-lg transition-colors ${textSecondary} hover:bg-gray-700`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!showPreview ? (
                /* Generation Form */
                <div className="space-y-6">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <h3 className="text-blue-400 font-semibold mb-2">✨ Powered by Groq AI</h3>
                    <p className={`text-sm ${textSecondary}`}>
                      Using GPT OSS 120B (120 billion parameters) for high-quality, SEO-optimized articles.
                      Generation takes 5-10 seconds.
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                      <p className="text-red-400">{error}</p>
                    </div>
                  )}

                  <div>
                    <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>
                      Topic *
                    </label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="E.g., Complete guide to investing in Palm Desert golf communities"
                      rows={3}
                      className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-purple-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} focus:outline-none focus:border-purple-500`}
                    >
                      <option value="articles">Articles</option>
                      <option value="market-insights">Market Insights</option>
                      <option value="real-estate-tips">Real Estate Tips</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-semibold ${textSecondary} mb-2`}>
                      Keywords (optional)
                    </label>
                    <input
                      type="text"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="palm desert golf, investment, ROI (comma separated)"
                      className={`w-full px-4 py-3 ${bgSecondary} ${border} rounded-lg ${textPrimary} placeholder-gray-400 focus:outline-none focus:border-purple-500`}
                    />
                  </div>

                  <div className={`bg-gray-800/50 rounded-lg p-4 space-y-2 text-sm ${textSecondary}`}>
                    <p className="font-semibold">Auto-included features:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Professional yet conversational tone</li>
                      <li>Local Coachella Valley keywords</li>
                      <li>SEO optimization (meta tags, descriptions)</li>
                      <li>Contact information (phone + email)</li>
                      <li>Actionable tips and checklists</li>
                      <li>Complete MDX formatting</li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* Preview */
                <div className="space-y-4">
                  <div className={`bg-gray-800/50 rounded-lg p-4`}>
                    <h3 className={`font-bold ${textPrimary} mb-2`}>{generatedArticle.title}</h3>
                    <p className={`text-sm ${textSecondary} mb-3`}>{generatedArticle.excerpt}</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedArticle.tags?.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={`${bgSecondary} ${border} rounded-lg p-6 max-h-96 overflow-y-auto`}>
                    <pre className={`whitespace-pre-wrap ${textPrimary} text-sm font-mono`}>
                      {generatedArticle.mdx}
                    </pre>
                  </div>

                  <div className={`bg-blue-500/10 border border-blue-500/30 rounded-lg p-4`}>
                    <h4 className="text-blue-400 font-semibold mb-2">SEO Metadata</h4>
                    <div className="space-y-2 text-sm">
                      <p className={textSecondary}>
                        <strong>Title:</strong> {generatedArticle.seo?.title}
                      </p>
                      <p className={textSecondary}>
                        <strong>Description:</strong> {generatedArticle.seo?.description}
                      </p>
                      <p className={textSecondary}>
                        <strong>Keywords:</strong> {generatedArticle.seo?.keywords?.join(", ")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={`flex justify-between items-center gap-3 p-6 border-t ${border}`}>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-semibold"
              >
                Cancel
              </button>

              <div className="flex gap-3">
                {showPreview ? (
                  <>
                    <button
                      onClick={() => setShowPreview(false)}
                      className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
                    >
                      <Eye className="w-5 h-5" />
                      Back to Form
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Save Article
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !topic.trim()}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Article
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
