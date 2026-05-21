# Drop Cowboy Voicemail Campaign System - Architecture

## System Overview

The Drop Cowboy Voicemail Campaign System is a comprehensive multi-source contact management and automated voicemail campaign platform that enables agents to:
- Import contacts from multiple sources (Title Rep, Google Contacts, Database, Mojo Dialer)
- Generate personalized AI scripts for each contact
- Convert scripts to voicemails using 11 Labs text-to-speech
- Review and approve campaigns before sending
- Submit campaigns to Drop Cowboy for delivery
- Track campaign performance and delivery analytics
- Prevent spam through cross-campaign deduplication

## Database Schema

### 1. Campaign Model (`src/models/Campaign.ts`)

```typescript
interface Campaign {
  _id: ObjectId;
  userId: ObjectId; // Agent who created the campaign
  teamId?: ObjectId; // Optional team association

  // Campaign Identity
  name: string; // e.g., "PDCC Expireds - January 2026"
  type: CampaignType; // "sphere_of_influence" | "past_clients" | "neighborhood_expireds" | "high_equity" | "custom"
  neighborhood?: string; // e.g., "PDCC", "IWCC" for neighborhood-specific campaigns

  // Campaign Status
  status: CampaignStatus; // "draft" | "generating_scripts" | "generating_audio" | "review" | "approved" | "submitted" | "active" | "completed" | "failed"

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  completedAt?: Date;

  // Script Configuration
  scriptTemplate?: string; // Optional base template for script generation
  scriptVariables?: Record<string, any>; // Dynamic variables for personalization

  // Drop Cowboy Integration
  dropCowboyConfig: {
    campaignId?: string; // Drop Cowboy's campaign ID (assigned after submission)
    callerId?: string; // Caller ID to display
    retryAttempts?: number; // Number of retry attempts for failed calls
    scheduleConfig?: {
      startDate?: Date;
      endDate?: Date;
      timeWindows?: Array<{ start: string; end: string }>; // e.g., ["9:00 AM", "5:00 PM"]
    };
  };

  // Analytics
  stats: {
    totalContacts: number;
    scriptsGenerated: number;
    audioGenerated: number;
    sent: number;
    delivered: number;
    listened: number;
    failed: number;
  };

  // Anti-Spam Tracking
  duplicateCheckResults?: {
    totalDuplicates: number;
    duplicateContactIds: ObjectId[];
    conflictingCampaigns: Array<{
      campaignId: ObjectId;
      campaignName: string;
      contactIds: ObjectId[];
    }>;
  };
}

type CampaignType =
  | "sphere_of_influence"
  | "past_clients"
  | "neighborhood_expireds"
  | "high_equity"
  | "custom";

type CampaignStatus =
  | "draft"              // Initial creation
  | "importing_contacts" // Importing/normalizing contacts
  | "generating_scripts" // AI script generation in progress
  | "generating_audio"   // 11 Labs audio generation in progress
  | "review"            // Ready for agent review
  | "approved"          // Agent approved, ready to submit
  | "submitted"         // Submitted to Drop Cowboy
  | "active"            // Drop Cowboy campaign is running
  | "completed"         // Campaign finished
  | "failed";           // Campaign failed
```

### 2. VoicemailScript Model (`src/models/VoicemailScript.ts`)

```typescript
interface VoicemailScript {
  _id: ObjectId;
  campaignId: ObjectId;
  contactId: ObjectId;
  userId: ObjectId; // Agent owner

  // Script Content
  script: string; // Generated AI script text
  scriptVersion: number; // Version tracking for edits

  // Script Generation
  generatedBy: "ai" | "manual" | "template";
  aiModel?: string; // e.g., "groq-llama3", "claude-3.5-sonnet"
  generationPrompt?: string; // Prompt used for AI generation

  // Audio Generation (11 Labs)
  audio: {
    status: "pending" | "generating" | "completed" | "failed";
    url?: string; // S3/CDN URL for generated audio file
    elevenLabsId?: string; // 11 Labs audio ID
    voiceId?: string; // 11 Labs voice ID used
    duration?: number; // Audio duration in seconds
    generatedAt?: Date;
    error?: string;
  };

  // Review Status
  reviewStatus: "pending" | "approved" | "rejected" | "needs_revision";
  reviewNotes?: string;
  reviewedAt?: Date;

  // Delivery Tracking (from Drop Cowboy webhook)
  delivery: {
    status: "not_sent" | "queued" | "sent" | "delivered" | "failed" | "listened";
    dropCowboyMessageId?: string;
    sentAt?: Date;
    deliveredAt?: Date;
    listenedAt?: Date;
    failureReason?: string;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. ContactCampaign Junction Model (`src/models/ContactCampaign.ts`)

```typescript
interface ContactCampaign {
  _id: ObjectId;
  contactId: ObjectId;
  campaignId: ObjectId;
  userId: ObjectId; // Agent owner

  // Contact Source Tracking
  source: ContactSource; // "title_rep" | "google_contacts" | "database" | "mojo_dialer" | "manual"
  importBatchId?: ObjectId; // Track which import batch this came from

  // Status
  status: "pending" | "script_generated" | "audio_generated" | "approved" | "sent" | "delivered" | "failed";

  // Anti-Spam Flags
  isDuplicate: boolean; // True if contact appears in multiple campaigns
  duplicateCampaigns?: ObjectId[]; // Other campaign IDs containing this contact
  lastSentDate?: Date; // Last time a voicemail was sent to this contact
  daysSinceLastContact?: number; // Days since last voicemail

  // Timestamps
  addedAt: Date;
  updatedAt: Date;
}

type ContactSource =
  | "title_rep"
  | "google_contacts"
  | "database"
  | "mojo_dialer"
  | "manual"
  | "csv_import"
  | "api_integration";
```

### 4. Updates to Existing Contact Model (`src/models/User.ts` → Contact)

```typescript
// Add to existing Contact interface
interface Contact {
  // ... existing fields ...

  // Drop Cowboy Campaign History
  campaignHistory?: {
    totalCampaigns: number;
    lastCampaignDate?: Date;
    campaigns: Array<{
      campaignId: ObjectId;
      campaignName: string;
      campaignType: CampaignType;
      sentAt: Date;
      delivered: boolean;
      listened: boolean;
    }>;
  };

  // Anti-Spam Flags
  doNotContact?: boolean; // Manual opt-out flag
  unsubscribedAt?: Date;
  voicemailOptOut?: boolean; // Specific to voicemail campaigns
}
```

### 5. ImportBatch Model (`src/models/ImportBatch.ts`)

```typescript
interface ImportBatch {
  _id: ObjectId;
  userId: ObjectId;
  campaignId?: ObjectId; // Optional campaign association

  // Import Details
  source: ContactSource;
  fileName?: string; // Original file name if uploaded
  fileUrl?: string; // S3 URL for uploaded file

  // Processing Status
  status: "uploading" | "processing" | "completed" | "failed";
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
    duplicates: number;
  };

  // Normalization Config
  fieldMapping?: Record<string, string>; // Maps source fields to our schema

  // Results
  importedContactIds: ObjectId[];
  errors?: Array<{
    row: number;
    error: string;
    data?: any;
  }>;

  // Timestamps
  createdAt: Date;
  completedAt?: Date;
}
```

## API Routes Structure

### Campaign Management

#### `POST /api/agent/campaigns/create`
- Create new campaign
- Input: `{ name, type, neighborhood?, scriptTemplate? }`
- Returns: Campaign object

#### `GET /api/agent/campaigns/list`
- List all campaigns for logged-in agent
- Query params: `status`, `type`, `limit`, `offset`
- Returns: Array of campaigns with stats

#### `GET /api/agent/campaigns/[id]`
- Get campaign details including all scripts and contacts
- Returns: Campaign with nested contacts and scripts

#### `PATCH /api/agent/campaigns/[id]`
- Update campaign details
- Input: Partial campaign object
- Returns: Updated campaign

#### `DELETE /api/agent/campaigns/[id]`
- Delete campaign (only if status is "draft")
- Returns: Success message

#### `POST /api/agent/campaigns/[id]/approve`
- Move campaign from "review" to "approved" status
- Returns: Updated campaign

#### `POST /api/agent/campaigns/[id]/submit`
- Submit campaign to Drop Cowboy
- Triggers Drop Cowboy API integration
- Returns: Drop Cowboy campaign ID and status

### Contact Import

#### `POST /api/agent/campaigns/[id]/import/upload`
- Upload contact file (CSV, Excel, vCard)
- Input: FormData with file
- Returns: ImportBatch object

#### `POST /api/agent/campaigns/[id]/import/google`
- Import from Google Contacts OAuth
- Input: OAuth tokens
- Returns: ImportBatch object

#### `POST /api/agent/campaigns/[id]/import/database`
- Import from existing CRM contacts
- Input: `{ contactIds: ObjectId[] }`
- Returns: ContactCampaign[] array

#### `POST /api/agent/campaigns/[id]/import/mojo`
- Import from Mojo Dialer API
- Input: Mojo API credentials and list ID
- Returns: ImportBatch object

#### `GET /api/agent/campaigns/[id]/import/[batchId]`
- Get import batch status and results
- Returns: ImportBatch with progress

### Script Generation

#### `POST /api/agent/campaigns/[id]/generate-scripts`
- Generate AI scripts for all contacts in campaign
- Uses Groq or Claude API
- Input: `{ model?: string, customPrompt?: string }`
- Returns: Job ID for background processing

#### `GET /api/agent/campaigns/[id]/scripts`
- Get all scripts for campaign
- Query params: `reviewStatus`, `limit`, `offset`
- Returns: Array of VoicemailScript objects

#### `PATCH /api/agent/scripts/[scriptId]`
- Update/edit individual script
- Input: `{ script: string, reviewStatus?: string }`
- Returns: Updated VoicemailScript

#### `POST /api/agent/scripts/[scriptId]/regenerate`
- Regenerate script with AI
- Input: `{ customPrompt?: string }`
- Returns: New VoicemailScript version

### Audio Generation (11 Labs)

#### `POST /api/agent/campaigns/[id]/generate-audio`
- Generate audio for all approved scripts
- Calls 11 Labs API for each script
- Input: `{ voiceId?: string }`
- Returns: Job ID for background processing

#### `GET /api/agent/campaigns/[id]/audio-status`
- Get audio generation progress
- Returns: Stats on audio generation status

#### `POST /api/agent/scripts/[scriptId]/generate-audio`
- Generate audio for single script
- Input: `{ voiceId?: string }`
- Returns: Updated VoicemailScript with audio URL

### Campaign Analytics

#### `GET /api/agent/campaigns/[id]/analytics`
- Get detailed campaign analytics
- Returns: Delivery stats, listen rates, timeline

#### `GET /api/agent/campaigns/[id]/digest`
- Get campaign digest/summary
- Returns: Human-readable summary of campaign performance

#### `GET /api/agent/campaigns/analytics/overview`
- Get overview of all campaigns
- Returns: Aggregate stats across all campaigns

### Anti-Spam & Deduplication

#### `POST /api/agent/campaigns/[id]/check-duplicates`
- Run duplicate check for campaign contacts
- Checks against all other campaigns
- Returns: Duplicate report with conflicting campaigns

#### `GET /api/agent/contacts/[contactId]/campaign-history`
- Get all campaigns that contacted this person
- Returns: Array of campaigns with dates

### Drop Cowboy Webhook

#### `POST /api/webhooks/drop-cowboy`
- Receive delivery status updates from Drop Cowboy
- Updates VoicemailScript delivery status
- Input: Drop Cowboy webhook payload
- Returns: 200 OK

## Service Layer Architecture

### 1. ContactImportService (`src/lib/services/contact-import.service.ts`)

**Responsibilities:**
- Parse multiple file formats (CSV, Excel, vCard, JSON)
- Normalize contact data from different sources
- Map source fields to our Contact schema
- Detect and handle duplicates
- Create Contact and ContactCampaign records

**Key Methods:**
```typescript
class ContactImportService {
  async importFromFile(file: File, source: ContactSource, campaignId: ObjectId): Promise<ImportBatch>
  async importFromGoogleContacts(accessToken: string, campaignId: ObjectId): Promise<ImportBatch>
  async importFromMojoDialer(credentials: MojoCredentials, listId: string, campaignId: ObjectId): Promise<ImportBatch>
  async importFromDatabase(contactIds: ObjectId[], campaignId: ObjectId): Promise<ContactCampaign[]>
  private normalizeContactData(raw: any, source: ContactSource): Partial<Contact>
  private detectDuplicates(contacts: Partial<Contact>[]): DuplicateReport
}
```

### 2. ScriptGenerationService (`src/lib/services/script-generation.service.ts`)

**Responsibilities:**
- Generate personalized scripts using AI (Groq/Claude)
- Apply script templates with variable substitution
- Handle batch script generation
- Track generation progress

**Key Methods:**
```typescript
class ScriptGenerationService {
  async generateScriptForContact(contact: Contact, campaign: Campaign): Promise<VoicemailScript>
  async generateScriptsForCampaign(campaignId: ObjectId): Promise<Job>
  private buildPrompt(contact: Contact, campaign: Campaign): string
  private callAI(prompt: string, model: string): Promise<string>
  async regenerateScript(scriptId: ObjectId, customPrompt?: string): Promise<VoicemailScript>
}
```

**Script Generation Prompt Template:**
```
You are creating a personalized voicemail script for a real estate agent's campaign.

Agent Information:
- Name: {agentName}
- Brokerage: {brokerage}
- Phone: {agentPhone}

Contact Information:
- Name: {contactName}
- Property Address: {propertyAddress}
- City: {city}
- Listing Status: {listingStatus}
- Days on Market: {daysOnMarket}

Campaign Type: {campaignType}

Create a natural, conversational 30-45 second voicemail script that:
1. Introduces the agent warmly
2. References the specific property/situation
3. Provides clear value proposition
4. Ends with a soft call-to-action
5. Sounds human and authentic (not salesy)

Return only the script text, no additional formatting or meta-commentary.
```

### 3. AudioGenerationService (`src/lib/services/audio-generation.service.ts`)

**Responsibilities:**
- Integrate with 11 Labs text-to-speech API
- Convert scripts to audio files
- Upload audio to S3/CDN
- Handle batch audio generation
- Track generation progress and errors

**Key Methods:**
```typescript
class AudioGenerationService {
  async generateAudioForScript(scriptId: ObjectId, voiceId?: string): Promise<VoicemailScript>
  async generateAudioForCampaign(campaignId: ObjectId, voiceId?: string): Promise<Job>
  private callElevenLabs(text: string, voiceId: string): Promise<AudioBuffer>
  private uploadToS3(audio: AudioBuffer, scriptId: ObjectId): Promise<string>
  async getAudioStatus(campaignId: ObjectId): Promise<AudioGenerationStats>
}
```

**11 Labs Integration:**
```typescript
// 11 Labs API endpoint
const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

// Generate speech
POST /text-to-speech/{voice_id}
Headers:
  xi-api-key: {ELEVENLABS_API_KEY}
Body: {
  text: string,
  model_id: "eleven_multilingual_v2",
  voice_settings: {
    stability: 0.5,
    similarity_boost: 0.75
  }
}
Returns: audio/mpeg stream
```

### 4. DropCowboyService (`src/lib/services/drop-cowboy.service.ts`)

**Responsibilities:**
- Submit campaigns to Drop Cowboy API
- Map our data structure to Drop Cowboy format
- Handle webhook events
- Update delivery statuses
- Track campaign progress on Drop Cowboy side

**Key Methods:**
```typescript
class DropCowboyService {
  async createCampaign(campaignId: ObjectId): Promise<DropCowboyCampaignResponse>
  async submitVoicemails(campaignId: ObjectId): Promise<SubmissionResult>
  async handleWebhook(payload: DropCowboyWebhookPayload): Promise<void>
  async getCampaignStatus(dropCowboyCampaignId: string): Promise<CampaignStatus>
  private mapToDropCowboyFormat(campaign: Campaign, scripts: VoicemailScript[]): DropCowboyPayload
}
```

**Drop Cowboy API Integration:**
```typescript
// Drop Cowboy API structure (example - verify with actual API docs)
interface DropCowboyPayload {
  campaign_name: string;
  caller_id: string;
  schedule: {
    start_date: string;
    end_date: string;
    time_windows: Array<{ start: string; end: string }>;
  };
  messages: Array<{
    phone_number: string;
    audio_url: string;
    metadata?: Record<string, any>;
  }>;
}

// Webhook payload structure
interface DropCowboyWebhookPayload {
  event_type: "delivered" | "failed" | "listened";
  message_id: string;
  phone_number: string;
  timestamp: string;
  metadata?: {
    scriptId: string;
    campaignId: string;
  };
}
```

### 5. AntiSpamService (`src/lib/services/anti-spam.service.ts`)

**Responsibilities:**
- Check for duplicate contacts across campaigns
- Enforce minimum time between contacts
- Generate duplicate reports
- Flag contacts that appear in multiple campaigns
- Provide campaign conflict resolution

**Key Methods:**
```typescript
class AntiSpamService {
  async checkDuplicates(campaignId: ObjectId): Promise<DuplicateReport>
  async checkContactHistory(contactId: ObjectId): Promise<ContactHistory>
  async enforceMinimumContactInterval(contactId: ObjectId, minDays: number): Promise<boolean>
  async getCampaignConflicts(contactIds: ObjectId[]): Promise<CampaignConflict[]>
  async markAsDoNotContact(contactId: ObjectId, reason: string): Promise<void>
}

interface DuplicateReport {
  totalDuplicates: number;
  duplicateContacts: Array<{
    contactId: ObjectId;
    name: string;
    phone: string;
    campaigns: Array<{
      campaignId: ObjectId;
      campaignName: string;
      lastSent: Date;
      daysSince: number;
    }>;
  }>;
  recommendations: string[];
}
```

### 6. CampaignAnalyticsService (`src/lib/services/campaign-analytics.service.ts`)

**Responsibilities:**
- Aggregate campaign performance data
- Calculate delivery rates, listen rates
- Generate campaign digests
- Create performance reports
- Track trends over time

**Key Methods:**
```typescript
class CampaignAnalyticsService {
  async getCampaignStats(campaignId: ObjectId): Promise<CampaignStats>
  async generateDigest(campaignId: ObjectId): Promise<CampaignDigest>
  async getOverviewStats(userId: ObjectId): Promise<OverviewStats>
  async getPerformanceTrends(userId: ObjectId, days: number): Promise<TrendData>
}

interface CampaignStats {
  totalSent: number;
  delivered: number;
  deliveryRate: number;
  listened: number;
  listenRate: number;
  failed: number;
  failureRate: number;
  averageListenTime?: number;
  timeline: Array<{ date: Date; sent: number; delivered: number; listened: number }>;
}

interface CampaignDigest {
  campaignName: string;
  campaignType: string;
  dateRange: { start: Date; end: Date };
  summary: string; // Human-readable summary
  stats: CampaignStats;
  topPerformers: Array<{ contactName: string; listened: boolean; listenTime?: number }>;
  recommendations: string[];
}
```

## UI/UX Flow

### 1. Campaign Creation Wizard

**Route:** `/agent/campaigns/new`

**Steps:**
1. **Campaign Setup**
   - Name your campaign
   - Select campaign type (dropdown)
   - Optional: Specify neighborhood
   - Optional: Upload script template

2. **Import Contacts**
   - Choose import method (tabs):
     - Upload File (CSV/Excel)
     - Google Contacts
     - Select from CRM
     - Mojo Dialer
   - Map fields if needed
   - Review import preview
   - Confirm import

3. **Duplicate Check**
   - Automatic duplicate scan runs
   - Show duplicate report
   - Options:
     - Remove duplicates
     - Keep duplicates (with warning)
     - Adjust minimum contact interval

4. **Script Generation**
   - Review/edit script template
   - Configure AI model (optional)
   - Click "Generate Scripts"
   - Progress bar shows generation status
   - Preview generated scripts

5. **Review Scripts**
   - List view of all scripts
   - Edit individual scripts
   - Approve/reject scripts
   - Regenerate scripts as needed
   - Bulk approve option

6. **Audio Generation**
   - Select voice (11 Labs voice selector)
   - Click "Generate Audio"
   - Progress bar shows audio generation
   - Listen to preview samples
   - Regenerate audio if needed

7. **Final Review**
   - Campaign summary
   - Total contacts
   - Audio samples
   - Estimated cost
   - Schedule settings (optional)
   - Approve campaign

8. **Submit to Drop Cowboy**
   - Confirm submission
   - Campaign is sent to Drop Cowboy
   - Redirect to campaign dashboard

### 2. Campaign Dashboard

**Route:** `/agent/campaigns`

**Features:**
- List of all campaigns (tabs by status)
- Campaign cards showing:
  - Name, type, date
  - Status badge
  - Quick stats (sent, delivered, listened)
  - Progress bar
- Filters: Type, Date Range, Status
- Search by campaign name
- Create New Campaign button

### 3. Campaign Detail View

**Route:** `/agent/campaigns/[id]`

**Sections:**

**Overview Tab:**
- Campaign info and status
- Key metrics (cards)
- Timeline chart
- Recent activity feed

**Contacts Tab:**
- Searchable/filterable contact list
- Shows script and audio status
- Delivery status per contact
- Click to view contact detail

**Scripts Tab:**
- List of all scripts
- Filter by review status
- Edit/regenerate options
- Preview audio player

**Analytics Tab:**
- Detailed performance charts
- Delivery timeline
- Listen rate by time of day
- Geographic distribution
- Export to CSV option

**Digest Tab:**
- Auto-generated summary
- Top performers
- Recommendations
- Export to PDF option

### 4. Contact Detail with Campaign History

**Route:** `/agent/crm/contacts/[id]`

**New Section:**
- **Campaign History**
  - List of all campaigns this contact was in
  - Dates sent
  - Delivery and listen status
  - Link to each campaign
  - Warning if contacted too recently

### 5. CRM Contact List with Campaign Filter

**Route:** `/agent/crm/contacts`

**New Filters:**
- Filter by Campaign (dropdown of all campaigns)
- Filter by Campaign Type
- Filter by Last Contact Date
- Show only "Do Not Contact" contacts

## Integration Points

### 1. Google Contacts Integration

**OAuth Flow:**
```typescript
// Use Google People API
const SCOPES = ['https://www.googleapis.com/auth/contacts.readonly'];

// OAuth flow
1. User clicks "Import from Google"
2. Redirect to Google OAuth consent screen
3. Callback to /api/auth/google/callback
4. Exchange code for access token
5. Call People API to fetch contacts
6. Normalize and import
```

### 2. Mojo Dialer Integration

**API Integration:**
```typescript
// Mojo Dialer API (verify with actual docs)
interface MojoCredentials {
  apiKey: string;
  userId: string;
}

// Endpoints
GET /api/v1/lists - Get all lists
GET /api/v1/lists/{listId}/leads - Get leads from list

// Map Mojo fields to our Contact schema
const MOJO_FIELD_MAPPING = {
  'first_name': 'firstName',
  'last_name': 'lastName',
  'phone': 'phone',
  'address': 'address',
  'city': 'city',
  'state': 'state',
  'zip': 'zipCode',
  'property_type': 'propertyType',
  'status': 'listingStatus'
};
```

### 3. Title Rep Integration

**File Format:**
```typescript
// Title rep typically provides Excel or CSV
// Common fields:
interface TitleRepExport {
  'Owner Name': string;
  'Property Address': string;
  'City': string;
  'State': string;
  'ZIP': string;
  'Phone': string;
  'Email': string;
  'Sale Date'?: string;
  'Sale Price'?: string;
}

// Normalization strategy
const normalizeTitleRep = (row: TitleRepExport): Partial<Contact> => {
  const [firstName, ...lastNameParts] = row['Owner Name'].split(' ');
  return {
    firstName,
    lastName: lastNameParts.join(' '),
    phone: normalizePhoneNumber(row['Phone']),
    email: row['Email'],
    address: row['Property Address'],
    city: row['City'],
    state: row['State'],
    zipCode: row['ZIP'],
    // ... additional mapping
  };
};
```

### 4. 11 Labs Voice Options

**Available Voices:**
```typescript
const ELEVENLABS_VOICES = {
  'professional_male': '21m00Tcm4TlvDq8ikWAM',
  'professional_female': 'EXAVITQu4vr4xnSDxMaL',
  'friendly_male': 'VR6AewLTigWG4xSOukaG',
  'friendly_female': 'jsCqWAovK2LkecY7zXl4',
  // ... more voices
};

// Agent can select voice in campaign config
// Default to 'professional_male' or 'professional_female'
```

### 5. S3 Storage for Audio Files

**Storage Strategy:**
```typescript
// S3 bucket structure
/voicemails/
  /{userId}/
    /{campaignId}/
      /{scriptId}.mp3

// Naming convention
const generateS3Key = (userId: string, campaignId: string, scriptId: string) => {
  return `voicemails/${userId}/${campaignId}/${scriptId}.mp3`;
};

// Public read access for Drop Cowboy to fetch audio
// Set expiration policy (e.g., 90 days after campaign completion)
```

## Background Job Processing

**Use Bull Queue for async tasks:**

```typescript
// Queues
const scriptGenerationQueue = new Queue('script-generation');
const audioGenerationQueue = new Queue('audio-generation');
const campaignSubmissionQueue = new Queue('campaign-submission');

// Job Processors
scriptGenerationQueue.process(async (job) => {
  const { campaignId } = job.data;
  await ScriptGenerationService.generateScriptsForCampaign(campaignId);
});

audioGenerationQueue.process(async (job) => {
  const { campaignId, voiceId } = job.data;
  await AudioGenerationService.generateAudioForCampaign(campaignId, voiceId);
});

campaignSubmissionQueue.process(async (job) => {
  const { campaignId } = job.data;
  await DropCowboyService.submitVoicemails(campaignId);
});

// Job progress updates via WebSocket to frontend
```

## Security & Privacy Considerations

1. **Data Encryption**
   - Encrypt contact phone numbers at rest
   - Use HTTPS for all API calls
   - Secure audio files with signed URLs

2. **Access Control**
   - All data scoped by userId
   - Team members can see team campaigns
   - Role-based permissions (admin, agent, viewer)

3. **Compliance**
   - TCPA compliance checks
   - Do Not Call list integration
   - Opt-out mechanism
   - Record keeping for compliance

4. **Rate Limiting**
   - Limit campaigns per day
   - Limit contacts per campaign
   - Prevent spam abuse

## Cost Considerations

**Per Campaign Costs:**
- 11 Labs: ~$0.30 per 1000 characters (avg $0.015 per voicemail)
- Drop Cowboy: ~$0.10-0.15 per voicemail sent
- S3 Storage: ~$0.023 per GB/month
- AI Script Generation: ~$0.001 per script (Groq) or ~$0.01 per script (Claude)

**Estimated Cost for 100-contact campaign:**
- Scripts: $0.10-1.00
- Audio: $1.50
- Delivery: $10-15
- Storage: <$0.01
- **Total: ~$12-17 per 100 contacts**

## Next Steps for Implementation

1. Create database models (Campaign, VoicemailScript, ContactCampaign, ImportBatch)
2. Set up API routes structure
3. Implement ContactImportService with CSV parser
4. Build ScriptGenerationService with Groq integration
5. Integrate 11 Labs API in AudioGenerationService
6. Create basic campaign creation UI
7. Build script review interface
8. Implement Drop Cowboy API integration
9. Set up webhook handler for delivery status
10. Create campaign analytics dashboard
11. Add anti-spam duplicate checking
12. Build campaign history view in CRM
13. Add campaign filtering to contact list
14. Testing and refinement

## Technology Stack Summary

- **Backend:** Next.js API Routes, TypeScript
- **Database:** MongoDB with Mongoose
- **AI:** Groq (Llama 3) or Claude 3.5 Sonnet
- **Text-to-Speech:** 11 Labs API
- **Voicemail Delivery:** Drop Cowboy API
- **File Storage:** AWS S3
- **Job Queue:** Bull Queue with Redis
- **File Parsing:** Papa Parse (CSV), XLSX (Excel), vCard parser
- **Frontend:** React, TailwindCSS, Shadcn UI
- **Real-time Updates:** WebSockets or Server-Sent Events
