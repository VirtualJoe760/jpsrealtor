/**
 * Email Variable Replacement Utility
 *
 * Replaces variables like {first-name}, {last-name}, {full-name} with actual contact data
 */

interface ContactData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
}

/**
 * Fetch contact data by email address
 */
export async function fetchContactByEmail(email: string): Promise<ContactData | null> {
  try {
    const response = await fetch(`/api/contacts/find-by-email?email=${encodeURIComponent(email)}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.contact) {
      return {
        firstName: data.contact.firstName,
        lastName: data.contact.lastName,
        fullName: data.contact.firstName && data.contact.lastName
          ? `${data.contact.firstName} ${data.contact.lastName}`
          : data.contact.firstName || data.contact.lastName || null,
        email: data.contact.email
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching contact:', error);
    return null;
  }
}

/**
 * Replace variables in text with contact data
 *
 * Supported variables:
 * - {first-name} or {firstName}
 * - {last-name} or {lastName}
 * - {full-name} or {fullName}
 *
 * If contact data is not available, the variable is removed (replaced with empty string)
 */
export function replaceEmailVariables(text: string, contactData: ContactData | null): string {
  if (!text) return text;

  let result = text;

  // If no contact data, remove all variables
  if (!contactData) {
    result = result.replace(/\{first-?name\}/gi, '');
    result = result.replace(/\{last-?name\}/gi, '');
    result = result.replace(/\{full-?name\}/gi, '');

    // Clean up any double spaces or "Hi ," patterns
    result = result.replace(/Hi\s*,/gi, 'Hello,');
    result = result.replace(/\s{2,}/g, ' ');

    return result.trim();
  }

  // Replace first name
  if (contactData.firstName) {
    result = result.replace(/\{first-?name\}/gi, contactData.firstName);
  } else {
    result = result.replace(/\{first-?name\}/gi, '');
  }

  // Replace last name
  if (contactData.lastName) {
    result = result.replace(/\{last-?name\}/gi, contactData.lastName);
  } else {
    result = result.replace(/\{last-?name\}/gi, '');
  }

  // Replace full name
  if (contactData.fullName) {
    result = result.replace(/\{full-?name\}/gi, contactData.fullName);
  } else {
    result = result.replace(/\{full-?name\}/gi, '');
  }

  // Clean up any "Hi ," patterns if name was missing
  result = result.replace(/Hi\s*,/gi, 'Hello,');
  result = result.replace(/\s{2,}/g, ' ');

  return result.trim();
}

/**
 * Process email content before sending - replaces all variables
 */
export async function processEmailContent(
  subject: string,
  body: string,
  recipientEmail: string
): Promise<{ subject: string; body: string }> {
  // Fetch contact data
  const contactData = await fetchContactByEmail(recipientEmail);

  // Replace variables in both subject and body
  const processedSubject = replaceEmailVariables(subject, contactData);
  const processedBody = replaceEmailVariables(body, contactData);

  return {
    subject: processedSubject,
    body: processedBody
  };
}
