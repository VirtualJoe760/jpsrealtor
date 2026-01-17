// hooks/useArticleFilters.ts - Hook for managing article filters

import { useState, useMemo, useCallback } from 'react';
import type { Article, FilterState } from '../types';
import { DEFAULT_FILTER_STATE } from '../constants';
import { applyFilters } from '../utils';

interface UseArticleFiltersResult {
  searchTerm: string;
  filterCategory: string;
  filteredArticles: Article[];
  setSearchTerm: (term: string) => void;
  setFilterCategory: (category: string) => void;
  resetFilters: () => void;
}

/**
 * useArticleFilters Hook
 * Manages search term and category filtering
 */
export function useArticleFilters(
  articles: Article[]
): UseArticleFiltersResult {
  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const filteredArticles = useMemo(() => {
    return applyFilters(articles, filterState.searchTerm, filterState.filterCategory);
  }, [articles, filterState.searchTerm, filterState.filterCategory]);

  const setSearchTerm = useCallback((term: string) => {
    setFilterState((prev) => ({ ...prev, searchTerm: term }));
  }, []);

  const setFilterCategory = useCallback((category: string) => {
    setFilterState((prev) => ({ ...prev, filterCategory: category }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilterState(DEFAULT_FILTER_STATE);
  }, []);

  return {
    searchTerm: filterState.searchTerm,
    filterCategory: filterState.filterCategory,
    filteredArticles,
    setSearchTerm,
    setFilterCategory,
    resetFilters,
  };
}
