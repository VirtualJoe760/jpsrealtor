/**
 * Phone Number Formatting Utility
 *
 * Formats phone numbers to E.164 format for Twilio (US/Canada: +1XXXXXXXXXX)
 */

/**
 * Format a phone number to E.164 format (+1XXXXXXXXXX)
 * Handles various input formats and ensures +1 prefix for US/Canada
 *
 * @param input - Raw phone number input
 * @returns Formatted phone number in E.164 format (+1XXXXXXXXXX)
 */
export function formatPhoneToE164(input: string): string {
  // Remove all non-digit characters
  let digits = input.replace(/\D/g, '');

  // If starts with 1, keep it; otherwise prepend 1
  if (digits.startsWith('1')) {
    digits = digits.slice(0, 11); // Max 11 digits (1 + 10 digit number)
  } else {
    digits = '1' + digits.slice(0, 10); // Prepend 1 and limit to 10 digits
  }

  // Add + prefix
  return '+' + digits;
}

/**
 * Format phone number for display (friendly format)
 * Converts +17603977807 to +1 (760) 397-7807
 *
 * @param e164 - Phone number in E.164 format
 * @returns Formatted phone number for display
 */
export function formatPhoneForDisplay(e164: string): string {
  if (!e164) return '';

  // Remove + and extract digits
  const digits = e164.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('1')) {
    // Format as +1 (XXX) XXX-XXXX
    const areaCode = digits.slice(1, 4);
    const prefix = digits.slice(4, 7);
    const lineNumber = digits.slice(7, 11);
    return `+1 (${areaCode}) ${prefix}-${lineNumber}`;
  }

  // Return as-is if not standard format
  return e164;
}

/**
 * Handle phone input change with automatic E.164 formatting
 * Use this in onChange handlers for phone inputs
 *
 * @param rawInput - Raw user input
 * @returns Formatted phone number (+1XXXXXXXXXX)
 */
export function handlePhoneInput(rawInput: string): string {
  // Remove all non-digit characters except + at the start
  let cleaned = rawInput.replace(/[^\d+]/g, '');

  // If user types +1, just use the digits after
  if (cleaned.startsWith('+1')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // Remove leading 1 if present (we'll add it back)
  if (cleaned.startsWith('1')) {
    cleaned = cleaned.slice(1);
  }

  // Limit to 10 digits (US/Canada phone number length)
  cleaned = cleaned.slice(0, 10);

  // Build E.164 format
  if (cleaned.length > 0) {
    return '+1' + cleaned;
  }

  return '';
}

/**
 * Validate if a phone number is in valid E.164 format for US/Canada
 *
 * @param phone - Phone number to validate
 * @returns true if valid E.164 format
 */
export function isValidE164Phone(phone: string): boolean {
  // US/Canada E.164: +1 followed by 10 digits
  const e164Regex = /^\+1\d{10}$/;
  return e164Regex.test(phone);
}
