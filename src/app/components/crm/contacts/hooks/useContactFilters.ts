// useContactFilters hook - Handles contact filtering and sorting

import { useState, useMemo } from 'react';
import { Contact, FilterBy, SortBy, ContactAge } from '../types';
import { filterContact, sortContacts } from '../utils';

export function useContactFilters(contacts: Contact[]) {
  const [filterBy, setFilterBy] = useState<FilterBy>(FilterBy.ALL);
  const [sortBy, setSortBy] = useState<SortBy>(SortBy.A_TO_Z);
  const [contactAgeFilter, setContactAgeFilter] = useState<ContactAge | 'all'>('all');

  /**
   * Memoized filtered contacts
   */
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact =>
      filterContact(contact, filterBy, contactAgeFilter)
    );
  }, [contacts, filterBy, contactAgeFilter]);

  /**
   * Memoized sorted contacts (after filtering)
   */
  const sortedContacts = useMemo(() => {
    return sortContacts(filteredContacts, sortBy);
  }, [filteredContacts, sortBy]);

  /**
   * Get count of filtered contacts
   */
  const filteredCount = useMemo(() => filteredContacts.length, [filteredContacts]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = useMemo(() => {
    return filterBy !== FilterBy.ALL || contactAgeFilter !== 'all';
  }, [filterBy, contactAgeFilter]);

  /**
   * Reset all filters to default
   */
  const resetFilters = () => {
    setFilterBy(FilterBy.ALL);
    setContactAgeFilter('all');
  };

  /**
   * Reset sort to default
   */
  const resetSort = () => {
    setSortBy(SortBy.A_TO_Z);
  };

  /**
   * Reset everything
   */
  const resetAll = () => {
    resetFilters();
    resetSort();
  };

  return {
    // Filtered/sorted data
    filteredContacts,
    sortedContacts,
    filteredCount,

    // Filter state
    filterBy,
    setFilterBy,
    contactAgeFilter,
    setContactAgeFilter,

    // Sort state
    sortBy,
    setSortBy,

    // Helpers
    hasActiveFilters,
    resetFilters,
    resetSort,
    resetAll
  };
}
