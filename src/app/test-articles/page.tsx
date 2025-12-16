"use client";

import { useEffect, useState } from "react";
import ArticleCard, { ArticleCardProps } from "@/app/components/chat/ArticleCard";

export default function TestArticlesPage() {
  const [articles, setArticles] = useState<ArticleCardProps[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const response = await fetch('/api/articles/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'real estate', limit: 10 })
        });
        const data = await response.json();

        console.log('[Test Page] Raw API response:', data);

        // Transform featuredImage.url to image
        const transformed = data.results?.map((article: any) => ({
          _id: article._id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          category: article.category,
          image: article.featuredImage?.url || article.image,
          seo: article.seo,
          publishedAt: article.publishedAt,
          relevanceScore: article.relevanceScore
        })) || [];

        console.log('[Test Page] Transformed articles:', transformed);
        setArticles(transformed);
      } catch (error) {
        console.error('[Test Page] Error fetching articles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchArticles();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading articles...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          Article Card Test Page
        </h1>

        <p className="mb-4 text-gray-700 dark:text-gray-300">
          Found {articles.length} articles
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article._id} article={article} />
          ))}
        </div>

        {articles.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
            No articles found
          </p>
        )}
      </div>
    </div>
  );
}
