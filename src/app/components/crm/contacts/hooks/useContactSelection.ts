// useContactSelection hook - Handles multi-select functionality for contacts

import { useState, useCallback, useMemo } from 'react';

export function useContactSelection() {
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());

  /**
   * Toggle selection of a single contact
   */
  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  }, []);

  /**
   * Toggle select all contacts from a given list
   */
  const toggleSelectAll = useCallback((contactIds: string[]) => {
    setSelectedContactIds(prev => {
      const allSelected = contactIds.every(id => prev.has(id));
      if (allSelected) {
        // Deselect all
        return new Set();
      } else {
        // Select all
        return new Set(contactIds);
      }
    });
  }, []);

  /**
   * Select a single contact (add to selection)
   */
  const selectContact = useCallback((contactId: string) => {
    setSelectedContactIds(prev => new Set(prev).add(contactId));
  }, []);

  /**
   * Deselect a single contact (remove from selection)
   */
  const deselectContact = useCallback((contactId: string) => {
    setSelectedContactIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(contactId);
      return newSet;
    });
  }, []);

  /**
   * Select multiple contacts
   */
  const selectContacts = useCallback((contactIds: string[]) => {
    setSelectedContactIds(prev => new Set([...prev, ...contactIds]));
  }, []);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedContactIds(new Set());
  }, []);

  /**
   * Select only specific contacts (replaces current selection)
   */
  const setSelection = useCallback((contactIds: string[]) => {
    setSelectedContactIds(new Set(contactIds));
  }, []);

  /**
   * Check if a contact is selected
   */
  const isSelected = useCallback((contactId: string): boolean => {
    return selectedContactIds.has(contactId);
  }, [selectedContactIds]);

  /**
   * Check if all contacts from a list are selected
   */
  const areAllSelected = useCallback((contactIds: string[]): boolean => {
    return contactIds.length > 0 && contactIds.every(id => selectedContactIds.has(id));
  }, [selectedContactIds]);

  /**
   * Check if some (but not all) contacts from a list are selected
   */
  const areSomeSelected = useCallback((contactIds: string[]): boolean => {
    const selectedCount = contactIds.filter(id => selectedContactIds.has(id)).length;
    return selectedCount > 0 && selectedCount < contactIds.length;
  }, [selectedContactIds]);

  /**
   * Get count of selected contacts
   */
  const selectedCount = useMemo(() => selectedContactIds.size, [selectedContactIds]);

  /**
   * Check if any contacts are selected
   */
  const hasSelection = useMemo(() => selectedContactIds.size > 0, [selectedContactIds]);

  /**
   * Get array of selected contact IDs
   */
  const selectedIds = useMemo(() => Array.from(selectedContactIds), [selectedContactIds]);

  return {
    // State
    selectedContactIds,
    selectedIds,
    selectedCount,
    hasSelection,

    // Selection actions
    toggleContactSelection,
    toggleSelectAll,
    selectContact,
    deselectContact,
    selectContacts,
    clearSelection,
    setSelection,

    // Queries
    isSelected,
    areAllSelected,
    areSomeSelected
  };
}
