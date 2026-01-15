// Constants for EmailInbox

import { Inbox, Send } from 'lucide-react';
import { FolderType, SentSubfolder } from '../types';

// Email pagination
export const EMAIL_LIMIT = 50;

// Folders configuration
export const EMAIL_FOLDERS = [
  { id: FolderType.INBOX, label: 'Inbox', icon: Inbox },
  { id: FolderType.SENT, label: 'Sent', icon: Send },
];

// Sent subfolders configuration
export const EMAIL_SENT_SUBFOLDERS = [
  { id: SentSubfolder.ALL, label: 'All Sent' },
  { id: SentSubfolder.TRANSACTIONAL, label: 'Transactional', domain: 'jpsrealtor.com' },
  { id: SentSubfolder.MARKETING, label: 'Marketing', domain: 'josephsardella.com' },
];

// Default available tags
export const DEFAULT_EMAIL_TAGS = [
  'urgent',
  'follow-up',
  'lead',
  'client',
  'important',
  'waiting',
  'review',
];

// Email actions labels
export const EMAIL_ACTION_LABELS = {
  reply: 'Reply',
  forward: 'Forward',
  delete: 'Delete',
  archive: 'Archive',
  favorite: 'Favorite',
  markRead: 'Mark as Read',
  markUnread: 'Mark as Unread',
  addTag: 'Add Tag',
  removeTag: 'Remove Tag',
};

// Filter options
export const EMAIL_FILTER_OPTIONS = [
  { value: 'all', label: 'All Emails' },
  { value: 'unread', label: 'Unread' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'attachments', label: 'Has Attachments' },
];

// Sort options
export const EMAIL_SORT_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'sender', label: 'Sender' },
  { value: 'subject', label: 'Subject' },
];

// API endpoints
export const EMAIL_API_ENDPOINTS = {
  fetchEmails: '/api/resend/inbox',
  fetchEmailContent: '/api/resend/email',
  fetchMetadata: '/api/email-metadata',
  updateMetadata: '/api/email-metadata',
  sendEmail: '/api/send',
};

// Animation durations (ms)
export const EMAIL_ANIMATION_DURATION = {
  expand: 300,
  collapse: 200,
  fadeIn: 150,
  fadeOut: 150,
};

// Debounce delays (ms)
export const EMAIL_DEBOUNCE_DELAYS = {
  search: 300,
  resize: 150,
};
