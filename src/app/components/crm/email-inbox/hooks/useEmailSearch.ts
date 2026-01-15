// useEmailSearch hook - Manages email search and filtering

import { useState, useCallback, useMemo } from 'react';
import type { Email, EmailMetadata } from '../types';
import { EmailFilterType, EmailSortBy, SortOrder } from '../types';
import { applyFiltersAndSort } from '../utils';

export function useEmailSearch(
  emails: Email[],
  metadata: Record<string, EmailMetadata>
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<EmailFilterType>(EmailFilterType.ALL);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<EmailSortBy>(EmailSortBy.DATE);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);

  const filteredEmails = useMemo(() => {
    return applyFiltersAndSort(
      emails,
      searchQuery,
      filterType,
      filterTags,
      sortBy,
      sortOrder,
      metadata
    );
  }, [emails, searchQuery, filterType, filterTags, sortBy, sortOrder, metadata]);

  const updateSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const updateFilterType = useCallback((filter: EmailFilterType) => {
    setFilterType(filter);
  }, []);

  const toggleFilterTag = useCallback((tag: string) => {
    setFilterTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const clearFilterTags = useCallback(() => {
    setFilterTags([]);
  }, []);

  const updateSort = useCallback((newSortBy: EmailSortBy, newSortOrder: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterType(EmailFilterType.ALL);
    setFilterTags([]);
  }, []);

  return {
    searchQuery,
    filterType,
    filterTags,
    sortBy,
    sortOrder,
    filteredEmails,
    updateSearchQuery,
    updateFilterType,
    toggleFilterTag,
    clearFilterTags,
    updateSort,
    clearAllFilters,
  };
}
