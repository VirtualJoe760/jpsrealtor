/**
 * Twilio Service
 *
 * Utility functions for sending SMS messages via Twilio.
 */

import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error('[Twilio] Missing environment variables. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
}

const client = twilio(accountSid, authToken);

// ============================================================================
// TYPES
// ============================================================================

export interface SendSMSParams {
  to: string;           // Recipient phone number (E.164 format)
  body: string;         // Message content
  from?: string;        // Sender phone number (defaults to env var)
  mediaUrl?: string[];  // Optional MMS media URLs
  statusCallback?: string;  // Webhook URL for status updates
}

export interface TwilioSMSResponse {
  success: boolean;
  messageSid?: string;
  status?: string;
  error?: string;
  message?: string;
}

// ============================================================================
// SEND SMS
// ============================================================================

/**
 * Send SMS message via Twilio
 *
 * @param params - SMS parameters
 * @returns Promise with Twilio response
 *
 * @example
 * const result = await sendSMS({
 *   to: '+17605551234',
 *   body: 'Hello from JPSRealtor!'
 * });
 */
export async function sendSMS(params: SendSMSParams): Promise<TwilioSMSResponse> {
  try {
    // Validate environment variables
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      return {
        success: false,
        error: 'Twilio not configured. Missing environment variables.',
      };
    }

    // Validate phone number format (basic check)
    if (!params.to.startsWith('+')) {
      return {
        success: false,
        error: 'Phone number must be in E.164 format (e.g., +17605551234)',
      };
    }

    // Send message
    const message = await client.messages.create({
      body: params.body,
      from: params.from || twilioPhoneNumber,
      to: params.to,
      mediaUrl: params.mediaUrl,
      statusCallback: params.statusCallback,
    });

    console.log(`[Twilio] SMS sent successfully: ${message.sid}`);

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
      message: 'SMS sent successfully',
    };
  } catch (error: any) {
    console.error('[Twilio] Error sending SMS:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    };
  }
}

// ============================================================================
// SEND BULK SMS
// ============================================================================

/**
 * Send SMS to multiple recipients
 *
 * @param recipients - Array of phone numbers
 * @param body - Message content
 * @returns Array of results
 *
 * @example
 * const results = await sendBulkSMS(['+17605551234', '+17605555678'], 'New listing alert!');
 */
export async function sendBulkSMS(
  recipients: string[],
  body: string
): Promise<TwilioSMSResponse[]> {
  const results: TwilioSMSResponse[] = [];

  for (const to of recipients) {
    const result = await sendSMS({ to, body });
    results.push(result);

    // Add small delay to avoid rate limiting (adjust as needed)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return results;
}

// ============================================================================
// GET MESSAGE STATUS
// ============================================================================

/**
 * Get status of a sent message
 *
 * @param messageSid - Twilio message SID
 * @returns Message status
 */
export async function getMessageStatus(messageSid: string) {
  try {
    if (!accountSid || !authToken) {
      throw new Error('Twilio not configured');
    }

    const message = await client.messages(messageSid).fetch();

    return {
      success: true,
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage,
      dateSent: message.dateSent,
      price: message.price,
      priceUnit: message.priceUnit,
    };
  } catch (error: any) {
    console.error('[Twilio] Error fetching message status:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================================================
// VALIDATE PHONE NUMBER
// ============================================================================

/**
 * Validate and format phone number to E.164
 *
 * @param phone - Phone number in any format
 * @param countryCode - Default country code (default: US +1)
 * @returns Formatted phone number or null if invalid
 *
 * @example
 * formatPhoneNumber('760-555-1234') // Returns '+17605551234'
 * formatPhoneNumber('(760) 555-1234') // Returns '+17605551234'
 */
export function formatPhoneNumber(phone: string, countryCode: string = '1'): string | null {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If already has country code (11 digits for US)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If 10 digits (US number without country code)
  if (digits.length === 10) {
    return `+${countryCode}${digits}`;
  }

  // If already in E.164 format
  if (phone.startsWith('+') && digits.length >= 10) {
    return phone;
  }

  // Invalid
  return null;
}

// ============================================================================
// VALIDATE PHONE NUMBER WITH TWILIO LOOKUP
// ============================================================================

/**
 * Validate phone number using Twilio Lookup API
 * (Requires Twilio Lookup addon - costs $0.005/lookup)
 *
 * @param phoneNumber - Phone number to validate
 * @returns Validation result with carrier info
 */
export async function validatePhoneNumber(phoneNumber: string) {
  try {
    if (!accountSid || !authToken) {
      throw new Error('Twilio not configured');
    }

    const lookup = await client.lookups.v1.phoneNumbers(phoneNumber).fetch();

    return {
      success: true,
      phoneNumber: lookup.phoneNumber,
      countryCode: lookup.countryCode,
      nationalFormat: lookup.nationalFormat,
      valid: true,
    };
  } catch (error: any) {
    console.error('[Twilio] Phone validation error:', error);
    return {
      success: false,
      valid: false,
      error: error.message,
    };
  }
}

// ============================================================================
// GET MESSAGE HISTORY
// ============================================================================

/**
 * Fetch full message history (conversation) with a phone number
 * Gets both sent and received messages
 *
 * @param phoneNumber - Phone number to fetch conversation for
 * @param limit - Number of messages to fetch (default: 100)
 * @returns Array of messages
 */
export async function getMessageHistory(phoneNumber: string, limit: number = 100) {
  try {
    if (!accountSid || !authToken || !twilioPhoneNumber) {
      throw new Error('Twilio not configured');
    }

    console.log(`[Twilio] Fetching message history for: ${phoneNumber}`);

    // Fetch messages sent TO the phone number (outbound from us)
    const sentMessages = await client.messages.list({
      from: twilioPhoneNumber,
      to: phoneNumber,
      limit,
    });

    // Fetch messages received FROM the phone number (inbound to us)
    const receivedMessages = await client.messages.list({
      from: phoneNumber,
      to: twilioPhoneNumber,
      limit,
    });

    // Combine and sort by date
    const allMessages = [...sentMessages, ...receivedMessages]
      .sort((a, b) => {
        const dateA = a.dateSent || a.dateCreated;
        const dateB = b.dateSent || b.dateCreated;
        return dateA.getTime() - dateB.getTime();
      })
      .map((msg) => ({
        sid: msg.sid,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        status: msg.status,
        direction: msg.direction,
        dateSent: msg.dateSent || msg.dateCreated,
        dateCreated: msg.dateCreated,
        price: msg.price,
        priceUnit: msg.priceUnit,
        numMedia: msg.numMedia,
        accountSid: msg.accountSid,
      }));

    console.log(`[Twilio] Found ${allMessages.length} messages in conversation with ${phoneNumber}`);

    return {
      success: true,
      messages: allMessages,
    };
  } catch (error: any) {
    console.error('[Twilio] Error fetching message history:', error);
    return {
      success: false,
      error: error.message,
      messages: [],
    };
  }
}

export default {
  sendSMS,
  sendBulkSMS,
  getMessageStatus,
  formatPhoneNumber,
  validatePhoneNumber,
  getMessageHistory,
};
