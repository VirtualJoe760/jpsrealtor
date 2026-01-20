'use client';

// Refactored ContactsTab - Clean, modular, maintainable
// Uses custom hooks and extracted components

import React, { useState } from 'react';
import { Download, Plus } from 'lucide-react';
import {
  useContacts,
  useContactFilters,
  useContactSelection,
  useContactStats,
  useRestoreContactState,
  useContactPersistence,
} from './contacts/hooks';
import {
  StatsCardGrid,
  ContactToolbar,
  ContactList,
} from './contacts/components';
import { Contact, ViewMode, FilterBy, SortBy } from './contacts/types';
import ContactSyncModal from './ContactSyncModal';
import ContactViewPanel from './ContactViewPanel';

interface ContactsTabProps {
  isLight: boolean;
}

export default function ContactsTab({ isLight }: ContactsTabProps) {
  // Modal state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [panelContact, setPanelContact] = useState<Contact | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.CARD);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Custom hooks for state management
  const {
    contacts,
    loading,
    fetchContacts,
    deleteContact,
  } = useContacts();

  const { tags, stats, refetch: refetchStats } = useContactStats();

  const {
    sortBy,
    setSortBy,
    filterBy,
    setFilterBy,
    contactAgeFilter,
    setContactAgeFilter,
    filteredContacts: baseFilteredContacts,
    sortedContacts: baseSortedContacts,
    resetAll,
  } = useContactFilters(contacts);

  // Additional filtering for search, tag, and status, then apply sorting
  const { filteredContacts, sortedContacts } = React.useMemo(() => {
    let result = baseFilteredContacts;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(contact =>
        `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.phone?.includes(query) ||
        contact.organization?.toLowerCase().includes(query)
      );
    }

    // Filter by selected tag
    if (selectedTag) {
      result = result.filter(contact =>
        contact.tags?.includes(selectedTag)
      );
    }

    // Filter by selected status
    if (selectedStatus) {
      result = result.filter(contact =>
        contact.status === selectedStatus
      );
    }

    // Apply sorting to filtered results
    const sorted = baseSortedContacts.filter(contact => result.includes(contact));

    return { filteredContacts: result, sortedContacts: sorted };
  }, [baseFilteredContacts, baseSortedContacts, searchQuery, selectedTag, selectedStatus]);

  const {
    selectedContactIds,
    selectedIds,
    toggleContactSelection,
    toggleSelectAll,
    clearSelection,
    selectedCount,
    hasSelection,
    areAllSelected: checkAreAllSelected,
  } = useContactSelection();

  // Check if all sorted contacts are selected
  const areAllSelected = React.useMemo(() =>
    checkAreAllSelected(sortedContacts.map(c => c._id)),
    [checkAreAllSelected, sortedContacts]
  );

  // Toggle select all handler for toolbar
  const handleToggleSelectAll = React.useCallback(() => {
    toggleSelectAll(sortedContacts.map(c => c._id));
  }, [toggleSelectAll, sortedContacts]);

  // Restore saved state on mount
  const { restoreState } = useRestoreContactState();

  React.useEffect(() => {
    const savedState = restoreState();
    if (savedState) {
      // DON'T restore selectedTag or selectedStatus - they cause filter issues
      // User should start with clean state (all contacts visible)
      if (savedState.searchQuery) setSearchQuery(savedState.searchQuery);
      if (savedState.viewMode) setViewMode(savedState.viewMode as ViewMode);
      // if (savedState.selectedTag !== undefined) setSelectedTag(savedState.selectedTag);
      // if (savedState.selectedStatus !== undefined) setSelectedStatus(savedState.selectedStatus);
      if (savedState.sortBy) setSortBy(savedState.sortBy as SortBy);
      if (savedState.filterBy) setFilterBy(savedState.filterBy as FilterBy);
      if (savedState.contactAgeFilter) setContactAgeFilter(savedState.contactAgeFilter as any);
    }

    // IMPORTANT: Always clear tag/status filters on mount to ensure all contacts load
    setSelectedTag(null);
    setSelectedStatus(null);
  }, [restoreState]);

  // Persist state
  useContactPersistence({
    searchQuery,
    viewMode,
    selectedTag,
    selectedStatus,
    sortBy,
    filterBy,
    contactAgeFilter,
  });

  // Handlers
  const handleContactClick = (contact: Contact) => {
    setPanelContact(contact);
    setIsPanelOpen(true);
  };

  const handlePanelClose = () => {
    setIsPanelOpen(false);
    setPanelContact(null);
  };

  const handleImportSuccess = async (importedContactIds?: string[]) => {
    // Refresh contacts and stats
    await fetchContacts({});
    refetchStats();
    setShowSyncModal(false);
  };

  const handleBulkDelete = async () => {
    if (!hasSelection) return;

    const confirmed = confirm(
      `Are you sure you want to delete ${selectedCount} contact${
        selectedCount !== 1 ? 's' : ''
      }?`
    );

    if (!confirmed) return;

    try {
      // Delete all selected contacts
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteContact(id))
      );

      // Refresh and clear selection
      clearSelection();
      await fetchContacts({});
      refetchStats();
    } catch (error) {
      console.error('[ContactsTab] Bulk delete error:', error);
    }
  };

  const handleTagClick = (tagName: string) => {
    if (selectedTag === tagName) {
      setSelectedTag(null);
      setViewMode(ViewMode.CARD); // Go back to card view when deselecting
    } else {
      setSelectedTag(tagName);
      setSelectedStatus(null); // Clear status filter
      setViewMode(ViewMode.LIST); // Switch to list view
    }
  };

  const handleStatusClick = (status: string) => {
    if (selectedStatus === status) {
      setSelectedStatus(null);
      setViewMode(ViewMode.CARD); // Go back to card view when deselecting
    } else {
      setSelectedStatus(status);
      setSelectedTag(null); // Clear tag filter
      setViewMode(ViewMode.LIST); // Switch to list view
    }
  };

  const handleViewAll = () => {
    setSearchQuery('');
    setSelectedTag(null);
    setSelectedStatus(null);
    resetAll();
    setViewMode(ViewMode.LIST); // Switch to list view to show all contacts
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // Clear filters when switching to CARD view
    if (mode === ViewMode.CARD) {
      setSelectedTag(null);
      setSelectedStatus(null);
      setSearchQuery('');
    }
  };

  return (
    <div className="flex flex-col">
      {/* Toolbar - Always visible */}
      <div className="px-4 md:px-0">
        <ContactToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
          contactAgeFilter={contactAgeFilter}
          onContactAgeFilterChange={setContactAgeFilter}
          selectedCount={selectedCount}
          onBulkDelete={handleBulkDelete}
          onImport={() => setShowSyncModal(true)}
          onAdd={() => {
            /* TODO: Add contact modal */
          }}
          isLight={isLight}
          // Select all functionality
          totalContacts={sortedContacts.length}
          areAllSelected={areAllSelected}
          onSelectAll={handleToggleSelectAll}
        />
      </div>

      {/* Stats Cards Section - ONLY show in CARD view */}
      {viewMode === ViewMode.CARD && (
        <div className="px-4 md:px-0 mb-6">
          <StatsCardGrid
            stats={stats}
            tags={tags}
            selectedTag={selectedTag}
            onSelectTag={handleTagClick}
            onSelectStatus={handleStatusClick}
            onViewAll={handleViewAll}
            isLight={isLight}
          />
        </div>
      )}

      {/* Contact List - ONLY show in LIST view */}
      {viewMode === ViewMode.LIST && (
        <div className="px-4 md:px-0 pb-24 md:pb-0">
          <ContactList
            contacts={sortedContacts}
            viewMode={viewMode}
            isLight={isLight}
            loading={loading}
            selectedContactIds={selectedContactIds}
            onSelectContact={toggleContactSelection}
            onContactClick={handleContactClick}
            loadingCount={8}
          />

          {/* No "Load More" button - all contacts loaded upfront */}
          {/* Front-end pagination happens in ContactList component */}
        </div>
      )}

      {/* Modals */}
      {showSyncModal && (
        <ContactSyncModal
          isLight={isLight}
          onClose={() => setShowSyncModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {isPanelOpen && panelContact && (
        <ContactViewPanel
          contact={panelContact}
          isOpen={isPanelOpen}
          onClose={handlePanelClose}
          onEdit={() => {/* TODO: Implement edit */}}
          onDelete={async () => {
            await deleteContact(panelContact._id);
            handlePanelClose();
            fetchContacts({});
            refetchStats();
          }}
          onMessage={() => {/* TODO: Implement message */}}
          isLight={isLight}
        />
      )}
    </div>
  );
}
