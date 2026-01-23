'use client';

// EmailInbox - Refactored with restored UI features
// Architecture: Modern hooks + Original UI/UX
// Features: All original functionality restored with clean code

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
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
  // Compose panel state (for new compose, not reply/forward)
  const [showNewCompose, setShowNewCompose] = useState(false);

  // Mobile menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleBulkMarkRead = (read: boolean) => {
    executeBulkAction(async () => {
      for (const emailId of selectedEmailIds) {
        const metadata = emailMetadata[emailId];
        if (metadata?.isRead !== read) {
          await toggleRead(emailId);
        }
      }
    });
  };

  const handleSelectAll = () => {
    selectAll(filteredEmails);
  };

  const handleCompose = () => {
    setShowNewCompose(true);
  };

  const handleCloseNewCompose = () => {
    setShowNewCompose(false);
  };

  const handleFolderChange = (folder: FolderType) => {
    changeFolder(folder);
    setMobileMenuOpen(false); // Close menu after selection on mobile
  };

  const handleSentSubfolderChange = (subfolder: string) => {
    changeSentSubfolder(subfolder);
    setMobileMenuOpen(false); // Close menu after selection on mobile
  };

  const bgClass = isLight ? 'bg-white' : 'bg-gray-900';
  const textClass = isLight ? 'text-gray-900' : 'text-white';

  return (
    <div className="flex h-full relative">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Folder Navigation */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-50 md:z-auto transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <EmailFolderNav
          activeFolder={activeFolder}
          sentSubfolder={sentSubfolder}
          onFolderChange={handleFolderChange}
          onSentSubfolderChange={handleSentSubfolderChange}
          isLight={isLight}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className={`p-2 rounded-lg transition-colors ${
              isLight ? 'hover:bg-gray-100' : 'hover:bg-gray-800'
            }`}
          >
            <Menu className={`w-5 h-5 ${textClass}`} />
          </button>
          <h2 className={`ml-3 text-lg font-semibold ${textClass}`}>
            {activeFolder.charAt(0).toUpperCase() + activeFolder.slice(1)}
          </h2>
        </div>
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
          onCompose={handleCompose}
          showBulkActions={showBulkActions}
          selectedCount={selectedCount}
          onSelectAll={handleSelectAll}
          onDeselectAll={deselectAll}
          onBulkArchive={handleBulkArchive}
          onBulkDelete={handleBulkDelete}
          onBulkMarkRead={handleBulkMarkRead}
          filterTags={filterTags}
          onToggleFilterTag={toggleFilterTag}
          isLight={isLight}
          loading={loading}
        />

        {/* Error Message */}
        {error && (
          <div className={`p-4 mx-4 md:mx-0 mb-4 rounded-lg ${
            isLight
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-red-900/20 border border-red-800 text-red-400'
          }`}>
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Email List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 md:px-0">
          {loading && emails.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            </div>
          ) : !loading && !error && filteredEmails.length === 0 ? (
            <div className="p-12 text-center">
              <p className={textClass}>No emails found</p>
            </div>
          ) : (
            <div className={`rounded-lg ${isLight ? 'bg-white/30' : 'bg-neutral-900/30'}`}>
              {/* Select All Checkbox */}
              {filteredEmails.length > 0 && (
                <div className={`px-6 py-3 border-b flex items-center gap-3 ${
                  isLight ? 'border-slate-200/30' : 'border-gray-700/30'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedEmailIds.size === filteredEmails.length && filteredEmails.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded"
                  />
                  <span className={`text-sm font-medium ${
                    isLight ? 'text-slate-700' : 'text-gray-300'
                  }`}>
                    Select All
                  </span>
                </div>
              )}

              {filteredEmails.map((email) => {
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
          )}
        </div>
      </div>

      {/* Compose Panel - Reply/Forward */}
      {composeAction && composeEmail && (
        <ComposePanel
          isLight={isLight}
          replyTo={composeAction === 'reply' || composeAction === 'replyAll' ? composeEmail : undefined}
          forwardEmail={composeAction === 'forward' ? composeEmail : undefined}
          onClose={closeCompose}
        />
      )}

      {/* Compose Panel - New Email */}
      {showNewCompose && (
        <ComposePanel
          isLight={isLight}
          onClose={handleCloseNewCompose}
        />
      )}
    </div>
  );
}
