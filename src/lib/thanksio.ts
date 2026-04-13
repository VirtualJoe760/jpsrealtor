/**
 * Thanks.io API Client
 *
 * API Docs: https://api.thanks.io/api/v2/
 * Pricing: $0.99 (4x6), $1.59 (6x9), $1.99 (letter), $2.79 (notecard) — includes postage
 */

const THANKSIO_BASE_URL = 'https://api.thanks.io/api/v2';

function getApiKey(): string {
  const key = process.env.THANKSIO_API_KEY;
  if (!key) throw new Error('THANKSIO_API_KEY is not configured');
  return key;
}

function isTestMode(): boolean {
  return process.env.THANKSIO_TEST_MODE === 'true';
}

async function thanksioFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${THANKSIO_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Thanks.io API error (${res.status}): ${errorBody}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MailType = 'postcard_4x6' | 'postcard_6x9' | 'postcard_6x11' | 'letter' | 'notecard';

export interface Recipient {
  name: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface SendPostcardParams {
  front_image_url: string;
  back_image_url?: string;
  size?: '4x6' | '6x9' | '6x11';
  message?: string;
  handwriting_style?: number;
  recipients: Recipient[];
  return_name?: string;
  return_address?: string;
  return_city?: string;
  return_state?: string;
  return_zip?: string;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  qr_code_url?: string;
  mailing_list_id?: string;
  test?: boolean;
}

export interface SendLetterParams {
  file_url: string;
  recipients: Recipient[];
  return_name?: string;
  return_address?: string;
  return_city?: string;
  return_state?: string;
  return_zip?: string;
  test?: boolean;
}

export interface SendNotecardParams {
  message: string;
  handwriting_style: number;
  front_image_url?: string;
  recipients: Recipient[];
  return_name?: string;
  return_address?: string;
  return_city?: string;
  return_state?: string;
  return_zip?: string;
  qr_code_url?: string;
  test?: boolean;
}

export interface RadiusSendParams {
  front_image_url: string;
  back_image_url?: string;
  size?: '4x6' | '6x9' | '6x11';
  message?: string;
  handwriting_style?: number;
  latitude: number;
  longitude: number;
  radius: number; // in miles
  return_name?: string;
  return_address?: string;
  return_city?: string;
  return_state?: string;
  return_zip?: string;
  qr_code_url?: string;
  test?: boolean;
}

export interface HandwritingStyle {
  id: number;
  name: string;
  preview_url?: string;
}

export interface OrderStatus {
  id: string;
  status: string;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

export interface ThanksioOrder {
  id: string;
  status: string;
  recipients_count: number;
  cost: number;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export const MAIL_PRICING: Record<MailType, number> = {
  postcard_4x6: 0.99,
  postcard_6x9: 1.59,
  postcard_6x11: 1.99,
  letter: 1.99,
  notecard: 2.79,
};

export function estimateCost(mailType: MailType, recipientCount: number): number {
  return MAIL_PRICING[mailType] * recipientCount;
}

// ---------------------------------------------------------------------------
// Send Functions
// ---------------------------------------------------------------------------

/**
 * Send postcards to a list of recipients.
 */
export async function sendPostcard(params: SendPostcardParams): Promise<ThanksioOrder> {
  const body: any = {
    front_image_url: params.front_image_url,
    size: params.size || '4x6',
    recipients: params.recipients,
  };

  if (params.back_image_url) body.back_image_url = params.back_image_url;
  if (params.message) body.message = params.message;
  if (params.handwriting_style) body.handwriting_style = params.handwriting_style;
  if (params.qr_code_url) body.qr_code_url = params.qr_code_url;
  if (params.mailing_list_id) body.mailing_list_id = params.mailing_list_id;

  // Return address
  if (params.return_name) body.return_name = params.return_name;
  if (params.return_address) body.return_address = params.return_address;
  if (params.return_city) body.return_city = params.return_city;
  if (params.return_state) body.return_state = params.return_state;
  if (params.return_zip) body.return_zip = params.return_zip;

  // Custom merge fields
  if (params.custom1) body.custom1 = params.custom1;
  if (params.custom2) body.custom2 = params.custom2;
  if (params.custom3) body.custom3 = params.custom3;
  if (params.custom4) body.custom4 = params.custom4;

  // Test mode
  if (isTestMode() || params.test) body.test = true;

  return thanksioFetch('/send/postcard', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Send letters to a list of recipients.
 */
export async function sendLetter(params: SendLetterParams): Promise<ThanksioOrder> {
  const body: any = {
    file_url: params.file_url,
    recipients: params.recipients,
  };

  if (params.return_name) body.return_name = params.return_name;
  if (params.return_address) body.return_address = params.return_address;
  if (params.return_city) body.return_city = params.return_city;
  if (params.return_state) body.return_state = params.return_state;
  if (params.return_zip) body.return_zip = params.return_zip;

  if (isTestMode() || params.test) body.test = true;

  return thanksioFetch('/send/letter', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Send handwritten notecards to a list of recipients.
 */
export async function sendNotecard(params: SendNotecardParams): Promise<ThanksioOrder> {
  const body: any = {
    message: params.message,
    handwriting_style: params.handwriting_style,
    recipients: params.recipients,
  };

  if (params.front_image_url) body.front_image_url = params.front_image_url;
  if (params.qr_code_url) body.qr_code_url = params.qr_code_url;

  if (params.return_name) body.return_name = params.return_name;
  if (params.return_address) body.return_address = params.return_address;
  if (params.return_city) body.return_city = params.return_city;
  if (params.return_state) body.return_state = params.return_state;
  if (params.return_zip) body.return_zip = params.return_zip;

  if (isTestMode() || params.test) body.test = true;

  return thanksioFetch('/send/notecard', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Send postcards to all addresses within a radius of a point.
 * No contact list needed — thanks.io handles address resolution.
 */
export async function sendRadiusPostcard(params: RadiusSendParams): Promise<ThanksioOrder> {
  const body: any = {
    front_image_url: params.front_image_url,
    size: params.size || '4x6',
    latitude: params.latitude,
    longitude: params.longitude,
    radius: params.radius,
  };

  if (params.back_image_url) body.back_image_url = params.back_image_url;
  if (params.message) body.message = params.message;
  if (params.handwriting_style) body.handwriting_style = params.handwriting_style;
  if (params.qr_code_url) body.qr_code_url = params.qr_code_url;

  if (params.return_name) body.return_name = params.return_name;
  if (params.return_address) body.return_address = params.return_address;
  if (params.return_city) body.return_city = params.return_city;
  if (params.return_state) body.return_state = params.return_state;
  if (params.return_zip) body.return_zip = params.return_zip;

  if (isTestMode() || params.test) body.test = true;

  return thanksioFetch('/send/radius', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Handwriting Styles
// ---------------------------------------------------------------------------

/**
 * List available handwriting styles for notecards and postcards.
 */
export async function listHandwritingStyles(): Promise<HandwritingStyle[]> {
  return thanksioFetch('/handwriting-styles');
}

// ---------------------------------------------------------------------------
// Order Management
// ---------------------------------------------------------------------------

/**
 * Get the status of a specific order.
 */
export async function getOrderStatus(orderId: string): Promise<OrderStatus> {
  return thanksioFetch(`/orders/${orderId}`);
}

/**
 * List recent orders.
 */
export async function listOrders(page: number = 1): Promise<{ data: ThanksioOrder[]; total: number }> {
  return thanksioFetch(`/orders?page=${page}`);
}

/**
 * Cancel an order (only if not yet printed).
 */
export async function cancelOrder(orderId: string): Promise<{ success: boolean }> {
  return thanksioFetch(`/orders/${orderId}/cancel`, {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Mailing Lists
// ---------------------------------------------------------------------------

/**
 * Create a mailing list for drip campaigns.
 */
export async function createMailingList(
  name: string,
  recipients: Recipient[]
): Promise<{ id: string; name: string; recipients_count: number }> {
  return thanksioFetch('/mailing-lists', {
    method: 'POST',
    body: JSON.stringify({ name, recipients }),
  });
}

/**
 * Add recipients to an existing mailing list.
 */
export async function addToMailingList(
  listId: string,
  recipients: Recipient[]
): Promise<{ recipients_added: number }> {
  return thanksioFetch(`/mailing-lists/${listId}/recipients`, {
    method: 'POST',
    body: JSON.stringify({ recipients }),
  });
}

// ---------------------------------------------------------------------------
// Webhook Types
// ---------------------------------------------------------------------------

export interface ThanksioWebhookEvent {
  event: 'order.mailed' | 'order.delivered' | 'order.returned' | 'qr.scanned';
  order_id: string;
  recipient_id?: string;
  data?: {
    tracking_number?: string;
    scanned_at?: string;
    scan_location?: { lat: number; lng: number };
  };
}

/**
 * Validate a thanks.io webhook payload.
 * Thanks.io signs webhooks — verify the signature header matches.
 */
export function validateWebhookSignature(
  payload: string,
  signature: string
): boolean {
  // Thanks.io uses HMAC-SHA256 for webhook signing
  // The secret is the API key
  const crypto = require('crypto');
  const expected = crypto
    .createHmac('sha256', getApiKey())
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
