'use client';

// EmailInbox - Refactored email inbox component
// Original: 1,562 lines, 27 hooks
// Refactored: ~300 lines, 7 custom hooks

import React from 'react';
import ComposePanel from './ComposePanel';
import {
  useEmails,
  useEmailMetadata,
  useEmailExpand,
  useEmailCompose,
  useEmailBulkActions,
  useEmailSearch,
  useEmailFolder,
} from './email-inbox/hooks';
import {
  EmailListItem,
  EmailDetail,
  EmailToolbar,
  EmailFolderNav,
} from './email-inbox/components';
import type { FolderType } from './email-inbox/types';

interface EmailInboxProps {
  isLight: boolean;
}

export default function EmailInbox({ isLight }: EmailInboxProps) {
  // Folder management
  const { activeFolder, sentSubfolder, changeFolder, changeSentSubfolder } =
    useEmailFolder('inbox' as FolderType);

  // Email fetching
  const { emails, loading, error, refreshEmails } = useEmails(
    activeFolder,
    sentSubfolder
  );

  // Email metadata (read, favorite, archive, tags)
  const {
    emailMetadata,
    toggleRead,
    toggleFavorite,
    toggleArchive,
    addTag,
    removeTag,
    markAsRead,
  } = useEmailMetadata(emails);

  // Email expand/collapse
  const {
    expandedEmailId,
    expandedEmailContent,
    loadingContent,
    toggleExpand,
    collapseEmail,
  } = useEmailExpand();

  // Compose panel (reply/forward)
  const {
    composeAction,
    composeEmail,
    startReply,
    startReplyAll,
    startForward,
    closeCompose,
  } = useEmailCompose();

  // Bulk actions
  const {
    selectedEmailIds,
    bulkActionInProgress,
    toggleSelectEmail,
    selectAll,
    deselectAll,
    isSelected,
    executeBulkAction,
  } = useEmailBulkActions();

  // Search, filter, sort
  const {
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
  } = useEmailSearch(emails, emailMetadata);

  // Computed state
  const showBulkActions = selectedEmailIds.size > 0;
  const selectedCount = selectedEmailIds.size;

  // Handlers
  const handleToggleExpand = (email: any) => {
    toggleExpand(email);
    if (!emailMetadata[email.id]?.isRead) {
      markAsRead(email.id);
    }
  };

  const handleBulkArchive = () => {
    executeBulkAction(async () => {
      for (const emailId of selectedEmailIds) {
        await toggleArchive(emailId);
      }
    });
  };

  const handleBulkDelete = () => {
    executeBulkAction(async () => {
      // TODO: Implement bulk delete
      console.log('Bulk delete:', Array.from(selectedEmailIds));
    });
  };

  const handleSelectAll = () => {
    selectAll(filteredEmails);
  };

  const bgClass = isLight ? 'bg-white' : 'bg-gray-900';
  const textClass = isLight ? 'text-gray-900' : 'text-white';

  return (
    <div className="flex h-full">
      {/* Folder Navigation */}
      <EmailFolderNav
        activeFolder={activeFolder}
        sentSubfolder={sentSubfolder}
        onFolderChange={changeFolder}
        onSentSubfolderChange={changeSentSubfolder}
        isLight={isLight}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <EmailToolbar
          searchQuery={searchQuery}
          onSearchChange={updateSearchQuery}
          filterType={filterType}
          onFilterChange={updateFilterType}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={updateSort}
          onRefresh={refreshEmails}
          showBulkActions={showBulkActions}
          selectedCount={selectedCount}
          onSelectAll={handleSelectAll}
          onDeselectAll={deselectAll}
          onBulkArchive={handleBulkArchive}
          onBulkDelete={handleBulkDelete}
          isLight={isLight}
        />

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
          )}

          {error && (
            <div className="p-4 text-center">
              <p className="text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && filteredEmails.length === 0 && (
            <div className="p-12 text-center">
              <p className={textClass}>No emails found</p>
            </div>
          )}

          {!loading &&
            !error &&
            filteredEmails.map((email) => {
              const isExpanded = expandedEmailId === email.id;
              const metadata = emailMetadata[email.id];

              return (
                <div key={email.id}>
                  <EmailListItem
                    email={email}
                    metadata={metadata}
                    isExpanded={isExpanded}
                    isSelected={isSelected(email.id)}
                    onToggleExpand={() => handleToggleExpand(email)}
                    onToggleSelect={() => toggleSelectEmail(email.id)}
                    onToggleFavorite={() => toggleFavorite(email.id)}
                    isLight={isLight}
                  />

                  {isExpanded && (
                    <EmailDetail
                      email={email}
                      metadata={metadata}
                      content={expandedEmailContent}
                      loading={loadingContent}
                      onReply={() => startReply(email)}
                      onReplyAll={() => startReplyAll(email)}
                      onForward={() => startForward(email)}
                      onArchive={() => toggleArchive(email.id)}
                      onDelete={() => {
                        // TODO: Implement delete
                        console.log('Delete email:', email.id);
                      }}
                      onTag={() => {
                        // TODO: Implement tag modal
                        console.log('Tag email:', email.id);
                      }}
                      isLight={isLight}
                    />
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Compose Panel */}
      {composeAction && composeEmail && (
        <ComposePanel
          recipientEmail={composeEmail.from}
          isLight={isLight}
          mode={composeAction === 'forward' ? 'forward' : 'reply'}
          originalEmail={composeEmail}
          onClose={closeCompose}
        />
      )}
    </div>
  );
}
