/**
 * Column Detection Service
 *
 * Intelligent column detection for CSV/Excel imports with:
 * - Fuzzy matching on column names
 * - Content-based pattern detection
 * - Provider-specific templates
 * - Confidence scoring
 */

import { compareTwoStrings } from 'string-similarity';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import * as EmailValidator from 'email-validator';

// Target field types
export type TargetField =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'phone'
  | 'email'
  | 'address.street'
  | 'address.city'
  | 'address.state'
  | 'address.zip'
  | 'address.country'
  | 'organization'
  | 'jobTitle'
  | 'website'
  | 'birthday'
  | 'notes'
  | 'photo'
  | 'ignore';

// Pattern types for content detection
export type PatternType = 'name' | 'phone' | 'email' | 'address' | 'url' | 'date' | 'unknown';

// Column mapping result
export interface ColumnMapping {
  csvColumn: string;
  suggestedField: TargetField;
  confidence: number; // 0-1
  pattern: PatternType;
  sampleData: string[];
  alternativeMatches?: {
    field: TargetField;
    confidence: number;
  }[];
}

// Provider templates
export type Provider = 'google_contacts' | 'mojo_dialer' | 'title_rep' | 'outlook' | 'custom';

// Known column name variations for each field
const FIELD_VARIATIONS: Record<TargetField, string[]> = {
  firstName: [
    'first name',
    'first_name',
    'firstname',
    'fname',
    'given name',
    'given_name',
    'givenname',
    'contact first name',
    'first',
  ],
  lastName: [
    'last name',
    'last_name',
    'lastname',
    'lname',
    'surname',
    'family name',
    'family_name',
    'familyname',
    'contact last name',
    'last',
  ],
  fullName: [
    'full name',
    'full_name',
    'fullname',
    'name',
    'contact name',
    'contact_name',
    'contactname',
    'owner name',
    'owner',
    'property owner',
  ],
  phone: [
    'phone',
    'phone number',
    'phone_number',
    'phonenumber',
    'telephone',
    'tel',
    'mobile',
    'cell',
    'cell phone',
    'phone 1',
    'phone 2',
    'phone1',
    'phone2',
    'primary phone',
    'home phone',
    'work phone',
  ],
  email: [
    'email',
    'e-mail',
    'email address',
    'email_address',
    'emailaddress',
    'e-mail address',
    'contact email',
    'email 1',
    'email1',
    'primary email',
  ],
  'address.street': [
    'address',
    'street',
    'street address',
    'street_address',
    'address line 1',
    'address1',
    'property address',
    'mailing address',
    'physical address',
  ],
  'address.city': [
    'city',
    'town',
    'municipality',
  ],
  'address.state': [
    'state',
    'province',
    'region',
    'state/province',
  ],
  'address.zip': [
    'zip',
    'zip code',
    'zipcode',
    'postal code',
    'postalcode',
    'postcode',
  ],
  'address.country': [
    'country',
  ],
  organization: [
    'organization',
    'organisation',
    'company',
    'company name',
    'business',
    'employer',
  ],
  jobTitle: [
    'job title',
    'title',
    'position',
    'role',
  ],
  website: [
    'website',
    'web site',
    'url',
    'homepage',
    'web address',
  ],
  birthday: [
    'birthday',
    'birth date',
    'birthdate',
    'date of birth',
    'dob',
  ],
  notes: [
    'notes',
    'comments',
    'description',
    'memo',
  ],
  photo: [
    'photo',
    'picture',
    'image',
    'avatar',
    'profile picture',
    'profile_picture',
  ],
  ignore: [],
};

// Regex patterns for content detection
const PATTERNS = {
  phone: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/,
  usAddress: /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way)/i,
  date: /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}$/,
  zipCode: /^\d{5}(?:-\d{4})?$/,
  name: /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/,
};

export class ColumnDetectionService {
  /**
   * Detect columns from CSV data
   */
  static detectColumns(
    headers: string[],
    rows: any[],
    provider?: Provider
  ): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];

    // Sample rows for content detection (first 10 rows)
    const sampleRows = rows.slice(0, Math.min(10, rows.length));

    for (const header of headers) {
      // Get sample data for this column
      const sampleData = sampleRows
        .map((row) => row[header])
        .filter((val) => val && val.toString().trim())
        .slice(0, 5);

      // 1. Try provider-specific template first
      let templateMatch: TargetField | null = null;
      if (provider && provider !== 'custom') {
        templateMatch = this.matchProviderTemplate(header, provider);
      }

      // 2. Fuzzy match column name
      const fuzzyMatch = this.fuzzyMatchColumnName(header);

      // 3. Content-based detection
      const contentMatch = this.detectByContent(sampleData);

      // 4. Combine results and choose best match
      const suggestedField = templateMatch || fuzzyMatch.field || contentMatch.field;
      const confidence = templateMatch
        ? 1.0
        : Math.max(fuzzyMatch.confidence, contentMatch.confidence);

      // 5. Get alternative matches
      const alternatives = this.getAlternativeMatches(header, sampleData);

      mappings.push({
        csvColumn: header,
        suggestedField,
        confidence,
        pattern: contentMatch.pattern,
        sampleData: sampleData.map((d) => d.toString()),
        alternativeMatches: alternatives,
      });
    }

    return mappings;
  }

  /**
   * Match against provider-specific template
   */
  private static matchProviderTemplate(
    columnName: string,
    provider: Provider
  ): TargetField | null {
    const templates: Record<Provider, Record<string, TargetField>> = {
      google_contacts: {
        'First Name': 'firstName',
        'Last Name': 'lastName',
        'Phone 1 - Value': 'phone',
        'E-mail 1 - Value': 'email',
        'E-mail 1 - Label': 'ignore',
        'E-mail 2 - Label': 'ignore',
        'Phone 1 - Label': 'ignore',
        'Address 1 - Label': 'ignore',
        'Address 1 - Street': 'address.street',
        'Address 1 - City': 'address.city',
        'Address 1 - Region': 'address.state',
        'Address 1 - Postal Code': 'address.zip',
        'Address 1 - Country': 'address.country',
        'Address 1 - Formatted': 'ignore',
        'Address 1 - PO Box': 'ignore',
        'Address 1 - Extended Address': 'ignore',
        'Organization Name': 'organization',
        'Organization Title': 'jobTitle',
        'Website 1 - Value': 'website',
        'Birthday': 'birthday',
        'Notes': 'notes',
        'Labels': 'ignore',
        'Photo': 'photo',
      },
      mojo_dialer: {
        first_name: 'firstName',
        last_name: 'lastName',
        phone: 'phone',
        email: 'email',
        address: 'address.street',
        city: 'address.city',
        state: 'address.state',
        zip: 'address.zip',
      },
      title_rep: {
        'Owner Name': 'fullName',
        'Property Owner': 'fullName',
        'Property Address': 'address.street',
        City: 'address.city',
        State: 'address.state',
        ZIP: 'address.zip',
        Phone: 'phone',
        Email: 'email',
      },
      outlook: {
        'First Name': 'firstName',
        'Last Name': 'lastName',
        'E-mail Address': 'email',
        'Business Phone': 'phone',
        'Home Phone': 'phone',
        'Mobile Phone': 'phone',
        'Business Street': 'address.street',
        'Business City': 'address.city',
        'Business State': 'address.state',
        'Business Postal Code': 'address.zip',
        'Company': 'organization',
        'Job Title': 'jobTitle',
        'Web Page': 'website',
        'Birthday': 'birthday',
        'Notes': 'notes',
      },
      custom: {},
    };

    return templates[provider]?.[columnName] || null;
  }

  /**
   * Fuzzy match column name against known variations
   */
  private static fuzzyMatchColumnName(columnName: string): {
    field: TargetField;
    confidence: number;
  } {
    const normalized = columnName.toLowerCase().trim();
    let bestMatch: TargetField = 'ignore';
    let bestScore = 0;

    // Try exact match first
    for (const [field, variations] of Object.entries(FIELD_VARIATIONS)) {
      for (const variation of variations) {
        if (normalized === variation.toLowerCase()) {
          return {
            field: field as TargetField,
            confidence: 1.0,
          };
        }
      }
    }

    // Try fuzzy matching
    for (const [field, variations] of Object.entries(FIELD_VARIATIONS)) {
      for (const variation of variations) {
        const similarity = compareTwoStrings(normalized, variation.toLowerCase());
        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = field as TargetField;
        }
      }
    }

    // Threshold: Only suggest if confidence > 0.7
    if (bestScore < 0.7) {
      return { field: 'ignore', confidence: 0 };
    }

    return {
      field: bestMatch,
      confidence: bestScore,
    };
  }

  /**
   * Detect field type by analyzing content
   */
  private static detectByContent(sampleData: string[]): {
    field: TargetField;
    pattern: PatternType;
    confidence: number;
  } {
    if (sampleData.length === 0) {
      return { field: 'ignore', pattern: 'unknown', confidence: 0 };
    }

    // Count how many samples match each pattern
    const phoneMatches = sampleData.filter((d) => {
      try {
        return isValidPhoneNumber(d, 'US');
      } catch {
        return PATTERNS.phone.test(d);
      }
    }).length;

    const emailMatches = sampleData.filter((d) => EmailValidator.validate(d)).length;

    const urlMatches = sampleData.filter((d) => PATTERNS.url.test(d)).length;

    const addressMatches = sampleData.filter((d) => PATTERNS.usAddress.test(d)).length;

    const zipMatches = sampleData.filter((d) => PATTERNS.zipCode.test(d)).length;

    const dateMatches = sampleData.filter((d) => PATTERNS.date.test(d)).length;

    const nameMatches = sampleData.filter((d) => PATTERNS.name.test(d)).length;

    const total = sampleData.length;

    // Phone: 80%+ match
    if (phoneMatches / total >= 0.8) {
      return { field: 'phone', pattern: 'phone', confidence: phoneMatches / total };
    }

    // Email: 80%+ match
    if (emailMatches / total >= 0.8) {
      return { field: 'email', pattern: 'email', confidence: emailMatches / total };
    }

    // Website: 80%+ match
    if (urlMatches / total >= 0.8) {
      return { field: 'website', pattern: 'url', confidence: urlMatches / total };
    }

    // Address: 60%+ match
    if (addressMatches / total >= 0.6) {
      return {
        field: 'address.street',
        pattern: 'address',
        confidence: addressMatches / total,
      };
    }

    // Zip: 80%+ match
    if (zipMatches / total >= 0.8) {
      return { field: 'address.zip', pattern: 'address', confidence: zipMatches / total };
    }

    // Birthday: 70%+ match
    if (dateMatches / total >= 0.7) {
      return { field: 'birthday', pattern: 'date', confidence: dateMatches / total };
    }

    // Name: 60%+ match
    if (nameMatches / total >= 0.6) {
      return { field: 'fullName', pattern: 'name', confidence: nameMatches / total };
    }

    return { field: 'ignore', pattern: 'unknown', confidence: 0 };
  }

  /**
   * Get alternative field matches
   */
  private static getAlternativeMatches(
    columnName: string,
    sampleData: string[]
  ): { field: TargetField; confidence: number }[] {
    const normalized = columnName.toLowerCase().trim();
    const alternatives: { field: TargetField; confidence: number }[] = [];

    // Get fuzzy matches above threshold
    for (const [field, variations] of Object.entries(FIELD_VARIATIONS)) {
      for (const variation of variations) {
        const similarity = compareTwoStrings(normalized, variation.toLowerCase());
        if (similarity >= 0.5 && similarity < 1.0) {
          // Don't include exact matches
          alternatives.push({
            field: field as TargetField,
            confidence: similarity,
          });
        }
      }
    }

    // Sort by confidence and take top 3
    return alternatives
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Validate phone number format
   */
  static validatePhone(phone: string): boolean {
    try {
      return isValidPhoneNumber(phone, 'US');
    } catch {
      return false;
    }
  }

  /**
   * Format phone number to E.164
   */
  static formatPhone(phone: string, countryCode: 'US' | 'CA' | 'GB' = 'US'): string | null {
    try {
      const parsed = parsePhoneNumber(phone, countryCode as any);
      return parsed ? parsed.format('E.164') : null;
    } catch {
      return null;
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    return EmailValidator.validate(email);
  }

  /**
   * Detect provider based on column headers
   */
  static detectProvider(headers: string[]): Provider | null {
    const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));

    // Google Contacts has distinctive columns
    if (
      headerSet.has('phone 1 - value') ||
      headerSet.has('e-mail 1 - value') ||
      headerSet.has('given name') ||
      headerSet.has('family name')
    ) {
      return 'google_contacts';
    }

    // MOJO Dialer typically has these columns
    if (
      headerSet.has('owner1 first name') ||
      headerSet.has('owner1 last name') ||
      headerSet.has('property address')
    ) {
      return 'mojo_dialer';
    }

    // Title Rep typically has these columns
    if (
      headerSet.has('owner name') ||
      headerSet.has('property zip')
    ) {
      return 'title_rep';
    }

    // Outlook typically has these columns
    if (
      headerSet.has('business phone') ||
      headerSet.has('home phone') ||
      headerSet.has('mobile phone')
    ) {
      return 'outlook';
    }

    return null;
  }
}
