# Twilio SMS Integration - Complete Documentation

**Date**: January 10, 2026
**Status**: ✅ FULLY IMPLEMENTED
**Features**: Conversation Threading, SMS Messaging, Twilio Sync, Webhooks, Opt-in Management, TCPA Compliance

---

## 🎯 Overview

Complete Twilio SMS integration for the CRM system with:
- **Contact Management** - Full CRUD for contacts with opt-in tracking
- **SMS Messaging** - Two-way SMS communication via Twilio
- **Message History** - Complete conversation threading
- **TCPA Compliance** - Consent tracking with IP and timestamp
- **Real-time UI** - WhatsApp-style messaging interface

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE                           │
├─────────────────────────────────────────────────────────────┤
│  CRM Dashboard (/agent/crm)                                 │
│    ├─ Contacts Tab (ContactsTab.tsx)                        │
│    │    - Search contacts                                   │
│    │    - Add/Edit/Delete contacts                          │
│    │    - TCPA compliance checkboxes                        │
│    │    - Tags and status management                        │
│    │                                                         │
│    └─ Email Inbox Tab                                       │
│                                                              │
│  Messages Page (/agent/messages)                            │
│    ├─ Conversation Threading                                │
│    │    - Grouped by phone number                           │
│    │    - Last message preview                              │
│    │    - Unread count indicators                           │
│    │                                                         │
│    ├─ Conversation View                                     │
│    │    - WhatsApp-style chat interface                     │
│    │    - Message status indicators                         │
│    │    - Character counter                                 │
│    │    - Twilio history sync                               │
│    │                                                         │
│    ├─ Contacts Modal                                        │
│    │    - Access full contact list                          │
│    │    - Start new conversations                           │
│    │    - Filter by opt-in status                           │
│    │                                                         │
│    └─ Opt-in Management                                     │
│         - Visual opt-in indicators                          │
│         - Send opt-in request button                        │
│         - Templated opt-in message                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       API LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  /api/crm/contacts (route.ts)                               │
│    - GET: Fetch contacts with filtering                     │
│    - POST: Create new contact                               │
│    - PUT: Update existing contact                           │
│    - DELETE: Remove contact                                 │
│                                                              │
│  /api/crm/sms/send (send/route.ts)                          │
│    - POST: Send SMS via Twilio                              │
│    - Save message to database                               │
│    - Update contact last contact date                       │
│    - Auto-link messages to contacts                         │
│                                                              │
│  /api/crm/sms/messages (messages/route.ts)                  │
│    - GET: Fetch message history                             │
│    - Filter by contact, phone, direction                    │
│                                                              │
│  /api/crm/sms/conversations (conversations/route.ts) NEW    │
│    - GET: Fetch conversation threads                        │
│    - Group messages by phone number                         │
│    - Include last message and unread count                  │
│    - Link to contact information                            │
│                                                              │
│  /api/crm/sms/sync (sync/route.ts) NEW                      │
│    - POST: Sync message history from Twilio                 │
│    - Fetch up to 100 messages per contact                   │
│    - Prevent duplicate messages                             │
│                                                              │
│  /api/crm/sms/webhook (webhook/route.ts) NEW                │
│    - POST: Receive inbound SMS from Twilio                  │
│    - Save to database with direction: 'inbound'             │
│    - Auto-link to contact by phone number                   │
│    - Return TwiML response                                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC                            │
├─────────────────────────────────────────────────────────────┤
│  Twilio Service (lib/twilio.ts)                             │
│    - sendSMS(params)                                        │
│    - sendBulkSMS(recipients, body)                          │
│    - getMessageStatus(messageSid)                           │
│    - formatPhoneNumber(phone)                               │
│    - validatePhoneNumber(phone)                             │
│    - getMessageHistory(phone, limit)                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  MongoDB Collections:                                        │
│                                                              │
│  1. contacts                                                 │
│     - Basic info (name, email, phone)                       │
│     - Real estate interests                                 │
│     - Communication preferences (smsOptIn, emailOptIn)      │
│     - TCPA consent tracking                                 │
│     - Tags, status, notes                                   │
│     - Last contact tracking                                 │
│                                                              │
│  2. smsmessages                                              │
│     - Twilio message SID                                    │
│     - From/To phone numbers                                 │
│     - Message body and media URLs                           │
│     - Direction (inbound/outbound)                          │
│     - Status (queued/sent/delivered/failed)                 │
│     - Contact ID linkage                                    │
│     - Thread ID for conversations                           │
│     - Pricing and error tracking                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                           │
├─────────────────────────────────────────────────────────────┤
│  Twilio API                                                  │
│    - Account SID: [REDACTED]                                │
│    - Phone Number: [REDACTED]                               │
│    - REST API for sending/receiving SMS                     │
│    - Status callbacks for delivery tracking                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ File Structure

```
F:/web-clients/joseph-sardella/jpsrealtor/

├── src/
│   ├── models/
│   │   ├── contact.ts                 # Contact MongoDB schema
│   │   └── sms-message.ts             # SMS Message MongoDB schema
│   │
│   ├── lib/
│   │   └── twilio.ts                  # Twilio service utilities
│   │
│   ├── app/
│   │   ├── agent/
│   │   │   ├── crm/
│   │   │   │   └── page.tsx           # CRM Dashboard (Contacts & Email)
│   │   │   └── messages/
│   │   │       └── page.tsx           # NEW: Conversation-based messaging
│   │   │
│   │   ├── api/
│   │   │   └── crm/
│   │   │       ├── contacts/
│   │   │       │   └── route.ts       # Contacts CRUD API
│   │   │       └── sms/
│   │   │           ├── send/
│   │   │           │   └── route.ts   # Send SMS API
│   │   │           ├── messages/
│   │   │           │   └── route.ts   # Message history API
│   │   │           ├── conversations/ # NEW
│   │   │           │   └── route.ts   # Conversation threads API
│   │   │           ├── sync/          # NEW
│   │   │           │   └── route.ts   # Twilio history sync API
│   │   │           └── webhook/       # NEW
│   │   │               └── route.ts   # Inbound SMS webhook
│   │   │
│   │   └── components/
│   │       └── crm/
│   │           ├── ContactsTab.tsx    # Contacts management UI
│   │           └── EmailInbox.tsx     # Email inbox UI
│   │
│   └── .env.local                     # Twilio credentials
│       TWILIO_ACCOUNT_SID=...
│       TWILIO_AUTH_TOKEN=...
│       TWILIO_PHONE_NUMBER=+17602620014
│
└── docs/
    ├── integrations/
    │   └── TWILIO.md                  # This file
    └── TWILIO_WEBHOOK_SETUP.md        # Webhook configuration guide
```

---

## 🔧 Features

### 1. Contact Management

**ContactsTab Component**:
- ✅ Search contacts by name, email, or phone
- ✅ Add new contacts with comprehensive details
- ✅ Edit existing contacts
- ✅ Delete contacts with confirmation
- ✅ View contact status (new, contacted, qualified, client, etc.)
- ✅ Tag management (buyer, seller, investor, etc.)
- ✅ SMS/Email opt-in tracking
- ✅ TCPA compliance checkboxes
- ✅ Notes and activity tracking

**Contact Model Fields**:
```typescript
interface IContact {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;  // E.164 format required
  address?: {
    street, city, state, zip
  };
  source?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'nurturing' | 'client' | 'inactive';
  tags?: string[];
  interests?: {
    buying, selling, propertyTypes, locations, priceRange, timeframe
  };
  preferences?: {
    smsOptIn: boolean;  // TCPA compliance
    emailOptIn: boolean;
    callOptIn: boolean;
    preferredContactMethod?: 'sms' | 'email' | 'phone';
  };
  consent?: {
    marketingConsent: boolean;
    tcpaConsent: boolean;
    consentDate?: Date;
    consentIp?: string;
  };
  notes?: string;
  lastContactDate?: Date;
  lastContactMethod?: 'sms' | 'email' | 'phone' | 'in-person';
  assignedAgent?: string;
}
```

### 2. SMS Messaging

**Messages Page (/agent/messages)**:
- ✅ Conversation-based inbox (like iMessage/WhatsApp)
- ✅ Conversation threading grouped by phone number
- ✅ Last message preview in conversation list
- ✅ Unread message count indicators
- ✅ WhatsApp-style chat interface
- ✅ Real-time message sending
- ✅ Message status indicators (sent, delivered, failed)
- ✅ Character counter (160 chars = 1 SMS segment)
- ✅ Multi-segment message warnings
- ✅ Shift+Enter for new lines
- ✅ Auto-scroll to latest message
- ✅ Real-time polling (3s for messages, 10s for conversations)
- ✅ Twilio history sync (auto-loads past conversations)
- ✅ Contacts modal for starting new conversations
- ✅ Opt-in status indicators (green avatar = opted in)
- ✅ "Send Opt-in Request" button with template message
- ✅ Search conversations by name, phone, or content

**Message Status Icons**:
- ⏳ Sending... (queued)
- ✓ Sent (single checkmark)
- ✓✓ Delivered (double checkmark, blue)
- ❗ Failed (alert icon, red)

**SMS Message Model Fields**:
```typescript
interface ISMSMessage {
  twilioMessageSid: string;  // Unique Twilio ID
  from: string;  // E.164 format
  to: string;    // E.164 format
  body: string;
  mediaUrls?: string[];  // MMS support
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'undelivered' | 'failed' | 'received';
  contactId?: string;  // Link to Contact
  threadId?: string;   // Conversation grouping
  errorCode?: number;
  errorMessage?: string;
  price?: number;
  priceUnit?: string;
  sentBy?: string;  // User ID
  tags?: string[];
  twilioCreatedAt?: Date;
  deliveredAt?: Date;
}
```

---

## 🔐 TCPA Compliance

### What is TCPA?
The Telephone Consumer Protection Act (TCPA) requires **explicit consent** before sending marketing texts to consumers.

### Implementation

**Consent Tracking**:
- ✅ `smsOptIn` checkbox in contact form
- ✅ Consent date automatically recorded
- ✅ Consent IP address captured (for proof)
- ✅ Only contacts with `smsOptIn: true` appear in Messaging tab

**Best Practices**:
1. **Never send** to contacts without SMS opt-in
2. **Clear opt-out instructions** in every message
3. **Honor opt-outs immediately**
4. **Keep records** of all consent

**Example Consent Language**:
```
"By checking this box, I consent to receive automated and person-to-person
text messages from [Your Company] at the phone number provided. Msg & data
rates may apply. Reply STOP to opt-out."
```

---

## 📡 API Reference

### Contacts API

**GET /api/crm/contacts**
```typescript
// Query params
{
  search?: string;     // Search name, email, phone
  status?: string;     // Filter by status
  limit?: number;      // Default: 50
  skip?: number;       // Pagination offset
}

// Response
{
  success: true,
  contacts: Contact[],
  pagination: {
    total: number,
    limit: number,
    skip: number,
    hasMore: boolean
  }
}
```

**POST /api/crm/contacts**
```typescript
// Body
{
  firstName: string;  // Required
  lastName: string;   // Required
  phone: string;      // Required (E.164 format)
  email?: string;
  notes?: string;
  status?: string;
  tags?: string[];
  preferences?: {
    smsOptIn: boolean;
    emailOptIn: boolean;
  };
  // ... other fields
}

// Response
{
  success: true,
  contact: Contact,
  message: "Contact created successfully"
}
```

**PUT /api/crm/contacts**
```typescript
// Body
{
  _id: string;  // Required
  // ... fields to update
}

// Response
{
  success: true,
  contact: Contact,
  message: "Contact updated successfully"
}
```

**DELETE /api/crm/contacts**
```typescript
// Query params
{
  id: string  // Contact ID
}

// Response
{
  success: true,
  message: "Contact deleted successfully"
}
```

### SMS API

**POST /api/crm/sms/send**
```typescript
// Body
{
  to: string;         // Phone number (E.164)
  body: string;       // Message content
  contactId?: string; // Link to contact
  sentBy?: string;    // User ID
}

// Response
{
  success: true,
  message: SMSMessage,
  twilioMessageSid: string
}
```

**GET /api/crm/sms/messages**
```typescript
// Query params
{
  contactId?: string;    // Filter by contact
  phoneNumber?: string;  // Filter by phone
  direction?: string;    // 'inbound' or 'outbound'
  limit?: number;        // Default: 100
  skip?: number;         // Pagination offset
}

// Response
{
  success: true,
  messages: SMSMessage[],
  pagination: {
    total: number,
    limit: number,
    skip: number,
    hasMore: boolean
  }
}
```

---

## 🛠️ Twilio Service Functions

### sendSMS(params)
```typescript
import { sendSMS } from '@/lib/twilio';

const result = await sendSMS({
  to: '+17605551234',
  body: 'Hello from JPSRealtor!'
});

if (result.success) {
  console.log('Message SID:', result.messageSid);
}
```

### sendBulkSMS(recipients, body)
```typescript
import { sendBulkSMS } from '@/lib/twilio';

const results = await sendBulkSMS(
  ['+17605551234', '+17605555678'],
  'New listing alert!'
);

// Returns array of results
results.forEach((result, index) => {
  if (result.success) {
    console.log(`Message ${index + 1} sent successfully`);
  }
});
```

### formatPhoneNumber(phone)
```typescript
import { formatPhoneNumber } from '@/lib/twilio';

const formatted = formatPhoneNumber('760-555-1234');
// Returns: '+17605551234'

const formatted2 = formatPhoneNumber('(760) 555-1234');
// Returns: '+17605551234'
```

### getMessageStatus(messageSid)
```typescript
import { getMessageStatus } from '@/lib/twilio';

const status = await getMessageStatus('SM...');
console.log(status.status);  // 'delivered', 'sent', 'failed', etc.
```

---

## 🧪 Testing Guide

### 1. Test Contact Creation

1. Navigate to `/agent/crm`
2. Click "Contacts" tab
3. Click "Add Contact"
4. Fill in:
   - First Name: John
   - Last Name: Doe
   - Phone: +17605551234
   - Email: john@example.com
   - Check "SMS Opt-In"
5. Click "Add Contact"
6. Verify contact appears in list

### 2. Test SMS Sending

1. Navigate to `/agent/messages`
2. Click "Contacts" button to open contacts modal
3. Select a contact (contacts with SMS opt-in show green avatar)
4. Type message: "Hello! This is a test message."
5. Click "Send"
6. Verify message appears in chat
7. Check status indicator (should show ✓✓ when delivered)
8. Verify conversation appears in left sidebar with last message

### 3. Test Opt-in Request

1. Navigate to `/agent/messages`
2. Open a conversation with a contact who hasn't opted in
3. Click "Send Opt-in Request" button
4. Verify templated message is sent automatically
5. Contact should receive: "Hey this is Joseph Sardella, Your trusted real estate agent! Type 'OPT IN' to receive text alerts..."

### 4. Test Twilio History Sync

1. Navigate to `/agent/messages`
2. Click on a conversation
3. System automatically syncs last 100 messages from Twilio
4. Verify historical messages appear in the conversation
5. Check browser console for "[SMS Sync]" logs

### 5. Test Phone Lookup

```bash
curl "http://localhost:3000/api/crm/contacts?search=760"
```

Should return contacts with phone numbers containing "760".

### 6. Test Conversation Threads

```bash
curl "http://localhost:3000/api/crm/sms/conversations"
```

Should return all conversation threads grouped by phone number.

### 7. Test Message History

```bash
curl "http://localhost:3000/api/crm/sms/messages?contactId=<CONTACT_ID>"
```

Should return all messages for that contact.

---

## 🚨 Error Handling

### Common Errors

**1. Invalid Phone Number Format**
```
Error: "Phone number must be in E.164 format (e.g., +17605551234)"
```
**Fix**: Ensure all phone numbers start with `+` and country code.

**2. Missing Twilio Credentials**
```
Error: "Twilio not configured. Missing environment variables."
```
**Fix**: Check `.env.local` has TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.

**3. Contact Already Exists**
```
Error: "Contact with this phone number already exists"
```
**Fix**: Use PUT to update existing contact instead of POST.

**4. Contact Not Showing in Conversations**
```
Warning: Contact doesn't appear in conversations list
```
**Fix**:
- Ensure contact exists and has messages
- Check if messages are linked to contactId
- Use "Contacts" button to start new conversation
- Verify contact has valid phone number

---

## 💰 Twilio Pricing

### SMS Costs (US)
- **Outbound SMS**: $0.0079/message
- **Inbound SMS**: $0.0079/message
- **MMS**: $0.02/message

### Message Segments
- **1-160 characters**: 1 segment ($0.0079)
- **161-306 characters**: 2 segments ($0.0158)
- **307-459 characters**: 3 segments ($0.0237)

### Phone Number
- **Monthly cost**: $1.50/month
- **Current number**: +17602620014

---

## 🔮 Recent Enhancements

### ✅ Recently Implemented (January 2026)

1. **Conversation Threading** - Messages grouped by phone number
   - Conversation-based inbox at `/agent/messages`
   - Last message preview in conversation list
   - Unread count indicators
   - Real-time polling (3s for messages, 10s for conversations)

2. **Inbound Webhook** - Receive SMS replies
   ```
   POST /api/crm/sms/webhook
   - Parse Twilio webhook
   - Save to database
   - Auto-link to contact
   - Real-time UI updates
   ```

3. **Twilio History Sync** - Load past conversations
   ```
   POST /api/crm/sms/sync
   - Fetch up to 100 messages from Twilio
   - Prevent duplicate messages
   - Auto-sync when opening conversations
   ```

4. **Opt-in Management** - Request SMS consent
   - Visual opt-in indicators (green avatar)
   - "Send Opt-in Request" button
   - Templated opt-in message
   - Track opt-in status per contact

5. **Contacts Modal** - Easy access to contact list
   - Start new conversations
   - Filter by opt-in status
   - Search contacts

### Future Phase 3 Features

1. **SMS Templates** - Pre-written messages
   ```
   - "New Listing Alert"
   - "Open House Reminder"
   - "Price Drop Notification"
   - Custom templates per user
   ```

2. **Scheduled Messages** - Send later
   ```
   - Pick date/time
   - Queue in database
   - Cron job sends at scheduled time
   ```

3. **Bulk Campaigns** - Mass text campaigns
   ```
   - Select multiple contacts
   - Personalization variables
   - Unsubscribe tracking
   - Campaign analytics
   ```

4. **MMS Support** - Send images/videos
   ```
   - Upload media to Cloudinary
   - Attach media URLs to message
   - Display in chat interface
   ```

5. **Auto-Responder** - Automated replies
   ```
   - Keyword triggers ("STOP", "INFO", "HOURS")
   - Business hours detection
   - Away messages
   ```

---

## 📊 Database Indexes

### contacts collection
```javascript
// Search performance
db.contacts.createIndex({ phone: 1 });
db.contacts.createIndex({ email: 1 }, { sparse: true });
db.contacts.createIndex({ "preferences.smsOptIn": 1 });

// Text search
db.contacts.createIndex({
  firstName: "text",
  lastName: "text",
  email: "text",
  phone: "text",
  notes: "text"
});

// Filtering
db.contacts.createIndex({ status: 1 });
db.contacts.createIndex({ assignedAgent: 1 });
db.contacts.createIndex({ createdAt: -1 });
```

### smsmessages collection
```javascript
// Message queries
db.smsmessages.createIndex({ twilioMessageSid: 1 }, { unique: true });
db.smsmessages.createIndex({ contactId: 1, createdAt: -1 });
db.smsmessages.createIndex({ threadId: 1, createdAt: 1 });

// Phone lookups
db.smsmessages.createIndex({ from: 1, createdAt: -1 });
db.smsmessages.createIndex({ to: 1, createdAt: -1 });

// Status queries
db.smsmessages.createIndex({ status: 1, direction: 1 });

// Text search
db.smsmessages.createIndex({ body: "text" });
```

---

## 🏆 Success Metrics

### Technical
- ✅ Contact CRUD operations working
- ✅ SMS sending via Twilio successful
- ✅ Message history persisted in MongoDB
- ✅ TCPA compliance checkboxes functional
- ✅ UI responsive and polished
- ✅ Error handling comprehensive

### Business
- Track SMS open rates
- Monitor response rates
- Measure lead conversion from SMS
- Analyze optimal send times
- Calculate ROI per SMS campaign

---

## 🔍 Troubleshooting

### Issue: Messages not sending
**Check**:
1. Twilio credentials in `.env.local`
2. Phone number format (E.164)
3. Contact has SMS opt-in enabled
4. Twilio account has credit
5. Check browser console for errors

### Issue: Conversations not appearing
**Check**:
1. Navigate to `/agent/messages`
2. Ensure contacts have sent/received messages
3. Check messages are linked with contactId
4. Use "Contacts" button to start new conversation
5. Refresh the page

### Issue: Message status stuck on "Sending..."
**Check**:
1. Twilio webhook configured (for status updates)
2. Network connectivity
3. Twilio account status

---

## 📝 Summary

The Twilio SMS integration is **fully implemented** and production-ready with:

- ✅ **Complete Contact Management** - CRUD, search, filtering, tags
- ✅ **SMS Messaging** - Send/receive with beautiful UI at `/agent/messages`
- ✅ **Conversation Threading** - Messages grouped by phone number
- ✅ **Twilio History Sync** - Auto-loads past conversations
- ✅ **Inbound Webhooks** - Receives SMS replies in real-time
- ✅ **Opt-in Management** - Visual indicators and request button
- ✅ **Contacts Modal** - Easy access to start new conversations
- ✅ **TCPA Compliance** - Consent tracking built-in
- ✅ **Real-time Polling** - Auto-updates every 3-10 seconds
- ✅ **Error Handling** - Comprehensive validation and fallbacks
- ✅ **Scalable Architecture** - Ready for bulk campaigns and automation

**Status**: 🟢 PRODUCTION READY

---

**Last Updated**: January 10, 2026
**Author**: AI + Joseph Sardella
**Status**: Living Document
