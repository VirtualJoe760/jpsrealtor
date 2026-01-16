// Email utility functions for ComposePanel

import type { Email } from '../types';

/**
 * Format quoted reply message
 */
export function formatReplyMessage(originalEmail: Email): string {
  const originalMessage = originalEmail.html || originalEmail.text || '';
  const date = new Date(originalEmail.created_at).toLocaleString();

  return `
    <br><br>
    <div style="border-left: 2px solid #ccc; padding-left: 12px; margin-left: 8px; color: #666;">
      <p style="margin: 0 0 8px 0;"><strong>On ${date}, ${originalEmail.from} wrote:</strong></p>
      ${originalMessage}
    </div>
  `;
}

/**
 * Format forwarded message
 */
export function formatForwardMessage(originalEmail: Email): string {
  const originalMessage = originalEmail.html || originalEmail.text || '';
  const date = new Date(originalEmail.created_at).toLocaleString();

  return `
    <br><br>
    <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; background: #f9f9f9;">
      <p style="margin: 0 0 8px 0; font-weight: bold;">---------- Forwarded message ----------</p>
      <p style="margin: 4px 0;"><strong>From:</strong> ${originalEmail.from}</p>
      <p style="margin: 4px 0;"><strong>Date:</strong> ${date}</p>
      <p style="margin: 4px 0;"><strong>Subject:</strong> ${originalEmail.subject}</p>
      <p style="margin: 4px 0;"><strong>To:</strong> ${originalEmail.to.join(', ')}</p>
      <hr style="margin: 12px 0; border: none; border-top: 1px solid #ddd;">
      ${originalMessage}
    </div>
  `;
}

/**
 * Format subject line for reply
 */
export function formatReplySubject(originalSubject: string): string {
  return originalSubject.startsWith('Re: ')
    ? originalSubject
    : `Re: ${originalSubject}`;
}

/**
 * Format subject line for forward
 */
export function formatForwardSubject(originalSubject: string): string {
  return originalSubject.startsWith('Fwd: ')
    ? originalSubject
    : `Fwd: ${originalSubject}`;
}

/**
 * Parse email addresses from comma-separated string
 */
export function parseEmailAddresses(emailString: string): string[] {
  if (!emailString.trim()) return [];

  return emailString
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0);
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate multiple email addresses
 */
export function validateEmailList(emailString: string): {
  valid: string[];
  invalid: string[];
} {
  const addresses = parseEmailAddresses(emailString);
  const valid: string[] = [];
  const invalid: string[] = [];

  addresses.forEach(email => {
    if (isValidEmail(email)) {
      valid.push(email);
    } else {
      invalid.push(email);
    }
  });

  return { valid, invalid };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Check if attachment size is within limit
 */
export function isValidAttachmentSize(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize;
}

/**
 * Strip HTML tags from content
 */
export function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Get plain text from HTML content
 */
export function getPlainTextFromHtml(html: string): string {
  return stripHtmlTags(html);
}

/**
 * Sanitize HTML content (basic sanitization)
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags and event handlers
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/on\w+="[^"]*"/gi, '');
  sanitized = sanitized.replace(/on\w+='[^']*'/gi, '');
  return sanitized;
}

/**
 * Check if content has unsaved changes
 */
export function hasUnsavedChanges(
  currentContent: string,
  originalContent: string
): boolean {
  const currentPlain = stripHtmlTags(currentContent).trim();
  const originalPlain = stripHtmlTags(originalContent).trim();
  return currentPlain !== originalPlain;
}
