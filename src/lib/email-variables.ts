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
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    fullAddress?: string;
  };
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
      const address = data.contact.address;
      const fullAddress = address
        ? [address.street, address.city, address.state, address.zip]
            .filter(Boolean)
            .join(', ')
        : undefined;

      return {
        firstName: data.contact.firstName,
        lastName: data.contact.lastName,
        fullName: data.contact.firstName && data.contact.lastName
          ? `${data.contact.firstName} ${data.contact.lastName}`
          : data.contact.firstName || data.contact.lastName || null,
        email: data.contact.email,
        address: address ? {
          street: address.street,
          city: address.city,
          state: address.state,
          zip: address.zip,
          fullAddress
        } : undefined
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
 * - {street}
 * - {city}
 * - {state}
 * - {zip}
 * - {address} (full formatted address)
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
    result = result.replace(/\{street\}/gi, '');
    result = result.replace(/\{city\}/gi, '');
    result = result.replace(/\{state\}/gi, '');
    result = result.replace(/\{zip\}/gi, '');
    result = result.replace(/\{address\}/gi, '');

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

  // Replace address variables
  if (contactData.address) {
    if (contactData.address.street) {
      result = result.replace(/\{street\}/gi, contactData.address.street);
    } else {
      result = result.replace(/\{street\}/gi, '');
    }

    if (contactData.address.city) {
      result = result.replace(/\{city\}/gi, contactData.address.city);
    } else {
      result = result.replace(/\{city\}/gi, '');
    }

    if (contactData.address.state) {
      result = result.replace(/\{state\}/gi, contactData.address.state);
    } else {
      result = result.replace(/\{state\}/gi, '');
    }

    if (contactData.address.zip) {
      result = result.replace(/\{zip\}/gi, contactData.address.zip);
    } else {
      result = result.replace(/\{zip\}/gi, '');
    }

    if (contactData.address.fullAddress) {
      result = result.replace(/\{address\}/gi, contactData.address.fullAddress);
    } else {
      result = result.replace(/\{address\}/gi, '');
    }
  } else {
    // Remove all address variables if no address data
    result = result.replace(/\{street\}/gi, '');
    result = result.replace(/\{city\}/gi, '');
    result = result.replace(/\{state\}/gi, '');
    result = result.replace(/\{zip\}/gi, '');
    result = result.replace(/\{address\}/gi, '');
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
