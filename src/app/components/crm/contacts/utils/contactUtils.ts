// Contact utility functions

import { Contact, ContactAge } from '../types';

/**
 * Calculate number of days since contact was imported or created
 */
export function getDaysSinceImport(contact: Contact): number {
  const dateToUse = contact.importedAt || contact.createdAt;
  const importDate = new Date(dateToUse);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - importDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get contact age category based on days since import
 */
export function getContactAgeCategory(contact: Contact): ContactAge {
  const days = getDaysSinceImport(contact);
  if (days <= 30) return ContactAge.RECENT;   // 0-30 days
  if (days <= 365) return ContactAge.OLD;      // 31-365 days
  return ContactAge.ANCIENT;                    // 365+ days
}

/**
 * Get contact's display name
 */
export function getContactDisplayName(contact: Contact): string {
  const parts = [contact.firstName, contact.lastName].filter(Boolean);
  return parts.join(' ') || 'Unknown Contact';
}

/**
 * Check if contact has an email address
 */
export function hasEmail(contact: Contact): boolean {
  return !!(contact.email || (contact.alternateEmails && contact.alternateEmails.length > 0));
}

/**
 * Check if contact has a phone number
 */
export function hasPhone(contact: Contact): boolean {
  return !!(contact.phone && contact.phone.trim() !== '');
}

/**
 * Check if contact has an address
 */
export function hasAddress(contact: Contact): boolean {
  return !!(contact.address && (contact.address.street || contact.address.city));
}

/**
 * Get contact initials for avatar
 */
export function getContactInitials(contact: Contact): string {
  const firstInitial = contact.firstName?.charAt(0) || '';
  const lastInitial = contact.lastName?.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || '??';
}

/**
 * Format contact phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Format based on length
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if can't format
  return phone;
}
