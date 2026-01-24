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
import AddContactModal from './AddContactModal';

interface ContactsTabProps {
  isLight: boolean;
  showToolbar?: boolean;
}

export default function ContactsTab({ isLight, showToolbar = true }: ContactsTabProps) {
  // Modal state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar - Fixed at top, collapsible - Wrapped with padding */}
      {showToolbar && (
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex-shrink-0 mb-4">
            <ContactToolbar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              sortBy={sortBy}
              onSortChange={setSortBy}
              filterBy={filterBy}
              onFilterChange={setFilterBy}
              selectedCount={selectedCount}
              onBulkDelete={handleBulkDelete}
              onImport={() => setShowSyncModal(true)}
              onAdd={() => setShowAddContactModal(true)}
              isLight={isLight}
              // Select all functionality
              totalContacts={sortedContacts.length}
              areAllSelected={areAllSelected}
              onSelectAll={handleToggleSelectAll}
              // Tags
              tags={tags}
              selectedTag={selectedTag}
              onTagChange={handleTagClick}
            />
          </div>
        </div>
      )}

      {/* Scrollable content area - Stats or List */}
      <div className="flex-1 overflow-hidden">
        {/* Stats Cards Section - ONLY show in CARD view */}
        {viewMode === ViewMode.CARD && (
          <div className="h-full overflow-y-auto scrollbar-hide no-scrollbar pb-20 md:pb-6">
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

        {/* Contact List - ONLY show in LIST view - Wrapped with padding */}
        {viewMode === ViewMode.LIST && (
          <div className="px-4 sm:px-6 lg:px-8 h-full">
            <ContactList
              contacts={sortedContacts}
              viewMode={viewMode}
              isLight={isLight}
              loading={loading}
              selectedContactIds={selectedContactIds}
              onSelectContact={toggleContactSelection}
              onContactClick={handleContactClick}
              loadingCount={8}
              // Pass select all props
              areAllSelected={areAllSelected}
              onSelectAll={handleToggleSelectAll}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showSyncModal && (
        <ContactSyncModal
          isLight={isLight}
          onClose={() => setShowSyncModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}

      {showAddContactModal && (
        <AddContactModal
          isLight={isLight}
          isOpen={showAddContactModal}
          onClose={() => setShowAddContactModal(false)}
          onSuccess={async () => {
            await fetchContacts({});
            refetchStats();
            setShowAddContactModal(false);
          }}
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
