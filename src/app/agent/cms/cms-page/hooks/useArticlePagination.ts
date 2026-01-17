// hooks/useArticlePagination.ts - Hook for managing pagination

import { useState, useMemo, useEffect } from 'react';
import type { Article, PaginationState } from '../types';
import { DEFAULT_PAGINATION_STATE } from '../constants';
import { calculatePaginationState, paginateArticles } from '../utils';

interface UseArticlePaginationResult {
  page: number;
  totalPages: number;
  totalArticles: number;
  paginatedArticles: Article[];
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
}

/**
 * useArticlePagination Hook
 * Manages pagination state and article slicing
 */
export function useArticlePagination(
  filteredArticles: Article[]
): UseArticlePaginationResult {
  const [currentPage, setCurrentPage] = useState(1);

  // Recalculate pagination when filtered articles change
  const paginationState = useMemo<PaginationState>(() => {
    return calculatePaginationState(filteredArticles, currentPage);
  }, [filteredArticles, currentPage]);

  // Get paginated articles for current page
  const paginatedArticles = useMemo(() => {
    return paginateArticles(
      filteredArticles,
      paginationState.page,
      paginationState.itemsPerPage
    );
  }, [filteredArticles, paginationState.page, paginationState.itemsPerPage]);

  // Reset to page 1 when filters change (article count changes)
  useEffect(() => {
    if (currentPage > paginationState.totalPages && paginationState.totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredArticles.length, paginationState.totalPages, currentPage]);

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, paginationState.totalPages));
  };

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  return {
    page: paginationState.page,
    totalPages: paginationState.totalPages,
    totalArticles: paginationState.totalArticles,
    paginatedArticles,
    setPage: setCurrentPage,
    nextPage,
    prevPage,
    resetPagination,
  };
}
