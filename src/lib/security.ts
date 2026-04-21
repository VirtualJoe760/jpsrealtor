/**
 * Security utilities for input sanitization and validation.
 */

/**
 * Escape HTML special characters to prevent XSS.
 * Use this whenever embedding user input in HTML (emails, templates, etc.)
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape regex special characters to prevent ReDoS.
 * Use this when building MongoDB $regex queries from user input.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate that a URL is safe (no javascript: or data: protocols).
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().trim();
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('/');
}
