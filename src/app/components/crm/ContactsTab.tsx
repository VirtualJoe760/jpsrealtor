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
    loadingMore,
    fetchContacts,
    deleteContact,
    loadMore,
    pagination,
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
    resetAll,
  } = useContactFilters(contacts);

  // Additional filtering for search, tag, and status
  const filteredContacts = React.useMemo(() => {
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

    return result;
  }, [baseFilteredContacts, searchQuery, selectedTag, selectedStatus]);

  const {
    selectedContactIds,
    selectedIds,
    toggleContactSelection,
    toggleSelectAll,
    clearSelection,
    selectedCount,
    hasSelection,
    areAllSelected,
  } = useContactSelection();

  // Restore saved state on mount
  const { restoreState } = useRestoreContactState();

  React.useEffect(() => {
    const savedState = restoreState();
    if (savedState) {
      if (savedState.searchQuery) setSearchQuery(savedState.searchQuery);
      if (savedState.viewMode) setViewMode(savedState.viewMode as ViewMode);
      if (savedState.selectedTag !== undefined) setSelectedTag(savedState.selectedTag);
      if (savedState.selectedStatus !== undefined) setSelectedStatus(savedState.selectedStatus);
      if (savedState.sortBy) setSortBy(savedState.sortBy as SortBy);
      if (savedState.filterBy) setFilterBy(savedState.filterBy as FilterBy);
      if (savedState.contactAgeFilter) setContactAgeFilter(savedState.contactAgeFilter as any);
    }
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
    } else {
      setSelectedTag(tagName);
      setSelectedStatus(null); // Clear status filter
    }
  };

  const handleStatusClick = (status: string) => {
    if (selectedStatus === status) {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(status);
      setSelectedTag(null); // Clear tag filter
    }
  };

  const handleViewAll = () => {
    setSearchQuery('');
    setSelectedTag(null);
    setSelectedStatus(null);
    resetAll();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats Cards Section */}
      <div className="flex-shrink-0 px-4 md:px-0 mb-6">
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

      {/* Toolbar */}
      <div className="flex-shrink-0 px-4 md:px-0">
        <ContactToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterBy={filterBy}
          onFilterChange={setFilterBy}
          selectedCount={selectedCount}
          onBulkDelete={handleBulkDelete}
          onImport={() => setShowSyncModal(true)}
          onAdd={() => {
            /* TODO: Add contact modal */
          }}
          isLight={isLight}
        />
      </div>

      {/* Contact List - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 md:px-0">
        <ContactList
          contacts={filteredContacts}
          viewMode={viewMode}
          isLight={isLight}
          loading={loading}
          selectedContactIds={selectedContactIds}
          onSelectContact={toggleContactSelection}
          onContactClick={handleContactClick}
          loadingCount={8}
        />

        {/* Load More */}
        {pagination.hasMore && !loading && (
          <div className="flex justify-center py-8">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isLight
                  ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300'
              }`}
            >
              {loadingMore ? 'Loading...' : `Load More (${pagination.total - filteredContacts.length} remaining)`}
            </button>
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
