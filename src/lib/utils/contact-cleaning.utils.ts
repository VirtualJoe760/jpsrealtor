/**
 * Contact Data Cleaning Utilities
 *
 * Provides functions for cleaning, validating, and normalizing contact data
 * for the Prospect Discovery feature. Handles emoji detection, phone/email
 * normalization, junk entry detection, and data quality scoring.
 */

import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';
import validator from 'validator';

// ========================================
// CONSTANTS
// ========================================

/**
 * Unicode ranges for emoji characters
 * Used for detecting and removing emoji from contact names
 */
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/ug;

// ========================================
// NAME CLEANING
// ========================================

/**
 * Detect if a string contains emoji characters
 */
export function detectEmoji(text: string): boolean {
  // Reset regex lastIndex to avoid state issues
  EMOJI_REGEX.lastIndex = 0;
  return EMOJI_REGEX.test(text);
}

/**
 * Clean a name by removing emojis, special characters, and extra whitespace
 */
export function cleanName(name: string, options: {
  removeEmojis?: boolean;
  removeSpecialChars?: boolean;
  trimSlashes?: boolean;
} = {}): { cleaned: string; issues: string[]; originalName?: string } {
  const {
    removeEmojis = true,
    removeSpecialChars = true,
    trimSlashes = true,
  } = options;

  const issues: string[] = [];
  let cleaned = name.trim();
  const originalName = name;

  // Detect and remove emoji
  if (removeEmojis && detectEmoji(cleaned)) {
    issues.push('emoji_in_name');
    EMOJI_REGEX.lastIndex = 0; // Reset regex state
    cleaned = cleaned.replace(EMOJI_REGEX, '');
  }

  // Remove leading slashes (e.g., "/ Campbell" -> "Campbell")
  if (trimSlashes) {
    const hadLeadingSlash = cleaned.startsWith('/');
    cleaned = cleaned.replace(/^\/+\s*/, '');
    if (hadLeadingSlash) {
      issues.push('leading_slash');
    }
  }

  // Remove special characters (except hyphens, apostrophes, spaces, and periods)
  if (removeSpecialChars) {
    const specialCharsRegex = /[^a-zA-Z0-9\s\-'\.]/g;
    if (specialCharsRegex.test(cleaned)) {
      issues.push('special_characters');
      cleaned = cleaned.replace(specialCharsRegex, '');
    }
  }

  // Normalize whitespace (multiple spaces -> single space)
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return {
    cleaned,
    issues,
    originalName: issues.length > 0 ? originalName : undefined,
  };
}

/**
 * Split a full name into first and last name
 */
export function splitFullName(fullName: string): { firstName: string; lastName: string; middleName?: string } {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  if (parts.length === 2) {
    return { firstName: parts[0], lastName: parts[1] };
  }

  // 3+ parts: first, middle(s), last
  const firstName = parts[0];
  const lastName = parts[parts.length - 1];
  const middleName = parts.slice(1, -1).join(' ');

  return { firstName, lastName, middleName };
}

// ========================================
// PHONE NUMBER HANDLING
// ========================================

/**
 * Split multiple phone numbers separated by " ::: "
 */
export function splitMultiplePhones(phoneString: string): string[] {
  return phoneString
    .split(':::')
    .map(p => p.trim())
    .filter(p => p.length > 0);
}

/**
 * Normalize phone number to E.164 format using libphonenumber-js
 */
export function normalizePhone(phone: string, defaultCountry: CountryCode = 'US'): {
  normalized: string | null;
  isValid: boolean;
  country?: string;
  error?: string;
} {
  try {
    // Remove all whitespace and special chars except + and digits
    const cleaned = phone.replace(/[^\d+]/g, '');

    if (!cleaned) {
      return { normalized: null, isValid: false, error: 'empty_phone' };
    }

    // Validate and parse
    if (!isValidPhoneNumber(cleaned, defaultCountry)) {
      return { normalized: null, isValid: false, error: 'invalid_format' };
    }

    const phoneNumber = parsePhoneNumber(cleaned, defaultCountry);

    return {
      normalized: phoneNumber.number,  // E.164 format
      isValid: true,
      country: phoneNumber.country,
    };
  } catch (error) {
    return {
      normalized: null,
      isValid: false,
      error: 'parse_error',
    };
  }
}

/**
 * Validate and normalize multiple phone numbers
 */
export function normalizeMultiplePhones(phoneString: string, defaultCountry: CountryCode = 'US'): Array<{
  number: string;
  label: 'mobile' | 'home' | 'work' | 'other';
  isPrimary: boolean;
  isValid: boolean;
  country?: string;
}> {
  const phones = splitMultiplePhones(phoneString);
  const normalized: any[] = [];

  phones.forEach((phone, index) => {
    const result = normalizePhone(phone, defaultCountry);
    if (result.normalized) {
      normalized.push({
        number: result.normalized,
        label: index === 0 ? 'mobile' : 'other',  // First phone is mobile by default
        isPrimary: index === 0,
        isValid: result.isValid,
        country: result.country,
      });
    }
  });

  return normalized;
}

// ========================================
// EMAIL HANDLING
// ========================================

/**
 * Split multiple emails separated by " ::: "
 */
export function splitMultipleEmails(emailString: string): string[] {
  return emailString
    .split(':::')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);
}

/**
 * Validate email address
 */
export function validateEmail(email: string): { isValid: boolean; normalized: string; error?: string } {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { isValid: false, normalized: '', error: 'empty_email' };
  }

  // Use validator library for email validation
  const isValid = validator.isEmail(trimmed);

  return {
    isValid,
    normalized: trimmed,
    error: isValid ? undefined : 'invalid_format',
  };
}

/**
 * Validate and normalize multiple emails
 */
export function normalizeMultipleEmails(emailString: string): Array<{
  address: string;
  label: 'personal' | 'work' | 'other';
  isPrimary: boolean;
  isValid: boolean;
}> {
  const emails = splitMultipleEmails(emailString);
  const normalized: any[] = [];

  emails.forEach((email, index) => {
    const result = validateEmail(email);
    if (result.isValid) {
      normalized.push({
        address: result.normalized,
        label: index === 0 ? 'personal' : 'other',  // First email is personal by default
        isPrimary: index === 0,
        isValid: result.isValid,
      });
    }
  });

  return normalized;
}

// ========================================
// JUNK DETECTION
// ========================================

/**
 * Detect if a contact entry is junk/spam/test data
 */
export function detectJunkEntry(contactData: {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}): { isJunk: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Test phone numbers
  if (contactData.phone) {
    const phone = contactData.phone.replace(/\D/g, '');
    if (
      phone.includes('555555') ||
      phone.includes('0000000') ||
      phone.includes('1111111') ||
      phone === '5555555555'
    ) {
      reasons.push('test_phone');
    }
  }

  // Test/spam names
  const fullName = `${contactData.firstName || ''} ${contactData.lastName || ''}`.toLowerCase();
  const junkNames = ['test', 'aaaaa', 'bbbbb', 'spam', 'do not call', 'delete'];
  if (junkNames.some(junk => fullName.includes(junk))) {
    reasons.push('test_name');
  }

  // Test emails
  if (contactData.email) {
    const email = contactData.email.toLowerCase();
    if (
      email.includes('test@') ||
      email.includes('@test.com') ||
      email.includes('@example.com') ||
      email.includes('noreply@')
    ) {
      reasons.push('test_email');
    }
  }

  // Repeated characters in name
  if (contactData.firstName && /(.)\1{4,}/.test(contactData.firstName)) {
    reasons.push('repeated_chars');
  }

  return {
    isJunk: reasons.length > 0,
    reasons,
  };
}

// ========================================
// DATA QUALITY SCORING
// ========================================

export interface ContactQualityMetrics {
  hasFirstName: boolean;
  hasLastName: boolean;
  hasPhone: boolean;
  hasValidPhone: boolean;
  hasEmail: boolean;
  hasValidEmail: boolean;
  hasAddress: boolean;
  hasEmoji: boolean;
  hasSpecialChars: boolean;
  isJunk: boolean;
  organizationOnly: boolean;
}

/**
 * Calculate contact data quality score (0-100)
 */
export function calculateQualityScore(metrics: ContactQualityMetrics): number {
  let score = 0;

  // Critical fields (50 points)
  if (metrics.hasFirstName) score += 15;
  if (metrics.hasLastName) score += 10;
  if (metrics.hasValidPhone) score += 25;  // Phone is most important

  // Important fields (30 points)
  if (metrics.hasValidEmail) score += 15;
  if (metrics.hasAddress) score += 15;

  // Quality penalties (20 points)
  if (metrics.hasEmoji) score -= 10;
  if (metrics.hasSpecialChars) score -= 5;
  if (metrics.isJunk) score -= 20;
  if (metrics.organizationOnly) score -= 10;

  // Ensure score is between 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Analyze contact data and generate quality metrics
 */
export function analyzeContactQuality(contactData: {
  firstName?: string;
  lastName?: string;
  organization?: string;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}): {
  score: number;
  metrics: ContactQualityMetrics;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Analyze name
  const hasFirstName = !!(contactData.firstName && contactData.firstName.trim().length > 0);
  const hasLastName = !!(contactData.lastName && contactData.lastName.trim().length > 0);
  const hasEmoji = detectEmoji(`${contactData.firstName || ''} ${contactData.lastName || ''}`);
  const specialCharsRegex = /[^a-zA-Z0-9\s\-'\.]/;
  const hasSpecialChars = specialCharsRegex.test(`${contactData.firstName || ''} ${contactData.lastName || ''}`);

  // Organization-only check
  const organizationOnly = !hasFirstName && !hasLastName && !!contactData.organization;

  // Analyze phone
  const hasPhone = !!(contactData.phone && contactData.phone.trim().length > 0);
  let hasValidPhone = false;
  if (hasPhone) {
    const phoneResult = normalizePhone(contactData.phone || '');
    hasValidPhone = phoneResult.isValid;
    if (!hasValidPhone) {
      issues.push('invalid_phone');
      recommendations.push('Fix phone number format');
    }
  } else {
    issues.push('no_phone');
    recommendations.push('Add phone number');
  }

  // Analyze email
  const hasEmail = !!(contactData.email && contactData.email.trim().length > 0);
  let hasValidEmail = false;
  if (hasEmail) {
    const emailResult = validateEmail(contactData.email || '');
    hasValidEmail = emailResult.isValid;
    if (!hasValidEmail) {
      issues.push('invalid_email');
      recommendations.push('Fix email format');
    }
  }

  // Analyze address
  const hasAddress = !!(
    contactData.address?.street ||
    contactData.address?.city ||
    contactData.address?.state ||
    contactData.address?.zip
  );

  // Junk detection
  const junkResult = detectJunkEntry(contactData);
  const isJunk = junkResult.isJunk;

  // Additional issues
  if (!hasFirstName && !hasLastName) issues.push('no_name');
  if (hasEmoji) {
    issues.push('emoji_in_name');
    recommendations.push('Remove emoji from name');
  }
  if (hasSpecialChars) {
    issues.push('special_characters');
    recommendations.push('Clean special characters from name');
  }
  if (organizationOnly) {
    issues.push('organization_only');
    recommendations.push('Add contact person name');
  }
  if (isJunk) {
    issues.push('junk_entry');
    recommendations.push('Remove test/spam entry');
  }

  // Build metrics
  const metrics: ContactQualityMetrics = {
    hasFirstName,
    hasLastName,
    hasPhone,
    hasValidPhone,
    hasEmail,
    hasValidEmail,
    hasAddress,
    hasEmoji,
    hasSpecialChars,
    isJunk,
    organizationOnly,
  };

  // Calculate score
  const score = calculateQualityScore(metrics);

  return {
    score,
    metrics,
    issues,
    recommendations,
  };
}

// ========================================
// DUPLICATE DETECTION
// ========================================

/**
 * Generate normalized hash for duplicate detection
 */
export function generateContactHash(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Take last 10 digits (handles +1 country code)
  const last10 = cleaned.slice(-10);

  return last10;
}

/**
 * Compare two contacts for potential duplicates
 */
export function arePotentialDuplicates(
  contact1: { phone?: string; email?: string; firstName?: string; lastName?: string },
  contact2: { phone?: string; email?: string; firstName?: string; lastName?: string }
): { isDuplicate: boolean; matchedOn: string[] } {
  const matchedOn: string[] = [];

  // Phone match (strongest signal)
  if (contact1.phone && contact2.phone) {
    const hash1 = generateContactHash(contact1.phone);
    const hash2 = generateContactHash(contact2.phone);
    if (hash1 === hash2) {
      matchedOn.push('phone');
    }
  }

  // Email match
  if (contact1.email && contact2.email) {
    if (contact1.email.toLowerCase().trim() === contact2.email.toLowerCase().trim()) {
      matchedOn.push('email');
    }
  }

  // Name match (weak signal, only if both phone and email don't match)
  if (matchedOn.length === 0 && contact1.firstName && contact2.firstName && contact1.lastName && contact2.lastName) {
    const name1 = `${contact1.firstName} ${contact1.lastName}`.toLowerCase().trim();
    const name2 = `${contact2.firstName} ${contact2.lastName}`.toLowerCase().trim();
    if (name1 === name2) {
      matchedOn.push('name');
    }
  }

  return {
    isDuplicate: matchedOn.length > 0,
    matchedOn,
  };
}
