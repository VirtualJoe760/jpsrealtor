// src/app/components/chat/ArticleCard.tsx
// Article card component for displaying blog articles in chat responses

"use client";

import Link from "next/link";
import Image from "next/image";
import { Calendar, Tag, ArrowRight, ExternalLink } from "lucide-react";
import { useTheme, useThemeClasses } from "@/app/contexts/ThemeContext";

export interface ArticleCardProps {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  featuredImage: {
    url: string;
    alt: string;
  };
  seo: {
    description: string;
    keywords: string[];
  };
  publishedAt: string;
  relevanceScore?: number;
}

export default function ArticleCard({ article }: { article: ArticleCardProps }) {
  const { currentTheme } = useTheme();
  const { cardBg, cardBorder, textPrimary, textSecondary, textMuted } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  // Format category
  const categoryNames: Record<string, string> = {
    "articles": "Articles",
    "market-insights": "Market Insights",
    "real-estate-tips": "Real Estate Tips",
  };

  const categoryName = categoryNames[article.category] || article.category;

  // Format date
  const publishDate = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <Link
      href={`/articles/${article.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`group block ${cardBg} ${cardBorder} rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 h-full`}
    >
      {/* Featured Image */}
      <div className="relative w-full h-48 overflow-hidden bg-gray-200">
        <Image
          src={article.featuredImage.url}
          alt={article.featuredImage.alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full ${
            isLight
              ? "bg-blue-100 text-blue-700"
              : "bg-emerald-500/20 text-emerald-400"
          }`}>
            <Tag className="w-3 h-3" />
            {categoryName}
          </span>
        </div>

        {/* Relevance Score (if provided) */}
        {article.relevanceScore !== undefined && article.relevanceScore > 0.7 && (
          <div className="absolute top-3 right-3">
            <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${
              isLight
                ? "bg-emerald-500 text-white"
                : "bg-purple-500 text-white"
            }`}>
              Highly Relevant
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Title */}
        <h3 className={`${textPrimary} text-lg font-bold mb-2 line-clamp-2 group-hover:${isLight ? "text-blue-600" : "text-emerald-400"} transition-colors`}>
          {article.title}
        </h3>

        {/* Excerpt */}
        <p className={`${textSecondary} text-sm mb-4 line-clamp-3`}>
          {article.excerpt || article.seo.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${textMuted} text-xs`}>
            <Calendar className="w-3.5 h-3.5" />
            <span>{publishDate}</span>
          </div>

          <div className={`flex items-center gap-1 text-xs font-semibold ${isLight ? "text-blue-600" : "text-emerald-400"} group-hover:gap-2 transition-all`}>
            <span>Read Article</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Keywords (first 3) */}
        {article.seo.keywords && article.seo.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {article.seo.keywords.slice(0, 3).map((keyword, index) => (
              <span
                key={index}
                className={`text-xs px-2 py-0.5 rounded ${
                  isLight
                    ? "bg-gray-100 text-gray-600"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {keyword}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * ArticleResults component - Displays multiple articles in a grid
 */
export function ArticleResults({
  results,
  query
}: {
  results: ArticleCardProps[];
  query: string;
}) {
  const { textPrimary, textMuted } = useThemeClasses();

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-8">
        <p className={textMuted}>No articles found for "{query}"</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`${textPrimary} text-lg font-semibold`}>
          Related Articles ({results.length})
        </h3>
        {query && (
          <span className={`${textMuted} text-sm`}>
            Search: "{query}"
          </span>
        )}
      </div>

      {/* Article Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((article) => (
          <ArticleCard key={article._id} article={article} />
        ))}
      </div>
    </div>
  );
}
