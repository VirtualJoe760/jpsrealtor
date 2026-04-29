/**
 * Thanks.io API Client
 *
 * Docs: https://docs.thanks.io
 * Base URL: https://api.thanks.io/api/v2
 * Auth: Bearer token
 * Rate Limit: 60 req/min
 */

const THANKSIO_BASE_URL = 'https://api.thanks.io/api/v2';

function getApiKey(): string {
  const key = process.env.THANKSIO_API_KEY;
  if (!key) throw new Error('THANKSIO_API_KEY is not configured. Get your API key at dashboard.thanks.io/profile/api');
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
  if (options.body) {
    console.log(`[thanksio] ${options.method || 'GET'} ${endpoint} payload:`, options.body);
  }
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
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  address: string;
  address2?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  email?: string;
  phone?: string;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
}

export interface RadiusSearch {
  address: string;
  postal_code: string;
  record_count: number;
  record_types?: 'all' | 'likelytomove' | 'likelytorefi' | 'absenteeowner' | 'highnetworth';
  include_condos?: boolean;
  append_data?: boolean;
  use_property_owner?: boolean;
  include_search_address?: boolean;
  preview?: boolean;
}

export interface SendMailerBase {
  // Creative
  front_image_url?: string;
  image_template?: number;
  message?: string;
  message_template?: number;
  custom_background_image?: string;
  use_custom_background?: boolean;

  // Handwriting
  handwriting_style?: number;
  handwriting_color?: string;
  handwriting_realism?: boolean;

  // QR code
  qrcode_url?: string;

  // Targeting (one required)
  recipients?: Recipient[];
  mailing_lists?: number[];
  radius_search?: RadiusSearch;

  // Return address
  return_name?: string;
  return_address?: string;
  return_address2?: string;
  return_city?: string;
  return_state?: string;
  return_postal_code?: string;

  // Options
  send_standard_mail?: boolean;
  preview?: boolean;
  sub_account?: number;
  email_additional?: string;
}

export interface SendPostcardParams extends SendMailerBase {
  size?: '4x6' | '6x9' | '6x11';
}

export interface SendNotecardParams extends SendMailerBase {
  message: string;
}

export interface SendLetterParams extends SendMailerBase {
  additional_pages?: string;
  pdf_only_url?: string;
}

export interface HandwritingStyle {
  handwriting_style_id: number;
  name: string;
  sample: string;
  type: string;
}

export interface ThanksioOrder {
  id: string | number;
  status: string;
  recipients_count?: number;
  cost?: number;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

// Pricing reflects Paid Plan rates (dashboard.thanks.io)
export const MAIL_PRICING: Record<MailType, number> = {
  postcard_4x6: 0.65,
  postcard_6x9: 0.72,
  postcard_6x11: 0.93,
  letter: 0.96,
  notecard: 1.66,
};

export const RADIUS_SEARCH_COST_PER_RECORD = 0.05;
export const DATA_APPEND_COST_PER_RECORD = 0.20;

export function estimateCost(
  mailType: MailType,
  recipientCount: number,
  options?: { radiusSearch?: boolean; appendData?: boolean; standardMail?: boolean }
): number {
  let perPiece = MAIL_PRICING[mailType];
  if (options?.standardMail) perPiece -= 0.15;

  let total = perPiece * recipientCount;
  if (options?.radiusSearch) total += RADIUS_SEARCH_COST_PER_RECORD * recipientCount;
  if (options?.appendData) total += DATA_APPEND_COST_PER_RECORD * recipientCount;

  return Math.round(total * 100) / 100;
}

// ---------------------------------------------------------------------------
// Send Functions
// ---------------------------------------------------------------------------

function buildSendBody(params: SendMailerBase): any {
  const body: any = {};

  // Creative
  if (params.front_image_url) body.front_image_url = params.front_image_url;
  if (params.image_template) body.image_template = params.image_template;
  if (params.message) body.message = params.message;
  if (params.message_template) body.message_template = params.message_template;
  if (params.custom_background_image) body.custom_background_image = params.custom_background_image;
  if (params.use_custom_background) body.use_custom_background = true;

  // Handwriting
  if (params.handwriting_style) body.handwriting_style = params.handwriting_style;
  if (params.handwriting_color) body.handwriting_color = params.handwriting_color;
  if (params.handwriting_realism) body.handwriting_realism = true;

  // QR
  if (params.qrcode_url) body.qrcode_url = params.qrcode_url;

  // Targeting
  if (params.recipients) body.recipients = params.recipients;
  if (params.mailing_lists) body.mailing_lists = params.mailing_lists;
  if (params.radius_search) body.radius_search = params.radius_search;

  // Return address
  if (params.return_name) body.return_name = params.return_name;
  if (params.return_address) body.return_address = params.return_address;
  if (params.return_address2) body.return_address2 = params.return_address2;
  if (params.return_city) body.return_city = params.return_city;
  if (params.return_state) body.return_state = params.return_state;
  if (params.return_postal_code) body.return_postal_code = params.return_postal_code;

  // Options
  if (params.send_standard_mail) body.send_standard_mail = true;
  if (params.preview) body.preview = true;
  if (params.sub_account) body.sub_account = params.sub_account;
  if (params.email_additional) body.email_additional = params.email_additional;

  return body;
}

/**
 * Send postcards (4x6, 6x9, or 6x11).
 */
export async function sendPostcard(params: SendPostcardParams): Promise<ThanksioOrder> {
  const body = buildSendBody(params);
  body.size = params.size || '4x6';

  return thanksioFetch('/send/postcard', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Send folded 4.25x5.5 notecard in envelope.
 */
export async function sendNotecard(params: SendNotecardParams): Promise<ThanksioOrder> {
  const body = buildSendBody(params);

  return thanksioFetch('/send/notecard', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Send windowed envelope letter.
 */
export async function sendLetter(params: SendLetterParams): Promise<ThanksioOrder> {
  const body = buildSendBody(params);
  if (params.additional_pages) body.additional_pages = params.additional_pages;
  if (params.pdf_only_url) body.pdf_only_url = params.pdf_only_url;

  return thanksioFetch('/send/letter', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Send windowless envelope letter.
 */
export async function sendWindowlessLetter(params: SendLetterParams): Promise<ThanksioOrder> {
  const body = buildSendBody(params);
  if (params.additional_pages) body.additional_pages = params.additional_pages;
  if (params.pdf_only_url) body.pdf_only_url = params.pdf_only_url;

  return thanksioFetch('/send/windowlessletter', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

/**
 * Get a PNG preview of a mail piece without sending it.
 * Pass preview: true to any send function, or use this helper.
 */
export async function previewPostcard(params: SendPostcardParams): Promise<any> {
  return sendPostcard({ ...params, preview: true });
}

export async function previewNotecard(params: SendNotecardParams): Promise<any> {
  return sendNotecard({ ...params, preview: true });
}

// ---------------------------------------------------------------------------
// Handwriting Styles & Templates
// ---------------------------------------------------------------------------

/**
 * List available handwriting styles.
 */
export async function listHandwritingStyles(): Promise<{ data: HandwritingStyle[] }> {
  return thanksioFetch('/handwriting-styles');
}

/**
 * List available image templates.
 */
export async function listImageTemplates(): Promise<any> {
  return thanksioFetch('/image-templates/');
}

/**
 * List available message templates.
 */
export async function listMessageTemplates(): Promise<any> {
  return thanksioFetch('/message-templates/');
}

// ---------------------------------------------------------------------------
// Order Management
// ---------------------------------------------------------------------------

/**
 * List recent orders.
 */
export async function listOrders(): Promise<any> {
  return thanksioFetch('/orders/list');
}

/**
 * Track delivery status of an order.
 */
export async function trackOrder(orderId: string): Promise<any> {
  return thanksioFetch(`/orders/${orderId}/track`);
}

/**
 * Cancel an order (only if status is "Reviewing"). Refunds credits.
 */
export async function cancelOrder(orderId: string): Promise<any> {
  return thanksioFetch(`/orders/${orderId}/cancel`, {
    method: 'PUT',
  });
}

// ---------------------------------------------------------------------------
// Mailing Lists
// ---------------------------------------------------------------------------

/**
 * List all mailing lists (paginated).
 */
export async function listMailingLists(): Promise<any> {
  return thanksioFetch('/mailing-lists/');
}

/**
 * Create a new mailing list.
 */
export async function createMailingList(name: string): Promise<any> {
  return thanksioFetch('/mailing-lists/', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * Get mailing list details.
 */
export async function getMailingList(listId: string): Promise<any> {
  return thanksioFetch(`/mailing-lists/${listId}`);
}

/**
 * Delete a mailing list.
 */
export async function deleteMailingList(listId: string): Promise<any> {
  return thanksioFetch(`/mailing-lists/${listId}`, { method: 'DELETE' });
}

/**
 * List recipients in a mailing list.
 */
export async function listMailingListRecipients(listId: string): Promise<any> {
  return thanksioFetch(`/mailing-lists-utils/recipients/${listId}`);
}

/**
 * Purchase a radius search mailing list.
 * Cost: $0.05 per record, up to 10,000 records.
 */
export async function buyRadiusSearch(params: RadiusSearch): Promise<any> {
  return thanksioFetch('/mailing-lists-utils/buy-radius-search', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ---------------------------------------------------------------------------
// Recipients
// ---------------------------------------------------------------------------

/**
 * Add a single recipient.
 */
export async function createRecipient(recipient: Recipient & { mailing_list_id: number }): Promise<any> {
  return thanksioFetch('/recipients', {
    method: 'POST',
    body: JSON.stringify(recipient),
  });
}

/**
 * Add multiple recipients.
 */
export async function createMultipleRecipients(
  recipients: (Recipient & { mailing_list_id: number })[]
): Promise<any> {
  return thanksioFetch('/recipients-utils/create-multiple', {
    method: 'POST',
    body: JSON.stringify({ recipients }),
  });
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export type WebhookEventType =
  | 'order_item.delivered'
  | 'order_item.status_update'
  | 'order.status_update'
  | 'scans.scan_update';

/**
 * List configured webhooks.
 */
export async function listWebhooks(): Promise<any> {
  return thanksioFetch('/webhooks');
}

/**
 * Create a webhook.
 */
export async function createWebhook(url: string, event: WebhookEventType): Promise<any> {
  return thanksioFetch('/webhooks', {
    method: 'POST',
    body: JSON.stringify({ url, event }),
  });
}

/**
 * Delete a webhook.
 */
export async function deleteWebhook(webhookId: string): Promise<any> {
  return thanksioFetch(`/webhooks/${webhookId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Check if configured
// ---------------------------------------------------------------------------

export function isThanksioConfigured(): boolean {
  return !!process.env.THANKSIO_API_KEY;
}
