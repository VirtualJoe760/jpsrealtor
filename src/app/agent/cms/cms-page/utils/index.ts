// utils/index.ts - Utility functions for CMS Page

import type { Article, ArticleStats, PaginationState } from '../types';
import { ITEMS_PER_PAGE } from '../constants';

/**
 * Filter Articles by Search Term
 * Searches article title and excerpt
 */
export function filterArticlesBySearch(
  articles: Article[],
  searchTerm: string
): Article[] {
  if (!searchTerm.trim()) return articles;

  const lowerSearch = searchTerm.toLowerCase();
  return articles.filter(
    (article) =>
      article.title.toLowerCase().includes(lowerSearch) ||
      article.excerpt.toLowerCase().includes(lowerSearch)
  );
}

/**
 * Filter Articles by Category
 */
export function filterArticlesByCategory(
  articles: Article[],
  category: string
): Article[] {
  if (category === 'all') return articles;
  return articles.filter((article) => article.category === category);
}

/**
 * Apply All Filters
 * Combines search and category filtering
 */
export function applyFilters(
  articles: Article[],
  searchTerm: string,
  category: string
): Article[] {
  let filtered = filterArticlesBySearch(articles, searchTerm);
  filtered = filterArticlesByCategory(filtered, category);
  return filtered;
}

/**
 * Paginate Articles
 * Returns articles for the current page
 */
export function paginateArticles(
  articles: Article[],
  page: number,
  itemsPerPage: number = ITEMS_PER_PAGE
): Article[] {
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return articles.slice(startIndex, endIndex);
}

/**
 * Calculate Total Pages
 */
export function calculateTotalPages(
  totalArticles: number,
  itemsPerPage: number = ITEMS_PER_PAGE
): number {
  return Math.ceil(totalArticles / itemsPerPage);
}

/**
 * Calculate Pagination State
 * Returns complete pagination state from filtered articles
 */
export function calculatePaginationState(
  filteredArticles: Article[],
  currentPage: number
): PaginationState {
  const totalArticles = filteredArticles.length;
  const totalPages = calculateTotalPages(totalArticles);

  return {
    page: Math.min(currentPage, Math.max(1, totalPages)),
    totalPages,
    totalArticles,
    itemsPerPage: ITEMS_PER_PAGE,
  };
}

/**
 * Calculate Article Statistics
 * Computes stats from article list
 */
export function calculateArticleStats(articles: Article[]): ArticleStats {
  const total = articles.length;
  const published = articles.filter((a) => a.published !== false).length;
  const draft = total - published;

  const viewsByCategory = {
    articles: articles.filter((a) => a.category === 'articles').length,
    marketInsights: articles.filter((a) => a.category === 'market-insights').length,
    realEstateTips: articles.filter((a) => a.category === 'real-estate-tips').length,
  };

  return {
    total,
    published,
    draft,
    viewsByCategory,
  };
}

/**
 * Format Category Label
 * Converts category slug to display label
 */
export function formatCategoryLabel(category: string): string {
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get Article Path
 * Returns the full path to view an article
 */
export function getArticlePath(article: Article): string {
  return `/insights/${article.category}/${article.slug}`;
}

/**
 * Get Edit Article Path
 * Returns the path to edit an article
 */
export function getEditArticlePath(slug: string): string {
  return `/agent/cms/edit/${slug}`;
}

/**
 * Sort Articles by Date
 * Sorts articles by date (newest first)
 */
export function sortArticlesByDate(articles: Article[]): Article[] {
  return [...articles].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA; // Newest first
  });
}
