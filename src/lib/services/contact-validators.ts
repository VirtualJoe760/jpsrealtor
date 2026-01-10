/**
 * Contact Validation Rules System
 *
 * Provides reusable, configuration-based validation rules for contact data.
 * These can be enabled/disabled via LLM tool parameters without code changes.
 *
 * Architecture: LLM decides WHICH rules to apply, this code EXECUTES them.
 */

export interface ValidationRule {
  name: string;
  description: string;
  check: (contact: any) => boolean;
  message: (contact: any) => string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  ruleName: string;
  message: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// VALIDATION RULES REGISTRY
// ============================================================================

export const VALIDATION_RULES: Record<string, ValidationRule> = {
  /**
   * Ensures email is from allowed domains
   * Useful for filtering out spam or unwanted providers
   */
  'email_domain_whitelist': {
    name: 'Email Domain Whitelist',
    description: 'Email must be from allowed domains (gmail, yahoo, outlook, etc.)',
    check: (contact) => {
      const email = contact.email || '';
      if (!email) return true; // Skip if no email
      return /@(gmail|yahoo|outlook|hotmail|icloud|aol)\.com$/i.test(email);
    },
    message: (contact) => `Email domain not in whitelist: ${contact.email}`,
    severity: 'warning',
  },

  /**
   * Flags common test/fake phone numbers
   * 555-xxxx-xxxx patterns are reserved for media/testing
   */
  'phone_not_test_number': {
    name: 'Test Phone Number Check',
    description: 'Flags phone numbers that appear to be test numbers (555-xxx-xxxx)',
    check: (contact) => {
      const phone = contact._cleanedPhone || '';
      if (!phone) return true;
      // Flag 555 exchange (test numbers)
      return !/^(\+1)?555/.test(phone) && !phone.includes('(555)');
    },
    message: (contact) => `Possible test phone number detected: ${contact._cleanedPhone}`,
    severity: 'warning',
  },

  /**
   * Ensures contact has at least one contact method
   */
  'has_contact_method': {
    name: 'Has Contact Method',
    description: 'Contact must have either phone or email',
    check: (contact) => {
      const hasPhone = !!(contact._cleanedPhone || contact.phone);
      const hasEmail = !!(contact.email);
      return hasPhone || hasEmail;
    },
    message: () => 'Contact has neither phone nor email',
    severity: 'error',
  },

  /**
   * Validates email format
   */
  'valid_email_format': {
    name: 'Valid Email Format',
    description: 'Email must be valid format if provided',
    check: (contact) => {
      const email = contact.email || '';
      if (!email) return true; // Skip if no email
      // Simple email regex
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },
    message: (contact) => `Invalid email format: ${contact.email}`,
    severity: 'error',
  },

  /**
   * Checks for complete name (both first and last)
   */
  'has_complete_name': {
    name: 'Complete Name',
    description: 'Contact must have both first and last name',
    check: (contact) => {
      const hasFirst = !!(contact.firstName || contact.first_name || contact['First Name']);
      const hasLast = !!(contact.lastName || contact.last_name || contact['Last Name']);
      return hasFirst && hasLast;
    },
    message: () => 'Missing first or last name',
    severity: 'warning',
  },

  /**
   * Validates US ZIP code format
   */
  'valid_us_zip': {
    name: 'Valid US ZIP Code',
    description: 'ZIP code must be valid 5-digit or ZIP+4 format',
    check: (contact) => {
      const zip = contact.zip || contact.zipCode || contact.ZIP || contact['Zip Code'] || '';
      if (!zip) return true; // Skip if no ZIP
      // Accept 5-digit or ZIP+4 format
      return /^\d{5}(-\d{4})?$/.test(zip);
    },
    message: (contact) => {
      const zip = contact.zip || contact.zipCode || contact.ZIP || contact['Zip Code'];
      return `Invalid ZIP code format: ${zip}`;
    },
    severity: 'warning',
  },

  /**
   * Checks for DNC (Do Not Call) indicators in notes/labels
   */
  'not_on_dnc': {
    name: 'Not on DNC List',
    description: 'Contact should not have DNC/Do Not Call indicators',
    check: (contact) => {
      const notes = (contact.notes || '').toLowerCase();
      const labels = (contact.labels || '').toLowerCase();
      const dncIndicators = ['dnc', 'do not call', 'do not contact', 'unsubscribe'];
      return !dncIndicators.some(indicator => notes.includes(indicator) || labels.includes(indicator));
    },
    message: () => 'Contact has DNC (Do Not Call) indicator',
    severity: 'error',
  },

  /**
   * Flags contacts with very short names (possible spam/incomplete)
   */
  'name_min_length': {
    name: 'Minimum Name Length',
    description: 'First and last names should be at least 2 characters',
    check: (contact) => {
      const firstName = contact.firstName || contact.first_name || contact['First Name'] || '';
      const lastName = contact.lastName || contact.last_name || contact['Last Name'] || '';

      if (!firstName && !lastName) return true; // Skip if no name

      const firstValid = !firstName || firstName.trim().length >= 2;
      const lastValid = !lastName || lastName.trim().length >= 2;

      return firstValid && lastValid;
    },
    message: (contact) => {
      const firstName = contact.firstName || contact.first_name || contact['First Name'] || '';
      const lastName = contact.lastName || contact.last_name || contact['Last Name'] || '';
      return `Name too short: "${firstName} ${lastName}"`;
    },
    severity: 'warning',
  },

  /**
   * Detects emoji or special characters in names
   */
  'no_emoji_in_name': {
    name: 'No Emoji in Name',
    description: 'Names should not contain emoji or special unicode characters',
    check: (contact) => {
      const firstName = contact.firstName || contact.first_name || contact['First Name'] || '';
      const lastName = contact.lastName || contact.last_name || contact['Last Name'] || '';
      const name = `${firstName} ${lastName}`;

      // Emoji regex pattern
      const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

      return !emojiRegex.test(name);
    },
    message: (contact) => {
      const firstName = contact.firstName || contact.first_name || contact['First Name'] || '';
      const lastName = contact.lastName || contact.last_name || contact['Last Name'] || '';
      return `Emoji detected in name: "${firstName} ${lastName}"`;
    },
    severity: 'warning',
  },

  /**
   * Checks for US state code validity
   */
  'valid_us_state': {
    name: 'Valid US State',
    description: 'State must be valid 2-letter US state code',
    check: (contact) => {
      const state = (contact.state || contact.State || '').trim().toUpperCase();
      if (!state) return true; // Skip if no state

      const validStates = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
        'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
      ];

      return validStates.includes(state);
    },
    message: (contact) => {
      const state = contact.state || contact.State || '';
      return `Invalid US state code: ${state}`;
    },
    severity: 'warning',
  },
};

// ============================================================================
// VALIDATION EXECUTION
// ============================================================================

/**
 * Validate a single contact against specified rules
 *
 * @param contact - Contact object to validate
 * @param ruleNames - Array of rule names to apply
 * @returns Array of validation results (only failures)
 */
export function validateContact(contact: any, ruleNames: string[]): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const ruleName of ruleNames) {
    const rule = VALIDATION_RULES[ruleName];

    if (!rule) {
      console.warn(`Unknown validation rule: ${ruleName}`);
      continue;
    }

    // Execute the rule check
    const passed = rule.check(contact);

    if (!passed) {
      results.push({
        valid: false,
        ruleName,
        message: rule.message(contact),
        severity: rule.severity,
      });
    }
  }

  return results;
}

/**
 * Get list of all available validation rules with metadata
 * Useful for LLM to understand what rules are available
 */
export function getAvailableRules(): Array<{
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning';
}> {
  return Object.entries(VALIDATION_RULES).map(([id, rule]) => ({
    id,
    name: rule.name,
    description: rule.description,
    severity: rule.severity,
  }));
}

/**
 * Filter contacts by validation results
 *
 * @param contacts - Array of contacts
 * @param ruleNames - Rules to apply
 * @param strictMode - If true, contacts with ANY error are filtered out
 * @returns Filtered contacts and statistics
 */
export function filterByValidation(
  contacts: any[],
  ruleNames: string[],
  strictMode: boolean = false
): {
  validContacts: any[];
  invalidContacts: any[];
  statistics: {
    total: number;
    valid: number;
    invalid: number;
    errorCount: number;
    warningCount: number;
  };
} {
  const validContacts: any[] = [];
  const invalidContacts: any[] = [];
  let errorCount = 0;
  let warningCount = 0;

  for (const contact of contacts) {
    const validationResults = validateContact(contact, ruleNames);

    const hasErrors = validationResults.some(r => r.severity === 'error');
    const hasWarnings = validationResults.some(r => r.severity === 'warning');

    if (hasErrors) errorCount++;
    if (hasWarnings) warningCount++;

    // Attach validation results to contact
    contact._validationResults = validationResults;

    // Filter based on strictMode
    if (strictMode && validationResults.length > 0) {
      invalidContacts.push(contact);
    } else if (!strictMode && hasErrors) {
      invalidContacts.push(contact);
    } else {
      validContacts.push(contact);
    }
  }

  return {
    validContacts,
    invalidContacts,
    statistics: {
      total: contacts.length,
      valid: validContacts.length,
      invalid: invalidContacts.length,
      errorCount,
      warningCount,
    },
  };
}
