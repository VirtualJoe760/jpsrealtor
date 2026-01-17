// types/index.ts - Type definitions for CMS Page

/**
 * Article Category Enum
 * Represents the different content categories in the CMS
 */
export enum ArticleCategory {
  ARTICLES = 'articles',
  MARKET_INSIGHTS = 'market-insights',
  REAL_ESTATE_TIPS = 'real-estate-tips',
}

/**
 * Article Interface
 * Represents a single article/blog post in the CMS
 */
export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  image?: string;
  published?: boolean;
}

/**
 * Article Stats Interface
 * Statistics for articles across categories
 */
export interface ArticleStats {
  total: number;
  published: number;
  draft: number;
  viewsByCategory: {
    articles: number;
    marketInsights: number;
    realEstateTips: number;
  };
}

/**
 * Filter State Interface
 * Manages filter and search state
 */
export interface FilterState {
  searchTerm: string;
  filterCategory: string;
}

/**
 * Pagination State Interface
 * Manages pagination state
 */
export interface PaginationState {
  page: number;
  totalPages: number;
  totalArticles: number;
  itemsPerPage: number;
}

/**
 * CMS Page Props
 * Props for the main CMS page component
 */
export interface CMSPageProps {
  initialArticles?: Article[];
}
