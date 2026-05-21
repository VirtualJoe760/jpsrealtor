# CRM System Documentation

**Last Updated:** January 16, 2026
**Version:** 2.0 (Post-Refactor)
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
   - [ContactsTab](#1-contactstab)
   - [ContactViewPanel](#2-contactviewpanel)
   - [EmailInbox](#3-emailinbox)
   - [ComposePanel](#4-composepanel)
   - [MessagesTab](#5-messagestab)
   - [CampaignCard](#6-campaigncard)
   - [CMSPage](#7-cmspage)
   - [AgentNav](#8-agentnav)
4. [Shared Patterns](#shared-patterns)
5. [API Integration](#api-integration)
6. [State Management](#state-management)
7. [Development Guidelines](#development-guidelines)

---

## Overview

The CRM (Customer Relationship Management) system is a comprehensive platform for real estate agents to manage contacts, communications, marketing campaigns, and content. All components follow a modular architecture with clear separation of concerns.

### Key Features
- **Contact Management** - Import, organize, and track client interactions
- **Email Communication** - Send, receive, and manage email conversations
- **SMS Messaging** - Real-time text messaging with WebSocket support
- **Campaign Management** - Create and track marketing campaigns
- **Content Management** - Publish and manage articles and blog posts
- **Analytics** - Track engagement metrics and performance

### Technology Stack
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **State Management:** React hooks (useState, useCallback, useMemo, useEffect)
- **Real-time:** WebSocket (Socket.io)
- **Animations:** Framer Motion
- **Theme:** Custom theme context with light/dark modes

---

## System Architecture

### Modular Design Pattern

All CRM components follow a consistent 6-layer architecture:

```
component/
├── types/          # TypeScript interfaces and enums
├── constants/      # Configuration values and defaults
├── utils/          # Pure utility functions
├── hooks/          # Custom React hooks for stateful logic
├── components/     # Reusable UI components
└── index.tsx       # Main component (orchestration)
```

### Benefits
- **Single Responsibility:** Each file has one clear purpose
- **Testability:** Pure functions and isolated hooks are easy to test
- **Reusability:** Components and hooks can be shared across features
- **Maintainability:** Clear structure makes code easy to navigate
- **Type Safety:** Full TypeScript coverage prevents runtime errors

---

## Core Components

## 1. ContactsTab

**Location:** `src/app/agent/contacts/page.tsx`
**Purpose:** Primary interface for managing and viewing all contacts

### Features
- Contact list with search and filtering
- Import contacts from CSV/Excel files
- Create and edit contacts
- Tag-based organization
- Bulk actions (delete, export, assign tags)
- Pagination (50 contacts per page)
- Mobile-responsive design

### Architecture

**Main Component:** 400 lines (reduced from 2,100 lines)

**Custom Hooks (8):**
- `useContacts` - Fetches and manages contact list data
- `useContactSearch` - Real-time search filtering
- `useContactFilters` - Tag and status filtering
- `useContactSelection` - Multi-select for bulk actions
- `useContactImport` - CSV/Excel file parsing and import
- `useContactActions` - CRUD operations (create, edit, delete)
- `usePagination` - Page state management
- `useContactView` - Contact detail panel state

**UI Components (10):**
- `ContactList` - Main list container with virtualization
- `ContactListItem` - Individual contact card
- `ContactFilters` - Search bar and filter dropdowns
- `ContactToolbar` - Bulk action buttons
- `ImportModal` - CSV/Excel file upload interface
- `CreateContactModal` - New contact form
- `TagSelector` - Multi-select tag dropdown
- `PaginationControls` - Page navigation
- `EmptyState` - No contacts message
- `ContactStats` - Contact count metrics

**Utility Functions (15):**
- `filterContactsBySearch` - Text search algorithm
- `filterContactsByTags` - Tag intersection logic
- `sortContacts` - Multiple sort strategies
- `parseCSVFile` - CSV to contact object parser
- `validateContactData` - Data validation rules
- `formatPhoneNumber` - Phone number formatting
- `formatContactName` - Name display logic
- `calculateContactStats` - Metrics calculation
- `exportContactsToCSV` - Export to CSV format
- `deduplicateContacts` - Duplicate detection
- `mergeContactData` - Contact merge logic
- `groupContactsByTag` - Tag-based grouping
- `searchContactFields` - Multi-field search
- `highlightSearchTerm` - Search term highlighting
- `getContactInitials` - Avatar initials generation

### API Endpoints
- `GET /api/crm/contacts` - Fetch all contacts
- `POST /api/crm/contacts` - Create new contact
- `PUT /api/crm/contacts/:id` - Update contact
- `DELETE /api/crm/contacts/:id` - Delete contact
- `POST /api/crm/contacts/import` - Bulk import contacts
- `GET /api/crm/contacts/export` - Export contacts

### Data Model

```typescript
interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  tags: string[];
  notes?: string;
  source: 'manual' | 'import' | 'form';
  status: 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
}
```

---

## 2. ContactViewPanel

**Location:** `src/app/components/crm/ContactViewPanel.tsx`
**Purpose:** Side panel for viewing and editing contact details

### Features
- Full contact information display
- Inline editing with auto-save
- Activity timeline (emails, messages, notes)
- Quick actions (email, message, call)
- Note creation and management
- Tag assignment
- Delete confirmation

### Architecture

**Main Component:** 327 lines (reduced from 1,780 lines)

**Custom Hook (1):**
- `useContactActions` - Handles all contact mutations and side effects

**UI Components (8):**
- `ContactHeader` - Name, avatar, and quick action buttons
- `ContactInfo` - Editable contact fields
- `ContactTags` - Tag chips with add/remove
- `ContactNotes` - Notes list and creation form
- `ContactTimeline` - Activity feed with infinite scroll
- `ContactActions` - Primary action buttons
- `ContactMetrics` - Engagement statistics
- `DeleteConfirmModal` - Deletion confirmation dialog

**Utility Functions (12):**
- `formatContactData` - Data transformation for display
- `validateEmail` - Email validation
- `validatePhone` - Phone number validation
- `calculateEngagementScore` - Engagement metrics
- `generateTimeline` - Activity timeline construction
- `sortTimelineEvents` - Chronological sorting
- `formatTimelineDate` - Relative date formatting
- `filterTimelineByType` - Event type filtering
- `getContactAvatar` - Avatar URL or initials
- `formatContactAddress` - Address formatting
- `canDeleteContact` - Permission check
- `buildContactPayload` - API request builder

### API Endpoints
- `GET /api/crm/contacts/:id` - Fetch single contact
- `PUT /api/crm/contacts/:id` - Update contact
- `DELETE /api/crm/contacts/:id` - Delete contact
- `POST /api/crm/contacts/:id/notes` - Add note
- `GET /api/crm/contacts/:id/timeline` - Fetch timeline

### State Management

```typescript
interface ContactViewState {
  contact: Contact | null;
  isEditing: boolean;
  isSaving: boolean;
  activeTab: 'info' | 'timeline' | 'notes';
  errors: Record<string, string>;
}
```

---

## 3. EmailInbox

**Location:** `src/app/agent/email/page.tsx`
**Purpose:** Email management interface with send/receive functionality

### Features
- Inbox/Sent/Archive folder navigation
- Email list with preview
- Full email detail view
- Compose new emails
- Reply and forward
- Attachment support
- Search and filters
- Bulk actions (delete, archive, mark read)
- Real-time updates via WebSocket

### Architecture

**Main Component:** 242 lines (reduced from 1,562 lines)

**Custom Hooks (7):**
- `useEmails` - Fetches emails with pagination
- `useEmailMetadata` - Tracks read/unread status
- `useEmailExpand` - Detail view state
- `useEmailCompose` - Compose panel state
- `useEmailBulkActions` - Multi-select and bulk operations
- `useEmailSearch` - Search and filter logic
- `useEmailFolder` - Folder navigation state

**UI Components (5):**
- `EmailListItem` - Email preview card
- `EmailDetail` - Full email view with actions
- `EmailAttachments` - Attachment list and download
- `EmailToolbar` - Action buttons and search
- `EmailFolderNav` - Folder sidebar navigation

**Utility Functions (27):**
- Email utilities (15 functions):
  * `parseEmailHeaders` - Extract email metadata
  * `formatEmailDate` - Relative/absolute date formatting
  * `extractEmailDomain` - Domain extraction
  * `getEmailAvatar` - Sender avatar logic
  * `sanitizeEmailHTML` - XSS protection for email content
  * `extractEmailAddresses` - Parse To/CC/BCC
  * `formatEmailSize` - Byte to human-readable
  * `detectEmailType` - Classify email type
  * `generateEmailPreview` - Create preview text
  * `highlightEmailSearch` - Search term highlighting
  * `sortEmailsByDate` - Chronological sorting
  * `groupEmailsByThread` - Thread grouping
  * `calculateEmailStats` - Inbox statistics
  * `isEmailUnread` - Read status check
  * `buildEmailPayload` - API request builder
- Filter utilities (12 functions):
  * `filterByFolder` - Folder-based filtering
  * `filterBySearch` - Full-text search
  * `filterByDate` - Date range filtering
  * `filterByUnread` - Unread-only filter
  * `filterByHasAttachment` - Attachment filter
  * `filterByFrom` - Sender filter
  * `applyAllFilters` - Combine all filters
  * `paginateEmails` - Pagination logic
  * `calculateTotalPages` - Page count
  * `getPageEmails` - Get current page
  * `sortEmails` - Multiple sort strategies
  * `groupEmails` - Group by criteria

### API Endpoints
- `GET /api/email/list` - Fetch emails
- `GET /api/email/:id` - Fetch single email
- `POST /api/email/send` - Send email
- `POST /api/email/:id/reply` - Reply to email
- `DELETE /api/email/:id` - Delete email
- `PUT /api/email/:id/read` - Mark as read
- `PUT /api/email/bulk/archive` - Bulk archive

### Data Model

```typescript
interface Email {
  id: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments: Attachment[];
  folder: 'inbox' | 'sent' | 'archive' | 'trash';
  isRead: boolean;
  isStarred: boolean;
  threadId?: string;
  replyToId?: string;
  sentAt: Date;
  receivedAt?: Date;
}

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}
```

---

## 4. ComposePanel

**Location:** `src/app/components/crm/ComposePanel.tsx`
**Purpose:** Email composition interface with rich text editing

### Features
- Rich text editor (bold, italic, lists, links)
- Recipient autocomplete
- Template selection
- Attachment upload (drag-and-drop)
- AI-powered email generation
- Draft auto-save
- Send scheduling
- Preview mode

### Architecture

**Main Component:** 444 lines (reduced from 730 lines)

**Custom Hooks (8):**
- `useCompose` - Main composition state
- `useEditor` - Rich text editor state
- `useAttachments` - File upload and management
- `useTemplates` - Email template selection
- `useAI` - AI email generation
- `usePanelState` - Open/close and position
- `useSendEmail` - Send logic and validation
- `useLinkModal` - Link insertion modal

**UI Components (6):**
- `RichTextToolbar` - Formatting buttons
- `AIModal` - AI generation prompt dialog
- `LinkModal` - URL insertion dialog
- `TemplateSelector` - Template picker dropdown
- `AttachmentList` - Uploaded files list
- `RecipientFields` - To/CC/BCC inputs with autocomplete

**Utility Functions (3 modules):**
- **emailUtils** - Email formatting and validation
  * `validateRecipients` - Email address validation
  * `formatEmailBody` - HTML/text conversion
  * `buildEmailPayload` - API request construction
  * `extractContactEmails` - Contact email extraction
  * `deduplicateRecipients` - Remove duplicate emails
- **editorUtils** - Rich text operations
  * `insertLink` - Link insertion logic
  * `applyFormat` - Text formatting (bold, italic, etc.)
  * `insertList` - Ordered/unordered list insertion
  * `sanitizeHTML` - XSS protection
  * `stripFormatting` - Remove all formatting
- **validationUtils** - Input validation
  * `validateSubject` - Subject line validation
  * `validateBody` - Body content validation
  * `validateAttachments` - File size/type validation
  * `canSendEmail` - Pre-send validation

### API Endpoints
- `POST /api/email/send` - Send email
- `POST /api/email/draft` - Save draft
- `GET /api/email/templates` - Fetch templates
- `POST /api/ai/generate-email` - AI email generation
- `POST /api/email/upload-attachment` - Upload file

### State Management

```typescript
interface ComposeState {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  htmlBody: string;
  attachments: File[];
  templateId?: string;
  isDraft: boolean;
  isGeneratingAI: boolean;
  isSending: boolean;
  errors: Record<string, string>;
}
```

---

## 5. MessagesTab

**Location:** `src/app/agent/messages/page.tsx`
**Purpose:** SMS/text messaging interface with real-time updates

### Features
- Conversation list with last message preview
- Real-time message thread
- Send/receive SMS
- Contact autocomplete
- Message search
- Read receipts
- WebSocket integration for instant updates
- Push notification support
- Mobile-optimized interface

### Architecture

**Main Component:** 362 lines

**Custom Hooks (3):**
- `useConversations` - Fetches and manages conversation list
- `useMessages` - Fetches messages for selected conversation
- `useContacts` - Contact lookup for new conversations

**UI Components (10):**
- `ConversationList` - List of all conversations
- `MessageThread` - Message history for selected conversation
- `ComposeView` - New message composition
- `MessageBubble` - Individual message display
- `MessageInput` - Text input with send button
- `ContactSearch` - Search contacts to message
- `MessageToolbar` - Actions and search
- `EmptyConversation` - No conversation selected state
- `TypingIndicator` - Shows when contact is typing
- `MessageStatus` - Delivery/read status icons

**Utility Functions:**
- `formatMessageTime` - Timestamp formatting
- `groupMessagesByDate` - Date-based grouping
- `sortConversations` - Sort by most recent
- `filterConversations` - Search filtering
- `buildMessagePayload` - API request construction
- `parseIncomingMessage` - WebSocket message parsing
- `markAsRead` - Read status update
- `extractPhoneNumber` - Phone number extraction

### API Endpoints
- `GET /api/crm/sms/conversations` - Fetch conversations
- `GET /api/crm/sms/messages/:conversationId` - Fetch messages
- `POST /api/crm/sms/send` - Send SMS
- `PUT /api/crm/sms/read/:messageId` - Mark as read
- `POST /api/crm/sms/webhook` - Inbound SMS webhook

### WebSocket Events

```typescript
// Client → Server
socket.emit('join-conversation', { conversationId });
socket.emit('typing', { conversationId });

// Server → Client
socket.on('new-message', (message) => { /* ... */ });
socket.on('message-delivered', (messageId) => { /* ... */ });
socket.on('message-read', (messageId) => { /* ... */ });
socket.on('contact-typing', (contactId) => { /* ... */ });
```

### Data Model

```typescript
interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  messages?: Message[];
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}
```

---

## 6. CampaignCard

**Location:** `src/app/agent/campaigns/page.tsx` (component)
**Purpose:** Display campaign information and metrics in grid or list view

### Features
- Grid and list view modes
- Campaign status badges
- Engagement metrics (open rate, click rate, response rate)
- Strategy icons (email, SMS, voicemail)
- Progress bars for engagement
- Quick actions (view, edit, duplicate, delete)
- Responsive design

### Architecture

**Main Component:** 40 lines (reduced from 505 lines)

**UI Components (7):**
- `StatusBadge` - Campaign status indicator
- `StrategyIcons` - Icons for campaign channels
- `StatsDisplay` - Numeric metrics display
- `EngagementBars` - Progress bars for rates
- `CampaignInfo` - Name, description, dates
- `GridView` - Card layout for campaigns
- `ListView` - Table layout for campaigns

**Utility Functions (15):**
- `calculateOpenRate` - Open rate percentage
- `calculateClickRate` - Click rate percentage
- `calculateResponseRate` - Response rate percentage
- `formatCampaignDate` - Date formatting
- `getStatusColor` - Color for status badge
- `getStrategyIcon` - Icon for campaign strategy
- `formatMetricValue` - Number formatting (K, M)
- `sortCampaigns` - Multiple sort strategies
- `filterCampaigns` - Search and status filtering
- `groupCampaignsByStatus` - Status-based grouping
- `calculateCampaignStats` - Aggregate statistics
- `getCampaignProgress` - Progress percentage
- `isActive Campaign` - Active status check
- `formatEngagementRate` - Percentage formatting
- `getStrategyLabel` - Human-readable strategy name

### API Endpoints
- `GET /api/campaigns` - Fetch all campaigns
- `GET /api/campaigns/:id` - Fetch single campaign
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/duplicate` - Duplicate campaign

### Data Model

```typescript
enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

enum CampaignStrategy {
  EMAIL = 'email',
  SMS = 'sms',
  VOICEMAIL = 'voicemail',
  MULTI_CHANNEL = 'multi-channel'
}

interface Campaign {
  _id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  strategy: CampaignStrategy;
  startDate: Date;
  endDate?: Date;
  targetCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  responseCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 7. CMSPage

**Location:** `src/app/agent/cms/page.tsx`
**Purpose:** Content management for articles and blog posts

### Features
- Article list with search and filtering
- Category filtering (Articles, Market Insights, Real Estate Tips)
- Pagination (50 articles per page)
- Create, edit, and delete articles
- Publish/unpublish toggle
- Article preview
- Draft management
- SEO-friendly URLs

### Architecture

**Main Component:** 152 lines (reduced from 460 lines)

**Custom Hooks (4):**
- `useArticles` - Fetches article data and stats
- `useArticleFilters` - Search and category filtering
- `useArticlePagination` - Page state and article slicing
- `useArticleActions` - CRUD operations

**UI Components (6):**
- `CMSHeader` - Page title and new article button
- `ArticleFilters` - Search input and category dropdown
- `ArticleList` - Desktop and mobile article lists
- `ArticleListItem` - Individual article row/card
- `EmptyState` - No articles found message
- `PaginationControls` - Previous/next buttons

**Utility Functions (11):**
- `filterArticlesBySearch` - Text search on title and excerpt
- `filterArticlesByCategory` - Category filtering
- `applyFilters` - Combine search and category filters
- `paginateArticles` - Slice articles for current page
- `calculateTotalPages` - Calculate page count
- `calculatePaginationState` - Build pagination state object
- `calculateArticleStats` - Count total, published, draft
- `formatCategoryLabel` - Human-readable category name
- `getArticlePath` - Generate article URL
- `getEditArticlePath` - Generate edit URL
- `sortArticlesByDate` - Chronological sorting

### API Endpoints
- `GET /api/articles` - Fetch all articles
- `GET /api/articles/:slug` - Fetch single article
- `POST /api/articles` - Create article
- `PUT /api/articles/:slug` - Update article
- `DELETE /api/articles/:slug` - Delete article
- `PUT /api/articles/:slug/publish` - Toggle publish status

### Data Model

```typescript
enum ArticleCategory {
  ARTICLES = 'articles',
  MARKET_INSIGHTS = 'market-insights',
  REAL_ESTATE_TIPS = 'real-estate-tips'
}

interface Article {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: ArticleCategory;
  published: boolean;
  image?: string;
  author: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface ArticleStats {
  total: number;
  published: number;
  draft: number;
  viewsByCategory: {
    articles: number;
    marketInsights: number;
    realEstateTips: number;
  };
}
```

---

## 8. AgentNav

**Location:** `src/app/components/AgentNav.tsx`
**Purpose:** Main navigation component for agent dashboard

### Features
- Desktop horizontal tab navigation
- Mobile slide-out menu
- Back button (fixed on mobile, static on desktop)
- Role-based navigation (team leader items)
- Active route highlighting
- Theme-aware styling
- Framer Motion animations for mobile menu
- Responsive design

### Architecture

**Main Component:** 62 lines (reduced from 226 lines)

**Custom Hook (1):**
- `useMobileMenu` - Mobile menu open/close state

**UI Components (4):**
- `BackButton` - Browser back navigation
- `MobileMenuButton` - Hamburger/X toggle button
- `DesktopNav` - Horizontal tab navigation
- `MobileNav` - Slide-out menu with backdrop

**Utility Functions (8):**
- `isNavItemActive` - Check if route is active
- `getVisibleNavItems` - Filter by role permissions
- `getButtonClasses` - Theme-aware button styling
- `getActiveNavClasses` - Active tab styling
- `getInactiveNavClasses` - Inactive tab styling
- `getMobileActiveNavClasses` - Active mobile item styling
- `getMobileInactiveNavClasses` - Inactive mobile item styling

### Navigation Items

```typescript
const navItems = [
  { href: '/agent/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/agent/contacts', label: 'Contacts', icon: UserCircle },
  { href: '/agent/email', label: 'Email', icon: Mail },
  { href: '/agent/messages', label: 'Messages', icon: MessageSquare },
  { href: '/agent/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/agent/cms', label: 'CMS', icon: FileText },
  { href: '/agent/applications', label: 'Applications', icon: FileCheck, teamLeaderOnly: true },
  { href: '/agent/team', label: 'Team', icon: Users, teamLeaderOnly: true }
];
```

### Theme Integration

The component uses the global theme context to apply consistent styling:

```typescript
const { currentTheme } = useTheme();
const { textPrimary, textSecondary, border, cardBg } = useThemeClasses();
const isLight = currentTheme === 'lightgradient';
```

---

## Shared Patterns

### Custom Hook Pattern

All components use custom hooks to extract stateful logic:

```typescript
// Example: useContacts hook
export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/crm/contacts');
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const data = await response.json();
      setContacts(data.contacts);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return { contacts, isLoading, error, refetch: fetchContacts };
}
```

### Pure Utility Functions

All utility functions are pure (no side effects) and testable:

```typescript
// Example: Filter utility
export function filterBySearch(
  items: any[],
  searchTerm: string,
  fields: string[]
): any[] {
  if (!searchTerm.trim()) return items;

  const lowerSearch = searchTerm.toLowerCase();
  return items.filter(item =>
    fields.some(field =>
      String(item[field]).toLowerCase().includes(lowerSearch)
    )
  );
}
```

### Component Composition

UI components are small, focused, and composable:

```typescript
// Example: Reusable button component
interface ActionButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function ActionButton({ label, icon: Icon, onClick, variant, disabled }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={getButtonClasses(variant)}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
}
```

---

## API Integration

### API Client

All components use a centralized API client pattern:

```typescript
// Example: API request with error handling
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
```

### Error Handling

All API calls include proper error handling:

```typescript
try {
  const data = await apiRequest('/crm/contacts');
  setContacts(data.contacts);
} catch (error) {
  console.error('Failed to fetch contacts:', error);
  setError(error.message);
  // Show user-friendly error message
  toast.error('Unable to load contacts. Please try again.');
}
```

### Optimistic Updates

UI updates optimistically for better UX:

```typescript
// Optimistically update UI
setContacts(prev => prev.map(c =>
  c._id === contactId ? { ...c, ...updates } : c
));

// Send API request
try {
  await apiRequest(`/crm/contacts/${contactId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
} catch (error) {
  // Revert on failure
  refetchContacts();
  toast.error('Failed to update contact');
}
```

---

## State Management

### Local State (useState)

Used for component-specific UI state:

```typescript
const [isOpen, setIsOpen] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);
const [searchTerm, setSearchTerm] = useState('');
```

### Derived State (useMemo)

Computed values are memoized to prevent unnecessary recalculation:

```typescript
const filteredContacts = useMemo(() => {
  return applyFilters(contacts, searchTerm, selectedTags);
}, [contacts, searchTerm, selectedTags]);

const paginatedContacts = useMemo(() => {
  return paginateContacts(filteredContacts, page, itemsPerPage);
}, [filteredContacts, page, itemsPerPage]);
```

### Callbacks (useCallback)

Functions are memoized to prevent unnecessary re-renders:

```typescript
const handleSearch = useCallback((term: string) => {
  setSearchTerm(term);
  setPage(1); // Reset to first page
}, []);

const handleDelete = useCallback(async (id: string) => {
  if (!confirm('Are you sure?')) return;
  await deleteContact(id);
  refetchContacts();
}, [refetchContacts]);
```

### Side Effects (useEffect)

Side effects are managed with clear dependencies:

```typescript
useEffect(() => {
  // Fetch data on mount
  fetchContacts();
}, [fetchContacts]);

useEffect(() => {
  // Reset page when filters change
  setPage(1);
}, [searchTerm, selectedCategory]);

useEffect(() => {
  // Auto-save draft every 5 seconds
  const timer = setInterval(() => {
    if (isDirty) {
      saveDraft();
    }
  }, 5000);

  return () => clearInterval(timer);
}, [isDirty, saveDraft]);
```

---

## Development Guidelines

### Adding New Features

1. **Plan the architecture** - Determine which hooks and components are needed
2. **Create types** - Define TypeScript interfaces and enums
3. **Write utilities** - Create pure helper functions
4. **Build hooks** - Extract stateful logic into custom hooks
5. **Create components** - Build focused UI components
6. **Integrate** - Compose everything in the main component
7. **Test** - Verify functionality and edge cases

### Code Style

- **TypeScript:** Use strict mode, avoid `any` types
- **Naming:** Use descriptive names (verbs for functions, nouns for components)
- **Functions:** Keep functions small and focused (< 50 lines)
- **Components:** One component per file, use named exports
- **Imports:** Group imports (React, external, internal, relative)

### File Organization

```typescript
// 1. React imports
import { useState, useCallback, useMemo } from 'react';

// 2. External library imports
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';

// 3. Internal imports (hooks, utils, types)
import { useTheme } from '@/app/contexts/ThemeContext';
import { filterContacts } from '../utils';
import type { Contact } from '../types';

// 4. Relative imports
import { ContactCard } from './ContactCard';
```

### Testing Strategy

- **Unit tests:** Test utility functions and hooks independently
- **Integration tests:** Test component interactions
- **E2E tests:** Test critical user flows
- **Type checking:** Ensure no TypeScript errors in build

### Performance Optimization

- Use `useMemo` for expensive calculations
- Use `useCallback` for functions passed to children
- Use `React.memo` for components that render frequently
- Implement virtualization for long lists (react-window)
- Lazy load components with `React.lazy` and `Suspense`
- Optimize images with Next.js Image component
- Use Web Workers for heavy computations

---

## Conclusion

The CRM system is built with modern React patterns, TypeScript safety, and modular architecture. All components follow consistent patterns for maintainability and scalability. For questions or contributions, please refer to the main project documentation.

**Key Takeaways:**
- ✅ Modular architecture with clear separation of concerns
- ✅ Type-safe TypeScript throughout
- ✅ Custom hooks for reusable stateful logic
- ✅ Pure utility functions for testability
- ✅ Focused UI components for composability
- ✅ Consistent patterns across all components
- ✅ Performance-optimized with memoization
- ✅ Mobile-responsive design
- ✅ Real-time features with WebSocket
- ✅ Comprehensive API integration

---

**Last Updated:** January 16, 2026
**Maintained By:** Development Team
**Version:** 2.0 (Post-Refactor)
