// hooks/useArticles.ts - Hook for fetching and managing articles

import { useState, useEffect, useCallback } from 'react';
import type { Article, ArticleStats } from '../types';
import { DEFAULT_STATS } from '../constants';
import { calculateArticleStats, sortArticlesByDate } from '../utils';

interface UseArticlesResult {
  articles: Article[];
  isLoading: boolean;
  stats: ArticleStats;
  refetch: () => Promise<void>;
}

/**
 * useArticles Hook
 * Fetches and manages article data from API
 */
export function useArticles(): UseArticlesResult {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ArticleStats>(DEFAULT_STATS);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/articles');
      if (!response.ok) throw new Error('Failed to fetch articles');

      const data = await response.json();
      const sortedArticles = sortArticlesByDate(data.articles || []);

      setArticles(sortedArticles);
      setStats(calculateArticleStats(sortedArticles));
    } catch (error) {
      console.error('Error fetching articles:', error);
      setArticles([]);
      setStats(DEFAULT_STATS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return {
    articles,
    isLoading,
    stats,
    refetch: fetchArticles,
  };
}
