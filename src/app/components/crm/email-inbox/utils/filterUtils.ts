// Email filtering and sorting utilities

import type { Email, EmailMetadata } from '../types';
import { EmailFilterType, EmailSortBy, SortOrder } from '../types';
import { getSenderName, hasAttachments } from './emailUtils';

/**
 * Filter emails based on filter type
 */
export function filterEmails(
  emails: Email[],
  filterType: EmailFilterType,
  metadata: Record<string, EmailMetadata>
): Email[] {
  switch (filterType) {
    case EmailFilterType.UNREAD:
      return emails.filter((email) => !metadata[email.id]?.isRead);

    case EmailFilterType.FAVORITES:
      return emails.filter((email) => metadata[email.id]?.isFavorite);

    case EmailFilterType.ATTACHMENTS:
      return emails.filter((email) => hasAttachments(email));

    case EmailFilterType.ALL:
    default:
      return emails;
  }
}

/**
 * Filter emails by search query
 */
export function searchEmails(
  emails: Email[],
  searchQuery: string,
  metadata: Record<string, EmailMetadata>
): Email[] {
  if (!searchQuery.trim()) return emails;

  const query = searchQuery.toLowerCase();

  return emails.filter((email) => {
    const subject = email.subject.toLowerCase();
    const from = email.from.toLowerCase();
    const senderName = getSenderName(email, metadata[email.id]).toLowerCase();
    const text = (email.text || email.html || '').toLowerCase();

    return (
      subject.includes(query) ||
      from.includes(query) ||
      senderName.includes(query) ||
      text.includes(query)
    );
  });
}

/**
 * Filter emails by tags
 */
export function filterByTags(
  emails: Email[],
  tags: string[],
  metadata: Record<string, EmailMetadata>
): Email[] {
  if (tags.length === 0) return emails;

  return emails.filter((email) => {
    const emailTags = metadata[email.id]?.tags || [];
    return tags.some((tag) => emailTags.includes(tag));
  });
}

/**
 * Sort emails
 */
export function sortEmails(
  emails: Email[],
  sortBy: EmailSortBy,
  sortOrder: SortOrder,
  metadata: Record<string, EmailMetadata>
): Email[] {
  const sorted = [...emails].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case EmailSortBy.DATE:
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;

      case EmailSortBy.SENDER:
        const senderA = getSenderName(a, metadata[a.id]).toLowerCase();
        const senderB = getSenderName(b, metadata[b.id]).toLowerCase();
        comparison = senderA.localeCompare(senderB);
        break;

      case EmailSortBy.SUBJECT:
        comparison = a.subject.toLowerCase().localeCompare(b.subject.toLowerCase());
        break;

      default:
        comparison = 0;
    }

    return sortOrder === SortOrder.ASC ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Apply all filters and sorting
 */
export function applyFiltersAndSort(
  emails: Email[],
  searchQuery: string,
  filterType: EmailFilterType,
  filterTags: string[],
  sortBy: EmailSortBy,
  sortOrder: SortOrder,
  metadata: Record<string, EmailMetadata>
): Email[] {
  let filtered = emails;

  // Apply search
  filtered = searchEmails(filtered, searchQuery, metadata);

  // Apply filter type
  filtered = filterEmails(filtered, filterType, metadata);

  // Apply tag filter
  filtered = filterByTags(filtered, filterTags, metadata);

  // Apply sorting
  filtered = sortEmails(filtered, sortBy, sortOrder, metadata);

  return filtered;
}

/**
 * Get unique tags from all emails
 */
export function getAllTags(metadata: Record<string, EmailMetadata>): string[] {
  const tagSet = new Set<string>();

  Object.values(metadata).forEach((meta) => {
    meta.tags?.forEach((tag) => tagSet.add(tag));
  });

  return Array.from(tagSet).sort();
}

/**
 * Count unread emails
 */
export function countUnread(
  emails: Email[],
  metadata: Record<string, EmailMetadata>
): number {
  return emails.filter((email) => !metadata[email.id]?.isRead).length;
}

/**
 * Count favorites
 */
export function countFavorites(
  emails: Email[],
  metadata: Record<string, EmailMetadata>
): number {
  return emails.filter((email) => metadata[email.id]?.isFavorite).length;
}
