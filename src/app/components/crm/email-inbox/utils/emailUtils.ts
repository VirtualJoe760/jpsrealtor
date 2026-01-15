// Email utility functions

import type { Email, EmailMetadata } from '../types';

/**
 * Extract sender name from email address
 */
export function getSenderName(email: Email, metadata?: EmailMetadata): string {
  if (metadata?.cachedSenderName) {
    return metadata.cachedSenderName;
  }

  const fromEmail = email.from;
  const match = fromEmail.match(/^"?([^"<]+)"?\s*<?/);

  if (match && match[1]) {
    return match[1].trim();
  }

  // If no name, return email address before @
  return fromEmail.split('@')[0];
}

/**
 * Extract sender email from email address
 */
export function getSenderEmail(email: Email): string {
  const emailMatch = email.from.match(/<([^>]+)>/);
  return emailMatch ? emailMatch[1] : email.from;
}

/**
 * Format email date for display
 */
export function formatEmailDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 24) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Get email preview text (first 100 chars)
 */
export function getEmailPreview(email: Email): string {
  const text = email.text || email.html?.replace(/<[^>]*>/g, '') || '';
  return text.slice(0, 100).trim() + (text.length > 100 ? '...' : '');
}

/**
 * Check if email has attachments
 */
export function hasAttachments(email: Email): boolean {
  return Boolean(email.attachments && email.attachments.length > 0);
}

/**
 * Get attachment count
 */
export function getAttachmentCount(email: Email): number {
  return email.attachments?.length || 0;
}

/**
 * Format attachment size for display
 */
export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get total attachments size
 */
export function getTotalAttachmentsSize(email: Email): number {
  if (!email.attachments) return 0;
  return email.attachments.reduce((total, att) => total + att.size, 0);
}

/**
 * Check if email is from a specific domain
 */
export function isFromDomain(email: Email, domain: string): boolean {
  const senderEmail = getSenderEmail(email);
  return senderEmail.endsWith(`@${domain}`);
}

/**
 * Extract initials from sender name
 */
export function getSenderInitials(email: Email, metadata?: EmailMetadata): string {
  const name = getSenderName(email, metadata);
  const parts = name.split(' ');

  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

/**
 * Truncate email subject
 */
export function truncateSubject(subject: string, maxLength: number = 50): string {
  if (subject.length <= maxLength) return subject;
  return subject.slice(0, maxLength).trim() + '...';
}

/**
 * Check if email is a reply
 */
export function isReply(email: Email): boolean {
  return email.subject.toLowerCase().startsWith('re:');
}

/**
 * Check if email is a forward
 */
export function isForward(email: Email): boolean {
  return email.subject.toLowerCase().startsWith('fwd:') ||
         email.subject.toLowerCase().startsWith('fw:');
}
