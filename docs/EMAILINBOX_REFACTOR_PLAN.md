# EmailInbox.tsx - Detailed Refactor Plan

**Component:** `src/app/components/crm/EmailInbox.tsx`
**Current Size:** 1,562 lines
**Current Hooks:** 27 React hooks (HIGHEST in codebase)
**Target Size:** ~300 lines
**Priority:** 🔴 CRITICAL
**Estimated Time:** 3-4 weeks

---

## Current State Analysis

### Problems Identified

1. **27 React Hooks** - Most complex component in codebase
2. **16+ State Variables** - Excessive state management
3. **Dual Data Sources** - Email API + Metadata API with synchronization issues
4. **Complex Filtering/Sorting** - Inline logic mixed with UI
5. **Bulk Operations** - Selection and bulk actions embedded
6. **Email Expansion** - Complex content loading and display logic
7. **Folder/Subfolder System** - Complex navigation state
8. **No Separation of Concerns** - Everything in one file

### State Variables Breakdown

```typescript
// Email Data (4 variables)
const [emails, setEmails] = useState<Email[]>([]);
const [emailMetadata, setEmailMetadata] = useState<Record<string, EmailMetadata>>({});
const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
const [expandedEmailContent, setExpandedEmailContent] = useState<Record<string, EmailContent>>({});

// Loading States (3 variables)
const [loading, setLoading] = useState(true);
const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);

// Folder/Navigation (3 variables)
const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent'>('inbox');
const [sentSubfolder, setSentSubfolder] = useState('all');
const [limit, setLimit] = useState(50);

// Selection (2 variables)
const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
const [showBulkActions, setShowBulkActions] = useState(false);

// UI/Filtering (3 variables)
const [searchQuery, setSearchQuery] = useState('');
const [sortBy, setSortBy] = useState<'date' | 'sender'>('date');
const [showFilters, setShowFilters] = useState(false);
```

**Total: 15+ state variables across 6 distinct feature areas**

---

## Refactoring Strategy

### Phase 1: Types & Enums (Day 1)

Create comprehensive type system.

**Files to Create:**
```
src/app/components/crm/email/inbox/
├── types/
│   ├── index.ts          # Main exports
│   ├── enums.ts         # Folder, sort enums
│   └── interfaces.ts    # Email, metadata interfaces
```

**Types to Define:**

```typescript
// enums.ts
export enum EmailFolder {
  INBOX = 'inbox',
  SENT = 'sent'
}

export enum EmailSortBy {
  DATE_DESC = 'date-desc',
  DATE_ASC = 'date-asc',
  SENDER_AZ = 'sender-az',
  SENDER_ZA = 'sender-za'
}

// interfaces.ts
export interface Email {
  id: string;
  to: string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  created_at: string;
}

export interface EmailContent extends Email {
  error?: string;
  errorDetails?: string;
  statusCode?: number;
}

export interface EmailMetadata {
  resendEmailId: string;
  folder: string;
  senderEmail?: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SentSubfolder {
  id: string;
  label: string;
  domain?: string;
  count: number;
}

export interface EmailFilters {
  folder: EmailFolder;
  subfolder?: string;
  searchQuery: string;
  sortBy: EmailSortBy;
  onlyUnread?: boolean;
  onlyStarred?: boolean;
}
```

---

### Phase 2: Services (Day 1-2)

Extract all API calls into service layer.

**Files to Create:**
```
src/app/components/crm/email/inbox/
└── services/
    ├── index.ts
    ├── emailService.ts          # Email fetching
    ├── metadataService.ts       # Metadata CRUD
    └── emailContentService.ts   # Content loading
```

**emailService.ts:**

```typescript
export async function fetchEmails(params: {
  folder: EmailFolder;
  limit: number;
  domain?: string;
}): Promise<{ data: Email[]; error?: string }> {
  try {
    const queryParams = new URLSearchParams({
      limit: params.limit.toString(),
      folder: params.folder,
    });

    if (params.domain) {
      queryParams.append('domain', params.domain);
    }

    const response = await fetch(`/api/resend/inbox?${queryParams.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      return { data: [], error: data.error || 'Failed to fetch emails' };
    }

    return { data: data.data || [] };
  } catch (err: any) {
    return { data: [], error: err.message || 'An error occurred' };
  }
}
```

**metadataService.ts:**

```typescript
export async function fetchEmailMetadata(
  emailIds: string[]
): Promise<Record<string, EmailMetadata>> {
  try {
    const response = await fetch('/api/email-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resendEmailIds: emailIds }),
    });

    const data = await response.json();
    if (response.ok && data.metadata) {
      return data.metadata;
    }
    return {};
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    return {};
  }
}

export async function updateEmailMetadata(
  emailId: string,
  updates: Partial<EmailMetadata>,
  senderEmail?: string
): Promise<EmailMetadata | null> {
  try {
    const response = await fetch('/api/email-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resendEmailId: emailId,
        senderEmail,
        ...updates,
      }),
    });

    const data = await response.json();
    if (response.ok && data.metadata) {
      return data.metadata;
    }
    return null;
  } catch (error) {
    console.error('Failed to update metadata:', error);
    return null;
  }
}
```

**emailContentService.ts:**

```typescript
export async function fetchEmailContent(
  emailId: string,
  folder: EmailFolder
): Promise<EmailContent> {
  try {
    const response = await fetch(`/api/resend/email/${emailId}?folder=${folder}`);
    const data = await response.json();

    if (response.ok) {
      return data;
    }

    // Return error structure
    return {
      id: emailId,
      error: data.error || 'Failed to fetch email',
      errorDetails: data.details,
      statusCode: data.statusCode,
      to: [],
      from: '',
      subject: '',
      created_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      id: emailId,
      error: 'Network error occurred',
      errorDetails: error instanceof Error ? error.message : String(error),
      to: [],
      from: '',
      subject: '',
      created_at: new Date().toISOString(),
    };
  }
}
```

---

### Phase 3: Utility Functions (Day 2)

Extract pure functions for formatting and filtering.

**Files to Create:**
```
src/app/components/crm/email/inbox/
└── utils/
    ├── index.ts
    ├── emailFormatters.ts    # Date, preview formatting
    ├── emailFilters.ts       # Filter/sort logic
    └── emailHelpers.ts       # Utility functions
```

**emailFormatters.ts:**

```typescript
export function formatEmailDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  } else if (days < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}

export function formatFullEmailDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getEmailPreview(email: Email, maxLength: number = 100): string {
  if (email.text) {
    return email.text
      .substring(0, maxLength)
      .replace(/\n/g, ' ');
  }
  if (email.html) {
    const stripped = email.html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ');
    return stripped.substring(0, maxLength);
  }
  return 'No preview available';
}

export function extractSenderName(from: string): string {
  // Extract name from "Name <email>" format
  const match = from.match(/^(.+?)\s*<.+>$/);
  return match ? match[1].trim() : from;
}

export function extractSenderEmail(from: string): string {
  // Extract email from "Name <email>" format
  const match = from.match(/<(.+?)>/);
  return match ? match[1] : from;
}
```

**emailFilters.ts:**

```typescript
export function filterEmails(
  emails: Email[],
  filters: EmailFilters,
  metadata: Record<string, EmailMetadata>
): Email[] {
  return emails.filter(email => {
    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchText = [
        email.subject,
        email.from,
        email.to.join(' '),
        getEmailPreview(email),
      ].join(' ').toLowerCase();

      if (!searchText.includes(query)) {
        return false;
      }
    }

    // Unread filter
    if (filters.onlyUnread) {
      const meta = metadata[email.id];
      if (meta?.isRead) return false;
    }

    // Starred filter
    if (filters.onlyStarred) {
      const meta = metadata[email.id];
      if (!meta?.isStarred) return false;
    }

    return true;
  });
}

export function sortEmails(emails: Email[], sortBy: EmailSortBy): Email[] {
  const sorted = [...emails];

  switch (sortBy) {
    case EmailSortBy.DATE_DESC:
      return sorted.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

    case EmailSortBy.DATE_ASC:
      return sorted.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    case EmailSortBy.SENDER_AZ:
      return sorted.sort((a, b) =>
        extractSenderName(a.from).localeCompare(extractSenderName(b.from))
      );

    case EmailSortBy.SENDER_ZA:
      return sorted.sort((a, b) =>
        extractSenderName(b.from).localeCompare(extractSenderName(a.from))
      );

    default:
      return sorted;
  }
}
```

---

### Phase 4: Custom Hooks (Day 3-7)

Extract state management into focused hooks.

**Files to Create:**
```
src/app/components/crm/email/inbox/
└── hooks/
    ├── index.ts
    ├── useEmails.ts              # Email fetching & pagination
    ├── useEmailMetadata.ts       # Metadata management
    ├── useEmailExpansion.ts      # Expand/collapse logic
    ├── useEmailSelection.ts      # Bulk selection
    ├── useEmailFilters.ts        # Search/sort/filter
    └── useEmailFolders.ts        # Folder navigation
```

#### Hook 1: useEmails.ts

```typescript
export function useEmails(folder: EmailFolder, subfolder?: string) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  const fetchEmailList = useCallback(async () => {
    setLoading(true);
    setError(null);

    const domain = subfolder && subfolder !== 'all'
      ? getSentSubfolderDomain(subfolder)
      : undefined;

    const result = await fetchEmails({ folder, limit, domain });

    if (result.error) {
      setError(result.error);
    } else {
      setEmails(result.data);
    }

    setLoading(false);
  }, [folder, subfolder, limit]);

  useEffect(() => {
    fetchEmailList();
  }, [fetchEmailList]);

  const refresh = useCallback(() => {
    fetchEmailList();
  }, [fetchEmailList]);

  const loadMore = useCallback(() => {
    setLimit(prev => prev + 50);
  }, []);

  return {
    emails,
    loading,
    error,
    refresh,
    loadMore,
    hasMore: emails.length >= limit,
  };
}
```

#### Hook 2: useEmailMetadata.ts

```typescript
export function useEmailMetadata(emailIds: string[]) {
  const [metadata, setMetadata] = useState<Record<string, EmailMetadata>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (emailIds.length === 0) return;

    const fetchMetadata = async () => {
      setLoading(true);
      const data = await fetchEmailMetadata(emailIds);
      setMetadata(data);
      setLoading(false);
    };

    fetchMetadata();
  }, [emailIds.join(',')]);

  const updateMetadata = useCallback(async (
    emailId: string,
    updates: Partial<EmailMetadata>,
    senderEmail?: string
  ) => {
    const updated = await updateEmailMetadata(emailId, updates, senderEmail);
    if (updated) {
      setMetadata(prev => ({
        ...prev,
        [emailId]: updated,
      }));
    }
  }, []);

  const markAsRead = useCallback((emailId: string, senderEmail?: string) => {
    return updateMetadata(emailId, { isRead: true }, senderEmail);
  }, [updateMetadata]);

  const toggleStar = useCallback((emailId: string, senderEmail?: string) => {
    const current = metadata[emailId];
    return updateMetadata(
      emailId,
      { isStarred: !current?.isStarred },
      senderEmail
    );
  }, [metadata, updateMetadata]);

  return {
    metadata,
    loading,
    updateMetadata,
    markAsRead,
    toggleStar,
  };
}
```

#### Hook 3: useEmailExpansion.ts

```typescript
export function useEmailExpansion(folder: EmailFolder) {
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<Record<string, EmailContent>>({});
  const [loadingEmailId, setLoadingEmailId] = useState<string | null>(null);

  const loadEmailContent = useCallback(async (emailId: string) => {
    // Check if already loaded
    if (expandedContent[emailId]) {
      return;
    }

    setLoadingEmailId(emailId);
    const content = await fetchEmailContent(emailId, folder);
    setExpandedContent(prev => ({
      ...prev,
      [emailId]: content,
    }));
    setLoadingEmailId(null);
  }, [folder, expandedContent]);

  const toggleEmail = useCallback(async (emailId: string) => {
    const isCurrentlyExpanded = expandedEmailId === emailId;

    if (isCurrentlyExpanded) {
      setExpandedEmailId(null);
    } else {
      setExpandedEmailId(emailId);
      await loadEmailContent(emailId);
    }
  }, [expandedEmailId, loadEmailContent]);

  const collapseAll = useCallback(() => {
    setExpandedEmailId(null);
  }, []);

  const isExpanded = useCallback((emailId: string) => {
    return expandedEmailId === emailId;
  }, [expandedEmailId]);

  const getContent = useCallback((emailId: string) => {
    return expandedContent[emailId];
  }, [expandedContent]);

  return {
    expandedEmailId,
    loadingEmailId,
    toggleEmail,
    collapseAll,
    isExpanded,
    getContent,
  };
}
```

#### Hook 4: useEmailSelection.ts

```typescript
export function useEmailSelection() {
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((emailId: string) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(emailId)) {
        next.delete(emailId);
      } else {
        next.add(emailId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((emailIds: string[]) => {
    setSelectedEmails(new Set(emailIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEmails(new Set());
  }, []);

  const isSelected = useCallback((emailId: string) => {
    return selectedEmails.has(emailId);
  }, [selectedEmails]);

  const selectedCount = selectedEmails.size;
  const hasSelection = selectedCount > 0;

  return {
    selectedEmails,
    selectedCount,
    hasSelection,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
  };
}
```

#### Hook 5: useEmailFilters.ts

```typescript
export function useEmailFilters(
  emails: Email[],
  metadata: Record<string, EmailMetadata>
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<EmailSortBy>(EmailSortBy.DATE_DESC);
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [onlyStarred, setOnlyStarred] = useState(false);

  const filteredEmails = useMemo(() => {
    const filters: EmailFilters = {
      folder: EmailFolder.INBOX, // Provided by parent
      searchQuery,
      sortBy,
      onlyUnread,
      onlyStarred,
    };
    return filterEmails(emails, filters, metadata);
  }, [emails, metadata, searchQuery, onlyUnread, onlyStarred]);

  const sortedEmails = useMemo(() => {
    return sortEmails(filteredEmails, sortBy);
  }, [filteredEmails, sortBy]);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setOnlyUnread(false);
    setOnlyStarred(false);
  }, []);

  return {
    searchQuery,
    sortBy,
    onlyUnread,
    onlyStarred,
    setSearchQuery,
    setSortBy,
    setOnlyUnread,
    setOnlyStarred,
    resetFilters,
    filteredEmails: sortedEmails,
    filterCount: emails.length - sortedEmails.length,
  };
}
```

#### Hook 6: useEmailFolders.ts

```typescript
export function useEmailFolders() {
  const [activeFolder, setActiveFolder] = useState<EmailFolder>(EmailFolder.INBOX);
  const [sentSubfolder, setSentSubfolder] = useState('all');

  const sentSubfolders: SentSubfolder[] = [
    { id: 'all', label: 'All Sent', count: 0 },
    { id: 'obsidian', label: 'Obsidian Group', domain: 'obsidiangroup.com', count: 0 },
    { id: 'personal', label: 'Personal', domain: 'josephsardella@gmail.com', count: 0 },
  ];

  const isInbox = activeFolder === EmailFolder.INBOX;
  const isSent = activeFolder === EmailFolder.SENT;

  return {
    activeFolder,
    setActiveFolder,
    sentSubfolder,
    setSentSubfolder,
    sentSubfolders,
    isInbox,
    isSent,
  };
}
```

---

### Phase 5: UI Components (Day 8-12)

Break down into focused presentational components.

**Files to Create:**
```
src/app/components/crm/email/inbox/
└── components/
    ├── index.ts
    ├── EmailList.tsx              # Email list container
    ├── EmailItem.tsx              # Single email card
    ├── EmailDetailView.tsx        # Expanded email content
    ├── EmailFolderTabs.tsx        # Inbox/Sent tabs
    ├── SentSubfolderNav.tsx       # Sent subfolders
    ├── EmailToolbar.tsx           # Search, filters, sort
    ├── BulkActionsBar.tsx         # Bulk operations
    ├── EmptyState.tsx             # No emails state
    └── LoadingState.tsx           # Loading skeleton
```

#### Component: EmailToolbar.tsx

```typescript
interface EmailToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: EmailSortBy;
  onSortChange: (sort: EmailSortBy) => void;
  onlyUnread: boolean;
  onToggleUnread: () => void;
  onlyStarred: boolean;
  onToggleStarred: () => void;
  onRefresh: () => void;
  isLight: boolean;
}

export function EmailToolbar({ ... }: EmailToolbarProps) {
  return (
    <div className="space-y-3 mb-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" />
        <input
          type="text"
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg ..."
        />
      </div>

      {/* Filters and Sort */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {/* Unread Filter */}
          <button
            onClick={onToggleUnread}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              onlyUnread ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            Unread Only
          </button>

          {/* Starred Filter */}
          <button
            onClick={onToggleStarred}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              onlyStarred ? 'bg-yellow-600 text-white' : 'bg-gray-200'
            }`}
          >
            Starred
          </button>
        </div>

        {/* Sort Dropdown */}
        <select value={sortBy} onChange={(e) => onSortChange(e.target.value as EmailSortBy)}>
          <option value={EmailSortBy.DATE_DESC}>Newest First</option>
          <option value={EmailSortBy.DATE_ASC}>Oldest First</option>
          <option value={EmailSortBy.SENDER_AZ}>Sender A-Z</option>
          <option value={EmailSortBy.SENDER_ZA}>Sender Z-A</option>
        </select>

        {/* Refresh Button */}
        <button onClick={onRefresh}>
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

#### Component: EmailItem.tsx

```typescript
interface EmailItemProps {
  email: Email;
  metadata?: EmailMetadata;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onStar: () => void;
  isLight: boolean;
}

export function EmailItem({
  email,
  metadata,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onStar,
  isLight
}: EmailItemProps) {
  const isRead = metadata?.isRead ?? false;
  const isStarred = metadata?.isStarred ?? false;

  return (
    <div
      className={`border-b ${
        isLight ? 'border-gray-200' : 'border-gray-700'
      } ${!isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
    >
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={onToggle}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="mt-1"
        />

        {/* Star Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStar();
          }}
          className="mt-1"
        >
          <Star
            className={`w-4 h-4 ${
              isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
            }`}
          />
        </button>

        {/* Email Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`font-medium truncate ${
              !isRead ? 'font-bold' : ''
            }`}>
              {extractSenderName(email.from)}
            </span>
            <span className="text-sm text-gray-500 flex-shrink-0">
              {formatEmailDate(email.created_at)}
            </span>
          </div>

          <p className={`text-sm truncate mb-1 ${
            !isRead ? 'font-semibold' : 'text-gray-600'
          }`}>
            {email.subject || '(No subject)'}
          </p>

          <p className="text-sm text-gray-500 truncate">
            {getEmailPreview(email)}
          </p>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t">
          <EmailDetailView emailId={email.id} />
        </div>
      )}
    </div>
  );
}
```

---

### Phase 6: Integration (Day 13-14)

Refactor main EmailInbox component to use new architecture.

**New EmailInbox.tsx structure (~300 lines):**

```typescript
'use client';

import React from 'react';
import {
  useEmails,
  useEmailMetadata,
  useEmailExpansion,
  useEmailSelection,
  useEmailFilters,
  useEmailFolders,
} from './hooks';
import {
  EmailFolderTabs,
  SentSubfolderNav,
  EmailToolbar,
  BulkActionsBar,
  EmailList,
  EmptyState,
  LoadingState,
} from './components';

interface EmailInboxProps {
  isLight: boolean;
}

export default function EmailInbox({ isLight }: EmailInboxProps) {
  // Folder navigation
  const folderHook = useEmailFolders();

  // Email data
  const emailsHook = useEmails(
    folderHook.activeFolder,
    folderHook.isSent ? folderHook.sentSubfolder : undefined
  );

  // Email metadata
  const metadataHook = useEmailMetadata(
    emailsHook.emails.map(e => e.id)
  );

  // Filtering and sorting
  const filtersHook = useEmailFilters(
    emailsHook.emails,
    metadataHook.metadata
  );

  // Expansion logic
  const expansionHook = useEmailExpansion(folderHook.activeFolder);

  // Selection logic
  const selectionHook = useEmailSelection();

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectionHook.selectedCount} emails?`)) return;
    // Implement bulk delete
    selectionHook.clearSelection();
  };

  const handleBulkArchive = async () => {
    // Implement bulk archive
    selectionHook.clearSelection();
  };

  if (emailsHook.loading) {
    return <LoadingState isLight={isLight} />;
  }

  if (emailsHook.error) {
    return (
      <div className="text-red-600">
        Error: {emailsHook.error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Folder Tabs */}
      <EmailFolderTabs
        activeFolder={folderHook.activeFolder}
        onFolderChange={folderHook.setActiveFolder}
        isLight={isLight}
      />

      {/* Sent Subfolders */}
      {folderHook.isSent && (
        <SentSubfolderNav
          subfolders={folderHook.sentSubfolders}
          activeSubfolder={folderHook.sentSubfolder}
          onSubfolderChange={folderHook.setSentSubfolder}
          isLight={isLight}
        />
      )}

      <div className="flex-1 overflow-hidden flex flex-col p-4">
        {/* Toolbar */}
        <EmailToolbar
          searchQuery={filtersHook.searchQuery}
          onSearchChange={filtersHook.setSearchQuery}
          sortBy={filtersHook.sortBy}
          onSortChange={filtersHook.setSortBy}
          onlyUnread={filtersHook.onlyUnread}
          onToggleUnread={() => filtersHook.setOnlyUnread(!filtersHook.onlyUnread)}
          onlyStarred={filtersHook.onlyStarred}
          onToggleStarred={() => filtersHook.setOnlyStarred(!filtersHook.onlyStarred)}
          onRefresh={emailsHook.refresh}
          isLight={isLight}
        />

        {/* Bulk Actions */}
        {selectionHook.hasSelection && (
          <BulkActionsBar
            selectedCount={selectionHook.selectedCount}
            onDelete={handleBulkDelete}
            onArchive={handleBulkArchive}
            onClear={selectionHook.clearSelection}
            isLight={isLight}
          />
        )}

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {filtersHook.filteredEmails.length === 0 ? (
            <EmptyState
              message={
                filtersHook.searchQuery
                  ? 'No emails match your search'
                  : 'No emails in this folder'
              }
              isLight={isLight}
            />
          ) : (
            <EmailList
              emails={filtersHook.filteredEmails}
              metadata={metadataHook.metadata}
              expandedEmailId={expansionHook.expandedEmailId}
              selectedEmails={selectionHook.selectedEmails}
              onToggleEmail={expansionHook.toggleEmail}
              onSelectEmail={selectionHook.toggleSelection}
              onStarEmail={metadataHook.toggleStar}
              isLight={isLight}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Result:** ~300 lines instead of 1,562 lines!

---

## Success Metrics

### Before Refactor
- ❌ 1,562 lines
- ❌ 27 React hooks (highest in codebase)
- ❌ 16+ state variables
- ❌ Complex dual API synchronization
- ❌ No testability
- ❌ Massive cognitive load

### After Refactor
- ✅ ~300 lines main component
- ✅ 6 custom hooks (27 → 6 = 78% reduction)
- ✅ 4-5 state variables in main component
- ✅ Clean service layer
- ✅ All hooks testable
- ✅ Clear separation of concerns

---

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Types | 1 day | Type system |
| Phase 2: Services | 1-2 days | API layer |
| Phase 3: Utils | 1 day | Pure functions |
| Phase 4: Hooks | 4-5 days | 6 custom hooks |
| Phase 5: Components | 4-5 days | UI components |
| Phase 6: Integration | 1-2 days | Refactored main |
| Phase 7: Testing | 2-3 days | Tests & docs |

**Total:** 14-19 days (3-4 weeks)
