// src/lib/format-input.ts
//
// Lightweight as-you-type formatters and constants for intake forms.
// No third-party deps. Keep these pure.

/**
 * Strip everything but digits.
 */
export function digitsOnly(str: string): string {
  return (str || "").replace(/\D/g, "");
}

/**
 * Format a US phone number progressively as the user types.
 *
 *  ""           → ""
 *  "8"          → "(8"
 *  "888"        → "(888) "
 *  "8885"       → "(888) 5"
 *  "8885555"    → "(888) 555-5"
 *  "8885555555" → "(888) 555-5555"
 *
 * If the user types more than 10 digits, the leading digit is treated as the
 * country code and the result becomes "+1 (888) 555-5555".
 */
export function formatPhone(input: string): string {
  const d = digitsOnly(input);
  if (d.length === 0) return "";

  // 11 digits → assume leading 1 is country code
  if (d.length === 11 && d.startsWith("1")) {
    const rest = d.slice(1);
    return `+1 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 10)}`;
  }
  if (d.length > 10) {
    const cc = d.slice(0, d.length - 10);
    const rest = d.slice(-10);
    return `+${cc} (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
  }

  // Up to 10 digits → progressive build
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

/**
 * Convert a formatted phone string back to E.164 (assumes US if no country
 * code present). Returns "" for empty input, or undefined if not enough
 * digits to be a real number.
 */
export function toE164US(input: string): string | undefined {
  const d = digitsOnly(input);
  if (d.length === 0) return undefined;
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (d.length > 11) return `+${d}`;
  return undefined;
}

/**
 * Format a number as a USD price with comma separators and a leading $.
 *
 *  ""        → ""
 *  "5"       → "$5"
 *  "500"     → "$500"
 *  "500000"  → "$500,000"
 *  "1500000" → "$1,500,000"
 */
export function formatPrice(input: string): string {
  const d = digitsOnly(input);
  if (d.length === 0) return "";
  return `$${Number(d).toLocaleString("en-US")}`;
}

/**
 * Convert a formatted price back to a plain number (or undefined if empty).
 */
export function parsePrice(input: string): number | undefined {
  const d = digitsOnly(input);
  if (d.length === 0) return undefined;
  return Number(d);
}

/**
 * US states for the dropdown. Two-letter codes + names.
 */
export const US_STATES: Array<{ code: string; name: string }> = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
];

/**
 * Format a 5- or 9-digit ZIP code as the user types.
 */
export function formatZip(input: string): string {
  const d = digitsOnly(input).slice(0, 9);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
