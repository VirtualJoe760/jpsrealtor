"use client";

import { useEffect, useState } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import Link from "next/link";
import {
  FileText,
  ExternalLink,
  RefreshCw,
  Calendar,
  Tag,
} from "lucide-react";

interface Article {
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  slug: string;
  topics?: string[];
  authorId?: string;
  authorName?: string;
}

export default function AdminContentPage() {
  const { textPrimary, textSecondary, border, cardBg, currentTheme } =
    useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchArticles = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/articles/list?excludeLandingPages=false");
      if (!res.ok) throw new Error("Failed to load articles");
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // Group by category for summary
  const categoryCounts = articles.reduce(
    (acc, a) => {
      acc[a.category] = (acc[a.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${textSecondary}`}>
        <div className="animate-pulse">Loading articles...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${textPrimary}`}>Content</h2>
          <p className={`text-sm mt-1 ${textSecondary}`}>
            {articles.length} article{articles.length !== 1 ? "s" : ""} published
          </p>
        </div>
        <button
          onClick={fetchArticles}
          className={`p-2 rounded-lg transition-colors ${
            isLight ? "hover:bg-gray-100" : "hover:bg-white/5"
          }`}
        >
          <RefreshCw size={18} className={textSecondary} />
        </button>
      </div>

      {/* Category Summary */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <span
              key={cat}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                isLight
                  ? "bg-gray-100 text-gray-700"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              <Tag size={12} />
              {cat}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Articles List */}
      {articles.length === 0 ? (
        <div
          className={`${cardBg} border ${border} rounded-xl p-12 text-center`}
        >
          <FileText
            size={40}
            className={`mx-auto mb-3 ${isLight ? "text-gray-300" : "text-gray-600"}`}
          />
          <p className={textSecondary}>No articles found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <div
              key={article.slug}
              className={`${cardBg} border ${border} rounded-xl p-4 flex items-center gap-4`}
            >
              {/* Thumbnail */}
              {article.image && (
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                  <img
                    src={article.image}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-semibold truncate ${textPrimary}`}>
                    {article.title}
                  </span>
                </div>
                <div className={`flex items-center gap-3 text-xs mt-1 ${textSecondary}`}>
                  <span className="flex items-center gap-1">
                    <Tag size={11} />
                    {article.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {article.date}
                  </span>
                  {article.authorName && (
                    <span>by {article.authorName}</span>
                  )}
                </div>
                {article.excerpt && (
                  <p
                    className={`text-xs mt-1 truncate ${textSecondary}`}
                  >
                    {article.excerpt}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/insights/${article.slug}`}
                  target="_blank"
                  className={`p-2 rounded-lg transition-colors ${
                    isLight ? "hover:bg-gray-100" : "hover:bg-white/5"
                  }`}
                  title="View article"
                >
                  <ExternalLink size={16} className={textSecondary} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
