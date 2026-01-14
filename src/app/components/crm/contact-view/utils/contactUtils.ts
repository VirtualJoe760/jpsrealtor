// Contact formatting utilities

import { Contact, ContactPhone, ContactEmail } from '../types';

/**
 * Get full contact display name
 */
export function getContactFullName(contact: Contact): string {
  const parts = [contact.firstName, contact.middleName, contact.lastName].filter(Boolean);
  return parts.join(' ') || 'Unnamed Contact';
}

/**
 * Get contact initials for avatar
 */
export function getContactInitials(contact: Contact): string {
  const firstInitial = contact.firstName?.charAt(0) || '';
  const lastInitial = contact.lastName?.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || '?';
}

/**
 * Format phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  if (cleaned.length === 11) {
    return `+${cleaned.substring(0, 1)} (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7)}`;
  }
  return phone;
}

/**
 * Format address for display
 */
export function formatAddress(address: Contact['address']): string {
  if (!address) return '';
  const parts = [
    address.street,
    address.city,
    address.state && address.zip ? `${address.state} ${address.zip}` : address.state || address.zip,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Get primary phone from contact
 */
export function getPrimaryPhone(phones: ContactPhone[]): ContactPhone | undefined {
  return phones.find((p) => p.isPrimary) || phones[0];
}

/**
 * Get primary email from contact
 */
export function getPrimaryEmail(emails: ContactEmail[]): ContactEmail | undefined {
  return emails.find((e) => e.isPrimary) || emails[0];
}

/**
 * Parse contact phones into structured format
 */
export function parseContactPhones(contact: Contact): ContactPhone[] {
  const phones: ContactPhone[] = [];
  if (contact.phone) {
    phones.push({ number: contact.phone, label: 'Mobile', isPrimary: true });
  }
  if (contact.alternatePhones && Array.isArray(contact.alternatePhones)) {
    contact.alternatePhones.forEach((phone) => {
      phones.push({ number: phone, label: 'Other', isPrimary: false });
    });
  }
  return phones;
}

/**
 * Parse contact emails into structured format
 */
export function parseContactEmails(contact: Contact): ContactEmail[] {
  const emails: ContactEmail[] = [];
  if (contact.email) {
    emails.push({ address: contact.email, label: 'Personal', isPrimary: true });
  }
  if (contact.alternateEmails && Array.isArray(contact.alternateEmails)) {
    contact.alternateEmails.forEach((email) => {
      emails.push({ address: email, label: 'Other', isPrimary: false });
    });
  }
  return emails;
}

/**
 * Check if contact has complete address
 */
export function hasCompleteAddress(contact: Contact): boolean {
  return !!(
    contact.address?.street &&
    contact.address?.city &&
    contact.address?.state &&
    contact.address?.zip
  );
}
