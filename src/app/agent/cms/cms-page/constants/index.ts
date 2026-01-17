// constants/index.ts - Constants for CMS Page

import { ArticleCategory } from '../types';

/**
 * Category Labels
 * Human-readable labels for article categories
 */
export const CATEGORY_LABELS: Record<string, string> = {
  [ArticleCategory.ARTICLES]: 'Articles',
  [ArticleCategory.MARKET_INSIGHTS]: 'Market Insights',
  [ArticleCategory.REAL_ESTATE_TIPS]: 'Real Estate Tips',
  all: 'All Categories',
};

/**
 * Pagination Constants
 */
export const ITEMS_PER_PAGE = 50;

/**
 * Category Options for Filter
 */
export const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: ArticleCategory.ARTICLES, label: 'Articles' },
  { value: ArticleCategory.MARKET_INSIGHTS, label: 'Market Insights' },
  { value: ArticleCategory.REAL_ESTATE_TIPS, label: 'Real Estate Tips' },
];

/**
 * Default Filter State
 */
export const DEFAULT_FILTER_STATE = {
  searchTerm: '',
  filterCategory: 'all',
};

/**
 * Default Pagination State
 */
export const DEFAULT_PAGINATION_STATE = {
  page: 1,
  totalPages: 1,
  totalArticles: 0,
  itemsPerPage: ITEMS_PER_PAGE,
};

/**
 * Default Stats
 */
export const DEFAULT_STATS = {
  total: 0,
  published: 0,
  draft: 0,
  viewsByCategory: {
    articles: 0,
    marketInsights: 0,
    realEstateTips: 0,
  },
};
