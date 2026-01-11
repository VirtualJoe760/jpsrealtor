# Twilio SMS Webhook Setup Guide

## Overview

This guide explains how to configure Twilio to send inbound SMS messages to your application automatically. When someone texts your Twilio number, the message will be saved to your database and appear in real-time in the messaging interface.

## Webhook Endpoint

**URL:** `https://your-domain.com/api/crm/sms/webhook`

This endpoint receives POST requests from Twilio whenever an inbound SMS is received.

## Configuration Steps

### 1. Access Twilio Console

1. Log in to your [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** > **Manage** > **Active Numbers**
3. Click on your Twilio phone number (`+17602620014`)

### 2. Configure Messaging Webhook

1. Scroll down to the **Messaging** section
2. Find the **A MESSAGE COMES IN** field
3. Set the following:
   - **Webhook URL:** `https://your-production-domain.com/api/crm/sms/webhook`
   - **HTTP Method:** `POST`
4. Click **Save Configuration**

### 3. For Local Development (Using ngrok)

If you want to test inbound messages during local development:

```bash
# Install ngrok if you haven't already
npm install -g ngrok

# Start your Next.js app
npm run dev

# In a separate terminal, expose localhost:3000
ngrok http 3000
```

Use the ngrok URL in Twilio:
- **Webhook URL:** `https://abc123.ngrok.io/api/crm/sms/webhook`

## How It Works

### Inbound Message Flow

1. **Customer sends SMS** → Twilio number (+17602620014)
2. **Twilio receives SMS** → Sends webhook POST to your endpoint
3. **Your webhook endpoint:**
   - Parses the Twilio message data
   - Finds matching contact by phone number
   - Saves message to database with `direction: 'inbound'`
   - Updates contact's last contact date
   - Returns TwiML response to Twilio
4. **Real-time polling** → Frontend fetches new messages every 3 seconds
5. **Message appears in UI** automatically

### Webhook Payload

Twilio sends form data with these fields:

```
MessageSid: SM1234...             # Unique message ID
AccountSid: AC6692...             # Your Twilio account
From: +17605551234                # Customer's phone number
To: +17602620014                  # Your Twilio number
Body: "Hello, I need help!"       # Message content
NumMedia: 0                       # Number of media attachments
```

### Database Storage

Messages are saved with this structure:

```typescript
{
  userId: ObjectId("..."),        # User who owns the contact
  twilioMessageSid: "SM1234...",  # Twilio message ID
  from: "+17605551234",           # Customer phone
  to: "+17602620014",             # Your Twilio number
  body: "Hello!",                 # Message text
  direction: "inbound",           # Direction: inbound/outbound
  status: "received",             # Status
  contactId: "...",               # Linked contact ID
  createdAt: Date,                # Timestamp
}
```

## Real-Time Updates

The messaging interface automatically polls for new messages:

- **Active conversation:** Every 3 seconds
- **Contact list:** Every 10 seconds
- **No refresh needed** - messages appear automatically

## Testing the Webhook

### 1. Test Locally

```bash
# Start your development server
npm run dev

# Start ngrok
ngrok http 3000

# Configure Twilio with ngrok URL
# https://abc123.ngrok.io/api/crm/sms/webhook

# Send a test SMS to your Twilio number
# Check your terminal for webhook logs
```

### 2. Test in Production

```bash
# Deploy your app
npm run build

# Configure Twilio with production URL
# https://your-domain.com/api/crm/sms/webhook

# Send a test SMS to your Twilio number
# Check the messaging interface
```

## Troubleshooting

### Messages Not Appearing?

1. **Check Twilio webhook configuration:**
   - Go to Twilio Console > Phone Numbers
   - Verify webhook URL is correct
   - Ensure HTTP method is POST

2. **Check server logs:**
   - Look for `[Twilio Webhook]` logs
   - Verify message is being received and saved

3. **Check contact exists:**
   - Webhook only saves messages for existing contacts
   - Create a contact with the phone number first

4. **Check polling:**
   - Open browser developer console
   - Look for `/api/crm/sms/messages` requests every 3 seconds

### Webhook Errors?

Check your server logs for:
```
[Twilio Webhook] Error: ...
```

Common issues:
- Database connection failure
- Contact not found
- Duplicate message ID (already saved)

## Security Considerations

### 1. Validate Twilio Signature (Optional)

For production, you should validate that webhook requests actually come from Twilio:

```typescript
import { validateRequest } from 'twilio';

// In webhook handler
const twilioSignature = request.headers.get('x-twilio-signature');
const url = 'https://your-domain.com/api/crm/sms/webhook';
const params = Object.fromEntries(formData);

const isValid = validateRequest(
  process.env.TWILIO_AUTH_TOKEN!,
  twilioSignature!,
  url,
  params
);

if (!isValid) {
  return new Response('Forbidden', { status: 403 });
}
```

### 2. Rate Limiting

Consider adding rate limiting to prevent abuse:
- Limit requests per IP
- Limit requests per phone number

## Environment Variables

Ensure these are set in `.env.local`:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## UI Features

The messaging interface at `/agent/messages` now includes:

### Conversation Threading
- ✅ Messages grouped by phone number (like iMessage/WhatsApp)
- ✅ Conversation list with last message preview
- ✅ Unread message count indicators
- ✅ Click conversation to view full chat history

### Real-Time Updates
- ✅ Messages poll every 3 seconds when viewing a conversation
- ✅ Conversation list updates every 10 seconds
- ✅ No manual refresh needed
- ✅ Auto-sync Twilio message history

### Modern UI Design
- ✅ Gradient message bubbles
- ✅ Avatar indicators (green = SMS opt-in enabled)
- ✅ Timestamp separators (every 5 minutes)
- ✅ Animated sending indicators
- ✅ Smooth transitions and hover effects
- ✅ Read receipts (delivered/sent/failed)

### Contact Management
- ✅ Contacts modal for starting new conversations
- ✅ Search contacts by name, phone, or email
- ✅ Filter by opt-in status
- ✅ "Send Opt-in Request" button with template
- ✅ Message search across all conversations

## API Reference

### POST /api/crm/sms/webhook

Receives inbound SMS from Twilio.

**Request:** Twilio form data (see above)

**Response:** TwiML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

### GET /api/crm/sms/webhook

Verification endpoint.

**Response:**
```json
{
  "success": true,
  "message": "Twilio SMS Webhook Endpoint",
  "instructions": "Configure this URL in your Twilio Console"
}
```

## Next Steps

1. Configure webhook URL in Twilio Console
2. Test by sending an SMS to your Twilio number
3. Navigate to `/agent/messages` to view the conversation
4. Verify message appears in the conversation thread
5. Monitor server logs for any errors

## Support

If you encounter issues:
1. Check Twilio webhook logs in Console
2. Check your application server logs
3. Verify environment variables are set correctly
4. Test with ngrok for local development
