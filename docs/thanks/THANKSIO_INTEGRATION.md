# Thanks.io Direct Mail Integration

> Last Updated: 2026-04-17 | Status: Implementation Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Account Setup](#account-setup)
3. [Authentication](#authentication)
4. [API Reference](#api-reference)
5. [Recipient Targeting](#recipient-targeting)
6. [Send Endpoints](#send-endpoints)
7. [Radius Search](#radius-search)
8. [Handwriting & Templates](#handwriting--templates)
9. [Orders & Tracking](#orders--tracking)
10. [Webhooks](#webhooks)
11. [Pricing](#pricing)
12. [Our Implementation](#our-implementation)
13. [Environment Variables](#environment-variables)
14. [Real Estate Use Cases](#real-estate-use-cases)

---

## Overview

Thanks.io is a direct mail automation platform that sends physical postcards, notecards, letters, and gift cards via API. Key features for our use case:

- **AI Handwritten** postcards and notecards (each glyph varies for realism)
- **QR code tracking** with scan notifications
- **Radius search** — mail to every address within X distance of a point (no contact list needed)
- **Delivery webhooks** for status tracking
- **Test mode** that auto-cancels orders for development
- **Pre-built real estate templates** available

**Base URL:** `https://api.thanks.io/api/v2`
**Rate Limit:** 60 requests/minute (contact support@thanks.io for higher limits)
**Documentation:** https://docs.thanks.io
**OpenAPI Spec:** https://raw.githubusercontent.com/thanks-io/thanks.io-api-docs/refs/heads/main/api-reference/openapi.json

---

## Account Setup

### Step 1: Create Account
1. Go to [thanks.io](https://thanks.io) and sign up
2. Complete onboarding

### Step 2: Get API Key
1. Go to [dashboard.thanks.io/profile/api](https://dashboard.thanks.io/profile/api)
2. Under "Personal Access Tokens (API Key)" — generate a new token
3. Copy the Bearer token

### Step 3: Enable Test Mode
1. Same page: dashboard.thanks.io/profile/api
2. Toggle **Test Mode ON**
3. All API orders will auto-cancel (no charges, no mail sent)
4. **IMPORTANT:** Disable test mode before going live

### Step 4: Configure Environment
Add to `.env.local`:
```env
THANKSIO_API_KEY=your_bearer_token_here
THANKSIO_TEST_MODE=true
```

### Step 5: Set Up Webhooks (Optional)
1. Via API: `POST /webhooks` with your endpoint URL
2. Or via dashboard webhook settings
3. Our webhook handler: `https://jpsrealtor.com/api/thanksio/webhook`

---

## Authentication

All requests require a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### OAuth 2.0 (for third-party integrations)

If building for multi-tenant (agents connecting their own accounts):

- **Authorize:** `GET https://dashboard.thanks.io/oauth/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI`
- **Token Exchange:** `POST https://dashboard.thanks.io/oauth/token`
- Supports refresh token flow

---

## API Reference

### All Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Send** | | |
| POST | `/send/postcard` | Send postcard (4x6, 6x9, 6x11) |
| POST | `/send/notecard` | Send folded 4.25x5.5 notecard in envelope |
| POST | `/send/letter` | Send windowed envelope letter |
| POST | `/send/windowlessletter` | Send windowless envelope letter |
| POST | `/send/giftcard` | Send gift card in envelope |
| POST | `/send/magnacard` | Send magnetic postcard |
| **Templates** | | |
| GET | `/handwriting-styles` | List available handwriting styles |
| GET | `/image-templates` | List pre-built image templates |
| GET | `/message-templates` | List message templates |
| **Mailing Lists** | | |
| GET | `/mailing-lists` | List all mailing lists (paginated) |
| POST | `/mailing-lists` | Create new mailing list |
| GET | `/mailing-lists/{id}` | Get mailing list details |
| DELETE | `/mailing-lists/{id}` | Delete mailing list |
| GET | `/mailing-lists-utils/recipients/{id}` | List recipients in a mailing list |
| POST | `/mailing-lists-utils/buy-radius-search` | Purchase radius search mailing list |
| **Recipients** | | |
| POST | `/recipients` | Add single recipient |
| POST | `/recipients-utils/create-multiple` | Add multiple recipients (JSON array) |
| GET | `/recipients/{id}` | Get recipient details |
| PUT | `/recipients/{id}` | Update recipient |
| DELETE | `/recipients/{id}` | Delete recipient |
| POST | `/recipients-utils/delete-by-address` | Delete by address or email |
| **Orders** | | |
| GET | `/orders/list` | List recent orders |
| GET | `/orders/{id}/track` | Track delivery status |
| PUT | `/orders/{id}/cancel` | Cancel order (if "Reviewing" status) |
| **Webhooks** | | |
| GET | `/webhooks` | List configured webhooks |
| POST | `/webhooks` | Create webhook |
| PUT | `/webhooks/{id}` | Update webhook |
| DELETE | `/webhooks/{id}` | Delete webhook |
| **Gift Cards** | | |
| GET | `/giftcard-brands` | List gift card brands |
| GET | `/giftcard-brands-list` | Flat list of brands |
| **Sub-Accounts** | | |
| GET | `/sub-accounts` | List sub-accounts |
| POST | `/sub-accounts` | Create sub-account |
| GET | `/sub-accounts/{id}` | Get sub-account details |
| PUT | `/sub-accounts/{id}` | Update sub-account |
| DELETE | `/sub-accounts/{id}` | Delete sub-account |

---

## Recipient Targeting

Every send endpoint accepts **one** of three recipient sources:

### 1. `recipients` — Direct JSON Array

Best for: CRM contacts with known addresses.

```json
{
  "recipients": [
    {
      "name": "John Doe",
      "address": "123 Main Street, Palm Springs, CA 92264"
    },
    {
      "name": "Jane Smith",
      "company": "& Family",
      "address": "456 Desert View Dr",
      "city": "La Quinta",
      "state": "CA",
      "postal_code": "92253"
    }
  ]
}
```

**Recipient fields:**
| Field | Required | Notes |
|-------|----------|-------|
| `name` | No | Defaults to "Resident" |
| `company` | No | Used as secondary name / spouse line |
| `address` | Yes | Can be full address (auto-parsed) or just street |
| `city` | No | Required if address is street-only |
| `state` | No | Required if address is street-only |
| `postal_code` | No | Required if address is street-only |
| `country` | No | Defaults to US |
| `email` | No | Used for address lookup if address invalid |
| `phone` | No | For identification |
| `custom1-4` | No | Mail merge variables |

**Mail merge:** Use `%FIRST_NAME%`, `%LAST_NAME%`, `%COMPANY%`, `%CUSTOM1%` through `%CUSTOM4%` in messages.

### 2. `mailing_lists` — Pre-Built List

Best for: Drip campaigns, recurring sends, imported lists.

```json
{
  "mailing_lists": [12345]
}
```

Create lists via `POST /mailing-lists` and add recipients over time.

### 3. `radius_search` — Geographic Targeting

Best for: Farming, just listed/sold, neighborhood campaigns. **No contact list needed.**

```json
{
  "radius_search": {
    "address": "45-500 Portola Ave",
    "postal_code": "92260",
    "record_count": 500,
    "record_types": "all",
    "include_condos": true,
    "append_data": false
  }
}
```

See [Radius Search](#radius-search) section for full details.

---

## Send Endpoints

### Send Postcard

`POST /send/postcard`

```json
{
  "size": "4x6",
  "front_image_url": "https://res.cloudinary.com/duqgao9h8/image/upload/...",
  "message": "Hi %FIRST_NAME% - Beautiful homes are selling fast in your neighborhood!",
  "handwriting_style": 12,
  "handwriting_realism": true,
  "qrcode_url": "https://jpsrealtor.com/lp/your-landing-page",
  "return_name": "Joseph Sardella | JP's Realtor",
  "return_address": "Your Office Address",
  "return_city": "Palm Desert",
  "return_state": "CA",
  "return_postal_code": "92260",
  "recipients": [{ "name": "John Doe", "address": "123 Main St, Palm Springs, CA 92264" }],
  "preview": false
}
```

**Postcard parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `size` | string | `4x6` | Postcard size: `4x6`, `6x9`, `6x11` |
| `front_image_url` | string | — | PNG/JPEG URL for front. Dimensions: 4x6=1875x1275px, 6x9=same, 6x11=3337x1777px |
| `image_template` | integer | — | Pre-built template ID (alternative to front_image_url) |
| `message` | string | — | Handwritten message for back of postcard |
| `message_template` | integer | — | Pre-built message template ID |
| `custom_background_image` | string | — | PNG/JPEG URL for back/custom background |
| `use_custom_background` | boolean | false | Enable custom background image |
| `handwriting_style` | integer | — | Handwriting style ID (from `/handwriting-styles`) |
| `handwriting_color` | string | — | `blue`, `black`, `green`, `purple`, `red`, or hex code |
| `handwriting_realism` | boolean | false | AI-enhanced realism for handwriting |
| `qrcode_url` | string | — | URL for auto-generated trackable QR code |
| `send_standard_mail` | boolean | false | Standard mail vs 1st class |
| `preview` | boolean | false | Returns PNG preview without sending |
| `return_*` | string | — | Custom return address fields |
| `email_additional` | string | — | Extra email for order notifications |
| `sub_account` | integer | — | Sub-account ID |

### Send Notecard

`POST /send/notecard`

Same parameters as postcard except:
- No `size` parameter (fixed at 4.25x5.5 folded)
- Comes in an envelope
- `message` is the interior handwritten content
- `front_image_url` is the front of the folded card

Best for: Thank you notes, personal follow-ups, anniversary cards.

### Send Letter (Windowed)

`POST /send/letter`

Same base parameters plus:
- `additional_pages` — URL to additional PDF pages
- `pdf_only_url` — Send a PDF as the entire letter (no other params needed)
- Comes in a windowed envelope showing recipient address

### Send Letter (Windowless)

`POST /send/windowlessletter`

Same as windowed letter but in a plain envelope.

---

## Radius Search

Send mail to every residential address near a location. **No contact list needed** — thanks.io handles address resolution.

### Cost
- **$0.05 per record** (address lookup fee)
- Plus the mail piece cost (postcard, letter, etc.)
- Up to **10,000 records** per search

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | Yes | Street address for center point |
| `postal_code` | string | Yes | ZIP code for center point |
| `record_count` | integer | Yes | Number of addresses to find (1-10,000) |
| `record_types` | string | No | Filter type (default: `all`) |
| `include_condos` | boolean | No | Include condos (default: false) |
| `append_data` | boolean | No | Append phone + email ($0.20/record extra) |
| `use_property_owner` | boolean | No | Use property owner address for commercial |
| `include_search_address` | boolean | No | Include the center address in results |
| `preview` | boolean | No | Preview count + cost without purchasing |

### Record Type Filters

| Filter | Description | Real Estate Use |
|--------|-------------|-----------------|
| `all` | All residential addresses | General farming |
| `likelytomove` | Predicted movers | Seller prospecting |
| `likelytorefi` | Likely refinance candidates | — |
| `absenteeowner` | Owner doesn't live at property | Investor outreach, vacant homes |
| `highnetworth` | High net worth individuals | Luxury market |

### Example: Radius Postcard

```json
{
  "size": "6x9",
  "front_image_url": "https://your-cloudinary-url/just-listed.jpg",
  "message": "A beautiful home just listed in your neighborhood! Scan the QR code for details.",
  "qrcode_url": "https://jpsrealtor.com/neighborhoods/indio/monte-vina/buy",
  "radius_search": {
    "address": "45-500 Portola Ave",
    "postal_code": "92260",
    "record_count": 200,
    "record_types": "all",
    "include_condos": true,
    "preview": false
  },
  "return_name": "Joseph Sardella",
  "return_address": "Your Address",
  "return_city": "Palm Desert",
  "return_state": "CA",
  "return_postal_code": "92260"
}
```

### Preview Before Buying

Set `preview: true` on the radius_search to get count + cost without purchasing:

```json
{
  "radius_search": {
    "address": "45-500 Portola Ave",
    "postal_code": "92260",
    "record_count": 500,
    "preview": true
  }
}
```

---

## Handwriting & Templates

### Handwriting Styles

`GET /handwriting-styles`

Returns a list of available handwriting styles with IDs. Use the ID in the `handwriting_style` parameter.

**Colors:** `blue`, `black`, `green`, `purple`, `red`, or any hex code (e.g., `#FF5733`)

**Realism:** Set `handwriting_realism: true` for AI-enhanced variability in each glyph.

### Image Templates

`GET /image-templates`

Pre-built front designs organized by category. Includes **Real Estate** templates for:
- Just Listed / Just Sold
- Open House
- Market Updates
- Seasonal greetings
- Thank You

### Message Templates

`GET /message-templates`

Pre-built message content. Can be used instead of custom `message` text.

### Creative Design Specs

| Mail Type | Front Dimensions | Back/Interior |
|-----------|-----------------|---------------|
| Postcard 4x6 | 1875 x 1275 px | Same |
| Postcard 6x9 | 1875 x 1275 px | Same |
| Postcard 6x11 | 3337 x 1777 px | Same |
| Notecard | 4.25 x 5.5 in (folded) | Interior message |
| Magnacard | Magnetic postcard | — |

Template downloads (PNG, PDF, Canva) available at: dashboard.thanks.io/image_templates

---

## Orders & Tracking

### List Orders

`GET /orders/list`

Returns recent orders with status, recipient count, cost.

### Track Order

`GET /orders/{orderId}/track`

Returns delivery status summary for all recipients in an order.

### Cancel Order

`PUT /orders/{orderId}/cancel`

Only works if order is in **"Reviewing"** status. Refunds credits.

### Order Status Flow

```
Reviewing → Processing → Printing → Mailed → Delivered
                                            → Returned
```

---

## Webhooks

Webhooks notify your server when events occur. **Paid subscriptions only.**

### Webhook Events

| Event | Fires When |
|-------|------------|
| `order_item.delivered` | Individual mail piece is delivered |
| `order_item.status_update` | Individual mail piece status changes |
| `order.status_update` | Batch order status changes |
| `scans.scan_update` | Recipient scans a QR code |

### Create Webhook

`POST /webhooks`

```json
{
  "url": "https://jpsrealtor.com/api/thanksio/webhook",
  "event": "order_item.delivered"
}
```

### Our Webhook Handler

Located at: `src/app/api/thanksio/webhook/route.ts`

Handles:
- `order.mailed` → Updates DirectMailPiece status, increments campaign `stats.mailSent`
- `order.delivered` → Marks delivered, increments `stats.mailDelivered`
- `order.returned` → Marks returned
- `qr.scanned` → Increments `stats.qrScans`, records scan timestamp

---

## Pricing

| Mail Type | Price | Includes |
|-----------|-------|----------|
| Postcard 4x6 | $0.99 | Printing + 1st class postage |
| Postcard 6x9 | $1.59 | Printing + 1st class postage |
| Postcard 6x11 | $1.99 | Printing + 1st class postage |
| Letter (windowed) | $1.99 | Printing + envelope + postage |
| Letter (windowless) | $1.99 | Printing + envelope + postage |
| Notecard | $2.79 | Printing + envelope + postage |
| Gift Card | $2.79+ | Card + envelope + postage + gift value |
| Radius search | $0.05/record | Address lookup fee (on top of mail cost) |
| Data append | $0.20/record | Add phone + email to radius records |
| Standard mail | -$0.15/piece | Discount for standard vs 1st class |

**Credits:** Thanks.io uses a credit system. Buy credits in bulk for volume discounts.

---

## Our Implementation

### Files

| File | Purpose |
|------|---------|
| `src/lib/thanksio.ts` | API client (send, track, webhooks) |
| `src/app/api/thanksio/webhook/route.ts` | Webhook handler |
| `src/app/api/campaigns/[id]/send-mail/route.ts` | Campaign send endpoint (TODO) |
| `src/models/DirectMailPiece.ts` | Individual mail piece tracking |
| `src/app/components/campaigns/pipeline/DirectMailPipelineWizard.tsx` | Direct mail wizard UI |

### API Client (`src/lib/thanksio.ts`)

Exports:
- `sendPostcard(params)` — Send postcards
- `sendLetter(params)` — Send letters
- `sendNotecard(params)` — Send notecards
- `sendRadiusPostcard(params)` — Radius-based postcard send
- `listHandwritingStyles()` — Get available styles
- `getOrderStatus(orderId)` — Track delivery
- `listOrders(page)` — List recent orders
- `cancelOrder(orderId)` — Cancel if reviewing
- `createMailingList(name, recipients)` — Create list
- `addToMailingList(listId, recipients)` — Add to list
- `validateWebhookSignature(payload, signature)` — Verify webhooks
- `estimateCost(mailType, count)` — Calculate cost
- `MAIL_PRICING` — Pricing constants

### What Needs To Be Updated

Based on the official docs, our client needs these updates:

1. **Add `preview` parameter** to all send functions (returns PNG preview)
2. **Add `handwriting_realism` parameter** for AI-enhanced fonts
3. **Add `send_standard_mail` parameter** for cheaper postage
4. **Add `record_types` filter** to radius search (likelytomove, absenteeowner, etc.)
5. **Add `image_template` support** for pre-built templates
6. **Update radius search** — uses `address` + `postal_code`, not lat/lng
7. **Add `custom_background_image`** for back of postcard
8. **Create the send-mail API route** (`/api/campaigns/[id]/send-mail`)

---

## Environment Variables

```env
# Thanks.io Direct Mail
THANKSIO_API_KEY=your_bearer_token
THANKSIO_TEST_MODE=true    # Set to false for production sends
```

---

## Real Estate Use Cases

### Just Listed Postcard (Radius)

Send a 6x9 postcard to 200 homes within the listing's subdivision:

```
Mail Type: Postcard 6x9 ($1.59/piece)
Targeting: Radius search, 200 records
Record Type: all
Image: Listing hero photo
Message: "A beautiful home just listed at [address]! [beds] beds, [baths] baths, $[price]. Scan for details."
QR Code: Links to listing detail page
Cost: 200 × $1.59 + 200 × $0.05 = $328
```

### Thank You Notecard (CRM Contact)

Send a handwritten notecard to a client after closing:

```
Mail Type: Notecard ($2.79/piece)
Targeting: Single CRM contact
Handwriting: Style with realism enabled
Message: "Dear %FIRST_NAME%, Thank you for trusting me with your home purchase. I'm so happy you found your dream home in [neighborhood]. Wishing you many wonderful memories! — Joseph"
Cost: $2.79
```

### Seller Prospecting (Radius + Filter)

Target likely-to-move homeowners in a high-value neighborhood:

```
Mail Type: Postcard 4x6 ($0.99/piece)
Targeting: Radius search, 500 records
Record Type: likelytomove
Image: Neighborhood photo + "Thinking of selling?" headline
Message: "Homes in [neighborhood] are selling in [X] days at a median of $[price]. Curious what yours is worth? Scan for a free CMA."
QR Code: Links to sell page
Cost: 500 × $0.99 + 500 × $0.05 = $520
```

### Absentee Owner Outreach

Target property owners who don't live at the address (investors, vacation homes):

```
Mail Type: Letter windowless ($1.99/piece)
Targeting: Radius search, 300 records
Record Type: absenteeowner
Append Data: true ($0.20/record for phone + email)
Message: Detailed letter about property value, market conditions, management options
Cost: 300 × $1.99 + 300 × $0.25 = $672
```

---

## Native Integrations

Thanks.io integrates with:

| Platform | Type |
|----------|------|
| Zapier | Automation |
| Make (Integromat) | Automation |
| n8n | Automation |
| HubSpot | CRM |
| HighLevel | CRM |
| Zoho | CRM |
| Bold Trail / kvCORE | Real Estate |
| API Nation | Middleware |

---

## Support & Resources

- **Documentation:** https://docs.thanks.io
- **API Audit Log:** dashboard.thanks.io/profile/audit_log
- **Image Templates:** dashboard.thanks.io/image_templates
- **Support:** support@thanks.io
- **Consultations:** calendly.com/thanks-io/
- **MCP Server:** https://docs.thanks.io/mcp
