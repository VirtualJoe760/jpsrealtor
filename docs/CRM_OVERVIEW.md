# CRM & Lead Generation System Overview
**JPSRealtor.com - AI-Powered Lead Management & Email Automation**
**Last Updated:** December 2, 2025

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Lead Generation Stack](#lead-generation-stack)
3. [System Architecture](#system-architecture)
4. [Database Models](#database-models)
5. [CRM UI Pages](#crm-ui-pages)
6. [API Integrations](#api-integrations)
7. [Workflow Examples](#workflow-examples)
8. [Future Enhancements](#future-enhancements)

---

## 🎯 OVERVIEW

The CRM system is designed to automate the entire lead generation and nurturing process for expired listings in the Coachella Valley. The system combines multiple services to find, contact, and convert expired listing leads into appointments and closed deals.

### Key Features
- ✅ **Automated lead acquisition** from expired MLS listings
- ✅ **Skip tracing** to find homeowner contact information
- ✅ **Multi-channel outreach** (voicemail, email, SMS)
- ✅ **AI-powered email responses** using Claude Sonnet 4.5
- ✅ **Auto-generated listing consultation pages** with CMA
- ✅ **Unified inbox** for managing all lead communications
- ✅ **Lead pipeline management** with status tracking

---

## 🛠️ LEAD GENERATION STACK

### Core Services

#### 1. **SPARK API**
**Purpose:** Find expired MLS listings
- Queries CRMLS for recently expired listings
- Filters by location (Coachella Valley)
- Filters by price range, property type, etc.
- Provides listing details (address, MLS#, agent info)

#### 2. **Tracerfy**
**Purpose:** Skip tracing service
- Input: Property address
- Output: Homeowner name, phone, email, mailing address
- API-based integration
- Batch processing support

#### 3. **Drop Cowboy**
**Purpose:** Automated voicemail drops
- Pre-recorded voicemail messages
- Delivered without phone ringing
- Tracks delivery and listen status
- Webhook notifications for analytics

#### 4. **Resend (josephsardella.com)**
**Purpose:** Email sending and receiving
- **Sending:** Marketing and follow-up emails
- **Receiving:** Inbound responses via webhook
- **Domain:** contact@josephsardella.com
- **Features:** Open/click tracking, templates, attachments

#### 5. **Custom CRM (JPSRealtor.com)**
**Purpose:** Central management hub
- Lead database (MongoDB)
- Email inbox and thread management
- AI-powered response generation
- Consultation page generation
- Appointment scheduling
- Analytics and reporting

---

## 🏗️ SYSTEM ARCHITECTURE

### Lead Acquisition Pipeline

```
SPARK API (Expired Listings)
    ↓
Tracerfy (Skip Trace)
    ↓
Lead Created in MongoDB
    ↓
    ├─ Drop Cowboy (Voicemail)
    ├─ Resend (Email)
    └─ Generate Consultation Page
    ↓
Lead Responds (Email/Phone)
    ↓
Resend Webhook → CRM Inbox
    ↓
AI Generates Response Draft
    ↓
Review & Send
    ↓
Appointment Scheduled
    ↓
Close Listing
```

### Email Flow

```
Inbound Email to contact@josephsardella.com
    ↓
Resend MX Records Receive Email
    ↓
Resend Webhook POST to /api/inbound-email
    ↓
Parse Email & Match to Lead
    ↓
Create EmailThread Record
    ↓
Notify Dashboard (Unread Badge)
    ↓
User Opens Email in CRM Inbox
    ↓
AI Generates Response
    ↓
User Reviews/Edits Draft
    ↓
Send via Resend API
    ↓
Update EmailThread & Lead Status
```

---

## 💾 DATABASE MODELS

### Lead Schema

```typescript
interface Lead {
  _id: string;

  // Listing Information
  listingAddress: string;
  listingKey?: string;           // MLS listing number
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  listPrice?: number;
  expirationDate: Date;
  originalListingAgent?: string;

  // Homeowner Contact Info (from Tracerfy)
  ownerName: string;
  phone?: string;
  email?: string;
  mailingAddress?: string;

  // Outreach Tracking
  voicemailSent?: {
    date: Date;
    dropCowboyId: string;
    delivered: boolean;
    listened?: boolean;
    listenedAt?: Date;
  };

  emailsSent: Array<{
    date: Date;
    subject: string;
    resendId: string;
    opened?: boolean;
    openedAt?: Date;
    clicked?: boolean;
    clickedAt?: Date;
  }>;

  // Lead Status & Engagement
  status: "cold" | "contacted" | "responded" | "appointment" | "won" | "lost";
  leadSource: "expired_listing";
  temperature: "hot" | "warm" | "cold";  // Engagement level

  // Consultation Page
  consultationPageGenerated: boolean;
  consultationPageUrl?: string;
  consultationPageViews?: number;
  consultationPageLastViewed?: Date;

  // Appointment Information
  appointmentScheduled?: boolean;
  appointmentDate?: Date;
  appointmentType?: "phone" | "in_person" | "video";
  appointmentNotes?: string;

  // AI Context & Notes
  aiContext: string;              // Summary of all interactions
  internalNotes?: string;         // Private notes

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastContactedAt?: Date;
  lastRespondedAt?: Date;
}
```

### EmailThread Schema

```typescript
interface EmailThread {
  _id: string;
  leadId: string;                 // Reference to Lead

  // Thread Metadata
  subject: string;
  participants: string[];         // All email addresses in thread

  // Messages
  messages: Array<{
    messageId: string;            // Unique message ID
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    htmlBody: string;
    textBody: string;
    attachments?: Array<{
      filename: string;
      contentType: string;
      size: number;
      url: string;              // Cloudinary or S3 URL
    }>;
    resendId?: string;          // If sent via Resend
    direction: "inbound" | "outbound";
    receivedAt?: Date;
    sentAt?: Date;
    read: boolean;
    readAt?: Date;
  }>;

  // Thread Status
  status: "unread" | "draft" | "replied" | "closed";
  priority: "low" | "normal" | "high" | "urgent";

  // AI-Generated Drafts
  aiDrafts?: Array<{
    content: string;
    generatedAt: Date;
    used: boolean;
  }>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}
```

### ConsultationPage Schema

```typescript
interface ConsultationPage {
  _id: string;
  leadId: string;
  slug: string;                   // URL slug (e.g., "abc123")

  // Page Content
  propertyAddress: string;
  heroImage?: string;

  // AI-Generated Content
  cma: {
    estimatedValue: number;
    priceRange: { min: number; max: number };
    comparables: Array<{
      address: string;
      soldPrice: number;
      soldDate: Date;
      beds: number;
      baths: number;
      sqft: number;
      pricePerSqft: number;
    }>;
    marketTrends: string;       // AI-generated analysis
  };

  pricingStrategy: string;      // AI-generated recommendations
  marketingPlan: string;        // AI-generated marketing approach

  // Analytics
  views: number;
  lastViewedAt?: Date;
  uniqueVisitors: number;
  avgTimeOnPage?: number;

  // Call-to-Action
  ctaClicked: boolean;
  ctaClickedAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
}
```

---

## 🖥️ CRM UI PAGES

### 1. `/admin/crm` - Lead Dashboard

**Purpose:** Overview of all leads and pipeline metrics

**Layout:**
- **Stats Carousel** (like CMS):
  - Total Leads
  - Contacted This Week
  - Appointments Scheduled
  - Response Rate (%)
  - Won Listings This Month
  - Pipeline Value

- **Lead List** (table/cards):
  - Columns: Address, Owner Name, Status, Last Contact, Next Action, Temperature
  - Filters: Status, City, Date Added, Temperature
  - Search: By address, owner name, email
  - Sort: By date, status, temperature, appointment date
  - Actions: View, Email, Call, Schedule, Mark Won/Lost

**Components:**
- `LeadDashboard.tsx` - Main container
- `LeadStatsCarousel.tsx` - Stats display
- `LeadTable.tsx` - Desktop table view
- `LeadCard.tsx` - Mobile card view
- `LeadFilters.tsx` - Filter controls

---

### 2. `/admin/crm/inbox` - Email Inbox

**Purpose:** Unified inbox for all lead communications

**Layout:**
- **Tabs:**
  - Unread (badge count)
  - All Emails
  - Drafts
  - Sent
  - Archived

- **Email List:**
  - Lead name + property address
  - Subject line
  - Preview text (first 100 chars)
  - Date received/sent
  - Status badge (unread, replied, draft)
  - Attachment indicator
  - Priority flag

- **Filters:**
  - By lead status
  - By date range
  - With attachments
  - By priority

**Components:**
- `EmailInbox.tsx` - Main container
- `EmailList.tsx` - Email list view
- `EmailListItem.tsx` - Individual email preview
- `InboxFilters.tsx` - Filter controls

---

### 3. `/admin/crm/inbox/[threadId]` - Email Thread View

**Purpose:** View and respond to email threads (like CMS edit page)

**Layout:**
- **Left Panel (60%):**
  - Email thread history (newest first)
  - Each message shows:
    - Sender/recipient info
    - Timestamp
    - Full email content (HTML rendered)
    - Attachments
    - Open/click tracking (if outbound)

- **Right Panel (40%):**
  - **AI Email Generator:**
    - "Generate Response" button
    - Context display (lead info, property details)
    - Generated draft (editable TipTap editor)
    - Tone selector (professional, friendly, urgent)
    - Template selector (follow-up, appointment, objection handler)

  - **Action Buttons:**
    - Save Draft
    - Send Email
    - Preview
    - Schedule Send
    - Mark as Closed

- **Top Bar:**
  - Lead name + property address
  - Status dropdown
  - Priority flag
  - Quick actions (Call, Schedule, View Lead)

**Components:**
- `EmailThreadView.tsx` - Main container
- `EmailMessageList.tsx` - Thread history
- `EmailMessage.tsx` - Individual message
- `AIEmailGenerator.tsx` - AI response generator
- `EmailEditor.tsx` - TipTap-based editor

---

### 4. `/admin/crm/leads/[leadId]` - Lead Detail Page

**Purpose:** Complete view of a single lead's information and history

**Layout:**
- **Header:**
  - Property address (large)
  - Lead status badge
  - Temperature indicator
  - Quick actions (Email, Call, Schedule, Edit)

- **Tabs:**
  1. **Overview:**
     - Property details
     - Owner contact info
     - Lead source and acquisition date
     - Consultation page link (if generated)

  2. **Timeline:**
     - All interactions chronologically
     - Voicemails sent
     - Emails sent/received
     - Calls logged
     - Appointments scheduled
     - Status changes
     - Notes added

  3. **Emails:**
     - Embedded email thread view
     - Quick reply

  4. **Documents:**
     - CMA report (if generated)
     - Listing agreement (if signed)
     - Marketing materials

  5. **Notes:**
     - Internal notes
     - AI context summary
     - Call notes

**Components:**
- `LeadDetail.tsx` - Main container
- `LeadHeader.tsx` - Header with quick actions
- `LeadTimeline.tsx` - Activity timeline
- `LeadNotes.tsx` - Notes section

---

### 5. `/consultation/[slug]` - Auto-Generated Listing Consultation

**Purpose:** Public-facing page to showcase value and convert lead to appointment

**Layout:**
- **Hero Section:**
  - Property address (large headline)
  - Professional property photo
  - Subheadline: "Your Personalized Listing Strategy"

- **Section 1: Market Analysis**
  - Estimated home value (large number)
  - Price range
  - Comparable sales (map + table)
  - Market trends chart

- **Section 2: Your Agent - Joseph Sardella**
  - Professional photo
  - Bio and credentials
  - Specialization (Coachella Valley expert)
  - Years of experience
  - Recent sales

- **Section 3: Pricing Strategy**
  - AI-generated pricing recommendations
  - Day-on-market projections
  - Pricing tiers (aggressive, moderate, conservative)

- **Section 4: Marketing Plan**
  - Professional photography
  - Virtual tour and drone footage
  - MLS syndication (Zillow, Realtor.com, etc.)
  - Social media advertising
  - Email marketing to 10,000+ buyer database
  - Open houses
  - Targeted buyer outreach

- **Section 5: Success Stories**
  - Client testimonials
  - Recent sales in the area

- **Section 6: Schedule Consultation**
  - Calendar embed (Calendly or custom)
  - Phone: (760) 833-6334
  - Email: contact@josephsardella.com
  - Contact form

- **Footer:**
  - Powered by jpsrealtor.com
  - Privacy policy
  - Unsubscribe

**Components:**
- `ConsultationPage.tsx` - Main page
- `ConsultationHero.tsx` - Hero section
- `CMADisplay.tsx` - Market analysis
- `PricingStrategy.tsx` - Pricing recommendations
- `MarketingPlan.tsx` - Marketing approach
- `TestimonialCarousel.tsx` - Client testimonials
- `CalendarEmbed.tsx` - Appointment scheduling

---

## 🔌 API INTEGRATIONS

### 1. Resend Inbound Webhook

**Endpoint:** `POST /api/inbound-email`

**Purpose:** Receives webhook from Resend when emails arrive

**Webhook Payload:**
```typescript
{
  from: "homeowner@gmail.com",
  to: ["contact@josephsardella.com"],
  subject: "Re: Your expired listing",
  html: "<p>Email content...</p>",
  text: "Email content...",
  headers: { /* email headers */ },
  attachments: [
    {
      filename: "document.pdf",
      content: "base64_encoded_content",
      contentType: "application/pdf"
    }
  ]
}
```

**Handler Logic:**
1. Verify webhook signature (security)
2. Parse email data
3. Match sender email to Lead in database
4. If no match, create new Lead (inbound inquiry)
5. Create or update EmailThread
6. Add message to thread
7. Mark thread as "unread"
8. Trigger notification (optional: SMS via Twilio)
9. Return 200 OK

---

### 2. Drop Cowboy Webhook

**Endpoint:** `POST /api/drop-cowboy/webhook`

**Purpose:** Receives delivery and listen status updates

**Webhook Payload:**
```typescript
{
  campaign_id: "abc123",
  phone_number: "+17605551234",
  status: "delivered" | "failed" | "listened",
  timestamp: "2025-12-02T10:30:00Z"
}
```

**Handler Logic:**
1. Match phone number to Lead
2. Update Lead.voicemailSent status
3. If "listened", mark as high temperature
4. Log event in Lead timeline
5. Return 200 OK

---

### 3. Tracerfy Skip Trace

**Endpoint:** `POST /api/tracerfy/skip-trace`

**Purpose:** Send property address, receive contact info

**Request:**
```typescript
{
  address: "123 Palm Desert Ln",
  city: "Palm Desert",
  state: "CA",
  zip: "92260"
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    owner_name: "John Doe",
    phone: "+17605551234",
    email: "john@email.com",
    mailing_address: "456 Different St, Palm Desert, CA 92260"
  }
}
```

**Handler Logic:**
1. Receive address from SPARK API or manual input
2. Call Tracerfy API
3. Parse response
4. Create Lead record with contact info
5. Return Lead ID

---

### 4. SPARK API Expired Listings

**Endpoint:** `GET /api/spark/expired-listings`

**Purpose:** Fetch recently expired listings from CRMLS

**Request:**
```typescript
{
  city: "Palm Desert",
  maxPrice: 1000000,
  minPrice: 300000,
  daysExpired: 7  // Expired within last 7 days
}
```

**Response:**
```typescript
{
  listings: [
    {
      ListingKey: "123456",
      UnparsedAddress: "123 Palm Desert Ln",
      City: "Palm Desert",
      StateOrProvince: "CA",
      PostalCode: "92260",
      ListPrice: 550000,
      BedroomsTotal: 3,
      BathroomsTotalInteger: 2,
      LivingArea: 2100,
      ExpirationDate: "2025-11-28",
      ListAgentFullName: "Previous Agent"
    }
  ]
}
```

**Handler Logic:**
1. Query SPARK API with filters
2. For each expired listing:
   - Check if already in database (by ListingKey)
   - If new, trigger skip trace workflow
3. Return list of new leads created

---

### 5. AI Email Response Generator

**Endpoint:** `POST /api/ai/generate-email-response`

**Purpose:** Generate personalized email response using Claude

**Request:**
```typescript
{
  leadId: "lead_abc123",
  threadId: "thread_xyz789",
  tone: "professional" | "friendly" | "urgent",
  template?: "follow_up" | "appointment" | "objection_handler"
}
```

**Response:**
```typescript
{
  success: true,
  draft: "Hi John,\n\nThank you for your response...",
  subject: "Re: Your Expired Listing Consultation"
}
```

**AI Prompt Structure:**
```
System: You are Joseph Sardella, a real estate agent specializing in
the Coachella Valley. You help homeowners sell their expired listings.

Context:
- Lead: John Doe
- Property: 123 Palm Desert Ln
- Original list price: $550,000
- Days on market: 120
- Reason for expiration: Overpriced, poor marketing
- Previous email: "I'm interested but not ready yet"

Generate a professional, empathetic follow-up email that:
1. Acknowledges their concerns about timing
2. Explains the risks of waiting (market conditions, competition)
3. Offers a no-obligation consultation
4. Includes a clear call-to-action (schedule call)
5. Keeps tone conversational and helpful (not pushy)
```

---

### 6. AI Consultation Page Generator

**Endpoint:** `POST /api/ai/generate-consultation-page`

**Purpose:** Auto-generate personalized listing consultation page

**Request:**
```typescript
{
  leadId: "lead_abc123",
  includePhotos: boolean
}
```

**Response:**
```typescript
{
  success: true,
  consultationPageUrl: "https://jpsrealtor.com/consultation/abc123",
  cma: { /* comparative market analysis */ },
  pricingStrategy: "Based on recent sales...",
  marketingPlan: "Your property will be marketed..."
}
```

**Generation Process:**
1. Fetch lead and property data
2. Query MongoDB for comparable sales (same city, similar sqft/beds/baths)
3. Use AI to analyze comps and generate CMA
4. Generate pricing strategy (3 scenarios)
5. Generate marketing plan
6. Create ConsultationPage record
7. Generate unique slug
8. Return URL

---

## 📊 WORKFLOW EXAMPLES

### Example 1: New Expired Listing Lead

**Day 1: Acquisition**
1. **10:00 AM** - SPARK API finds expired listing:
   - Address: `123 Palm Desert Ln`
   - Expired: 3 days ago
   - List price: $550,000

2. **10:05 AM** - Tracerfy skip trace:
   - Owner: John Doe
   - Phone: (760) 555-1234
   - Email: john@email.com

3. **10:10 AM** - Lead created in database:
   - Status: "cold"
   - Temperature: "cold"

4. **10:15 AM** - Drop Cowboy sends voicemail:
   - Message: "Hi, this is Joseph Sardella..."
   - Delivered successfully

5. **10:20 AM** - Resend sends intro email:
   - From: contact@josephsardella.com
   - Subject: "Your Expired Listing - Let's Get It Sold"
   - Includes consultation page link

6. **10:25 AM** - Consultation page generated:
   - URL: `jpsrealtor.com/consultation/abc123`
   - CMA completed with 5 comps
   - Pricing strategy: $525k-$550k
   - Marketing plan customized

**Day 2: Engagement**
1. **9:30 AM** - John listens to voicemail:
   - Drop Cowboy webhook received
   - Lead temperature: "warm"

2. **11:00 AM** - John opens email:
   - Resend tracking: opened
   - Lead temperature: "warm"

3. **2:00 PM** - John views consultation page:
   - 4 minutes on page
   - Viewed all sections
   - Lead temperature: "hot"

**Day 3: Response**
1. **8:00 AM** - John replies to email:
   - "I'm interested but concerned about pricing"
   - Resend webhook → CRM inbox
   - Email marked "unread"
   - Dashboard notification

2. **9:00 AM** - You open CRM inbox:
   - See John's email
   - Click "Generate Response"
   - AI analyzes concern about pricing
   - Generates draft response

3. **9:05 AM** - You review and edit draft:
   - AI suggests: "I understand your concern..."
   - You add personal touch
   - Click "Send"

4. **9:10 AM** - Email sent via Resend:
   - Thread updated
   - Lead status: "responded"

**Day 4: Appointment**
1. **3:00 PM** - John clicks calendar link:
   - Visits consultation page
   - Schedules appointment: Dec 5 @ 2:00 PM
   - Lead status: "appointment"
   - Calendar invite sent

2. **3:05 PM** - You receive notification:
   - SMS: "New appointment: John Doe - Dec 5 @ 2pm"
   - Dashboard updated

**Day 7: Meeting**
1. **2:00 PM** - In-person consultation:
   - Present full marketing plan
   - Review CMA in detail
   - Answer questions

2. **3:00 PM** - List agreement signed:
   - Lead status: "won"
   - New listing created in MLS

---

### Example 2: Inbound Lead via Email

**Scenario:** Someone finds your website and emails contact@josephsardella.com

**Flow:**
1. **Email sent to contact@josephsardella.com**
   - Subject: "Question about selling my home"
   - From: jane@email.com
   - Body: "I'm thinking about selling my home in Indian Wells..."

2. **Resend webhook triggered**
   - POST to `/api/inbound-email`
   - Email parsed

3. **Lead matching**
   - Search database for jane@email.com
   - No match found → Create new Lead

4. **Lead created**
   - Name: "Jane" (parsed from email)
   - Email: jane@email.com
   - Source: "inbound_inquiry"
   - Status: "responded" (they reached out first)
   - Temperature: "warm"

5. **EmailThread created**
   - Add inbound message
   - Status: "unread"

6. **You respond**
   - Open inbox → see new email
   - Generate AI response
   - Send reply

7. **Conversation continues**
   - All emails tracked in thread
   - Lead warms up
   - Generate consultation page
   - Schedule appointment

---

## 🔮 FUTURE ENHANCEMENTS

### Planned Features

#### 1. **SMS Integration** (Twilio)
- Send SMS follow-ups
- Receive SMS responses
- Unified inbox for email + SMS

#### 2. **Call Tracking** (CallRail or Twilio)
- Log phone calls
- Record conversations
- Transcribe calls with AI
- Add to lead timeline

#### 3. **Calendar Integration**
- Google Calendar or Outlook sync
- Automated appointment reminders
- Reschedule/cancel handling

#### 4. **AI Lead Scoring**
- Predictive lead scoring based on:
  - Email engagement
  - Page views
  - Response time
  - Questions asked
- Prioritize hottest leads

#### 5. **Automated Drip Campaigns**
- Multi-touch email sequences
- Based on lead status and behavior
- A/B testing
- Unsubscribe management

#### 6. **Document Management**
- E-signature integration (DocuSign)
- Listing agreements
- Disclosure forms
- Marketing materials

#### 7. **Team Collaboration**
- Assign leads to team members
- Internal comments
- Task management
- Activity tracking

#### 8. **Advanced Analytics**
- Lead source ROI
- Conversion funnel
- Email performance
- Response time tracking
- Revenue attribution

#### 9. **Mobile App**
- Native iOS/Android app
- Push notifications
- Quick responses
- Call/text from app

#### 10. **Integration Marketplace**
- Zapier integration
- Make.com (Integromat)
- HubSpot sync
- Salesforce connector

---

## 📈 SUCCESS METRICS

### Key Performance Indicators (KPIs)

#### Lead Acquisition
- **Expired listings found per week**
- **Skip trace success rate** (contact info found)
- **Cost per lead** (Tracerfy + Drop Cowboy + Resend fees)

#### Outreach Performance
- **Voicemail delivery rate** (target: >95%)
- **Voicemail listen rate** (target: >30%)
- **Email open rate** (target: >40%)
- **Email reply rate** (target: >10%)

#### Engagement Metrics
- **Consultation page views** (target: >50% of contacts)
- **Average time on consultation page** (target: >3 minutes)
- **Calendar click rate** (target: >25% of viewers)

#### Conversion Metrics
- **Response rate** (target: >15%)
- **Appointment rate** (target: >5% of contacted leads)
- **Win rate** (target: >30% of appointments)
- **Average time to appointment** (target: <7 days)

#### Revenue Metrics
- **Listings won per month**
- **Average commission per listing**
- **ROI on lead generation spend**
- **Lifetime value per lead**

---

## 🔒 SECURITY & COMPLIANCE

### Data Protection
- **Encryption:** All emails stored with AES-256
- **PII handling:** Comply with GDPR/CCPA
- **Access control:** Role-based permissions
- **Audit logs:** Track all data access

### Email Compliance
- **CAN-SPAM compliance:** Unsubscribe links in all emails
- **TCPA compliance:** Voicemail drop consent tracking
- **Do Not Call list:** Check against DNC registry
- **Opt-out management:** Honor unsubscribe requests

### API Security
- **Webhook verification:** Verify Resend signatures
- **Rate limiting:** Prevent abuse
- **API keys:** Secure storage in environment variables
- **HTTPS only:** All API communication encrypted

---

## 📚 RELATED DOCUMENTATION

- **[FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)** - UI component patterns
- **[DATABASE_MODELS.md](./DATABASE_MODELS.md)** - MongoDB schemas
- **[AI_INTEGRATION.md](./AI_INTEGRATION.md)** - Groq and Claude AI setup
- **[CMS_AND_INSIGHTS_COMPLETE.md](./CMS_AND_INSIGHTS_COMPLETE.md)** - Article CMS (similar patterns)

---

**This document outlines the complete CRM and lead generation system architecture.**
**Status:** Planning phase - implementation pending
**Last updated:** December 2, 2025
