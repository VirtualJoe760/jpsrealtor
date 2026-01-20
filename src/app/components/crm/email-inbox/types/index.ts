// Type definitions for EmailInbox

// Export enums explicitly
export {
  FolderType,
  SentSubfolder,
  EmailFilterType,
  EmailSortBy,
  SortOrder,
  EmailAction,
} from './enums';

// Email structure
export interface Email {
  id: string;
  to: string[];
  from: string;
  subject: string;
  html?: string;
  text?: string;
  created_at: string;
  attachments?: EmailAttachment[];
  error?: string;
  errorDetails?: any;
  statusCode?: number;
}

// Email attachment
export interface EmailAttachment {
  filename: string;
  content_type: string;
  size: number;
}

// Email metadata
export interface EmailMetadata {
  resendEmailId: string;
  isRead: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  tags: string[];
  cachedSenderName?: string;
  cachedSenderEmail?: string;
  cachedSenderPhoto?: string;
  contactId?: any;
}

// Folder definition
export interface EmailFolder {
  id: string;
  label: string;
  icon: any;
}

// Sent subfolder definition
export interface EmailSentSubfolder {
  id: string;
  label: string;
  domain?: string;
}

// Search and filter state
export interface EmailSearchFilter {
  searchQuery: string;
  sortBy: string;
  sortOrder: string;
  filterBy: string;
  filterTags: string[];
}

// Bulk action state
export interface EmailBulkActions {
  selectedEmails: Set<string>;
  showBulkActions: boolean;
}

// Tag management state
export interface EmailTagManagement {
  showTagModal: boolean;
  tagModalEmailId: string | null;
  newTagInput: string;
  availableTags: string[];
}

// EmailInbox component props
export interface EmailInboxProps {
  isLight: boolean;
}

// Compose action type
export type ComposeAction = 'reply' | 'replyAll' | 'forward';

// EmailInbox state
export interface EmailInboxState {
  emails: Email[];
  emailMetadata: Record<string, EmailMetadata>;
  expandedEmailId: string | null;
  expandedEmailContent: Record<string, Email>;
  loadingEmail: string | null;
  loading: boolean;
  error: string | null;
  limit: number;
  activeFolder: string;
  sentSubfolder: string;
  showComposePanel: boolean;
  replyToEmail?: Email;
  forwardEmail?: Email;
  searchFilter: EmailSearchFilter;
  bulkActions: EmailBulkActions;
  tagManagement: EmailTagManagement;
}
