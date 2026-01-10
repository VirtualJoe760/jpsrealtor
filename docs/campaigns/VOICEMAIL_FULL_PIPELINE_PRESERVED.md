# Voicemail Campaign - Full Pipeline (PRESERVED FOR BYOC)

## Status: PRESERVED - Do Not Delete

This document preserves the full voicemail campaign pipeline architecture that was built but cannot be used until a BYOC (Bring Your Own Carrier) Drop Cowboy account is activated.

**Last Working Date:** 2026-01-07
**Reason for Preservation:** Drop Cowboy standard accounts don't support `audio_url` parameter
**Activation Trigger:** BYOC account setup

---

## Overview

The full voicemail pipeline provides **end-to-end automated voicemail campaign creation** with AI-powered script generation, 11Labs voice synthesis, and programmatic audio delivery.

### Full Pipeline Workflow

```
1. Contacts → 2. Scripts → 3. Audio → 4. Preview → 5. Send
```

**Step 1: Contacts**
- Select contacts from CRM
- Import from CSV/Excel
- Filter and segment

**Step 2: Scripts**
- AI-powered script generation (Groq/Claude)
- Personalized per contact
- Template-based with merge fields
- Preview and edit

**Step 3: Audio**
- Generate audio with 11Labs
- Select voice (male/female, various styles)
- Upload custom recordings
- Store in Cloudinary

**Step 4: Preview**
- Listen to generated voicemails
- Review contact list
- Verify script content
- Check audio quality

**Step 5: Send**
- Submit to Drop Cowboy via `audio_url`
- Track delivery status
- Monitor responses
- View analytics

---

## Architecture

### API Routes (All Preserved)

#### Campaign Send Route
**File:** `src/app/api/campaigns/[id]/send/route.ts`
**Status:** ✅ Fully functional (except Drop Cowboy upload)

**Key Functions:**
- `uploadAudioToDropCowboy()` - Attempts upload (doesn't work)
- `sendVoicemailToDropCowboy()` - Sends RVM
- `checkAndUpdateDeliveryStatus()` - Polls Drop Cowboy
- Main POST handler - Orchestrates entire send process

**What Works:**
- ✅ Contact retrieval
- ✅ Script generation integration
- ✅ Audio fetching from Cloudinary
- ✅ Base64 encoding
- ✅ RVM submission logic
- ✅ Status tracking
- ✅ Campaign analytics updates

**What Doesn't Work (Yet):**
- ❌ Drop Cowboy audio upload (returns list instead)
- ❌ Using uploaded recording_id (uses wrong one)

**What Needs to Change for BYOC:**
```typescript
// Current (doesn't work):
const recordingId = await uploadAudioToDropCowboy(audioUrl, scriptId);

// Future (BYOC):
const payload = {
  // ... other fields
  audio_url: audioUrl,  // ← Just pass Cloudinary URL directly!
  // No upload needed!
};
```

**File Location:** `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\campaigns\[id]\send\route.ts`

---

#### Script Generation Routes
**Files:**
- `src/app/api/campaigns/[id]/scripts/route.ts`
- `src/app/api/campaigns/[id]/scripts/[scriptId]/route.ts`

**Status:** ✅ Fully functional

**Features:**
- AI script generation via Groq/Claude
- Personalization with contact data
- Template-based scripts
- Script variations per contact
- Edit and regenerate

**Example Request:**
```json
POST /api/campaigns/[id]/scripts
{
  "contact_ids": ["60a1b2c3...", "70b2c3d4..."],
  "template": "expired_listing",
  "ai_provider": "groq",
  "voice_tone": "professional"
}
```

**Example Response:**
```json
{
  "success": true,
  "scripts": [
    {
      "script_id": "677...",
      "contact_id": "60a1b2c3...",
      "content": "Hi Sarah, this is Joseph Sardella...",
      "status": "generated"
    }
  ]
}
```

**File Location:** `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\campaigns\[id]\scripts\`

---

#### Audio Upload Route
**File:** `src/app/api/campaigns/[id]/scripts/[scriptId]/upload-audio/route.ts`

**Status:** ✅ Fully functional

**Features:**
- Accept user-recorded audio files
- Upload to Cloudinary
- Associate with script
- Store metadata (duration, URL)

**Usage:**
```typescript
POST /api/campaigns/[id]/scripts/[scriptId]/upload-audio
Content-Type: multipart/form-data

audio: File
```

**Cloudinary Integration:**
- Resource type: 'video' (audio stored as video)
- Folder: 'voicemail-campaigns/user-recorded'
- Public ID: `voicemail_user_recorded_{scriptId}`
- Tags: campaignId, userId, contactId

**File Location:** `F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\campaigns\[id]\scripts\[scriptId]\upload-audio\route.ts`

---

### Service Layer

#### Script Generation Service
**File:** `src/lib/services/script-generation.service.ts`

**Status:** ✅ Fully functional (recently fixed Groq token limits)

**Key Functions:**
- `generateScript(prompt, provider, options)` - Generate single script
- `generateScriptBatch(contacts, template)` - Batch generation
- `personalizeScript(template, contact)` - Merge contact data
- Groq integration
- Claude integration
- Token limit handling (increased to 2048)

**Recent Fix (2026-01-07):**
```typescript
// Increased from 600 to 2048 to prevent token limit errors
max_tokens: 2048,

// Better error handling
if (finishReason === 'length' && (!content || content.trim().length === 0)) {
  throw new Error('Groq API hit token limit before generating response...');
}
```

**File Location:** `F:\web-clients\joseph-sardella\jpsrealtor\src\lib\services\script-generation.service.ts`

---

### Frontend Components (All Preserved)

#### PipelineScriptsStep
**File:** `src/app/campaigns/[id]/components/PipelineScriptsStep.tsx`

**Status:** ✅ Fully functional

**Features:**
- Display contact list
- Trigger AI script generation
- Show generated scripts
- Edit scripts individually
- Regenerate if needed
- Progress tracking

**File Location:** `F:\web-clients\joseph-sardella\jpsrealtor\src\app\campaigns\[id]\components\PipelineScriptsStep.tsx`

---

#### PipelineAudioStep
**File:** `src/app/campaigns/[id]/components/PipelineAudioStep.tsx`

**Status:** ✅ Fully functional

**Features:**
- Select 11Labs voice
- Generate audio for all scripts
- Upload custom audio files
- Preview audio player
- Batch audio generation
- Progress indicators

**11Labs Integration:**
- Voice selection dropdown
- Real-time audio generation
- Automatic Cloudinary upload
- Audio quality settings

**File Location:** `F:\web-clients\joseph-sardella\jpsrealtor\src\app\campaigns\[id]\components\PipelineAudioStep.tsx`

---

#### PipelinePreviewStep
**File:** `src/app/campaigns/[id]/components/PipelinePreviewStep.tsx`

**Status:** ✅ Fully functional

**Features:**
- Review all contacts
- Play audio previews
- Read script content
- Edit before sending
- Final validation
- Cost estimation

**File Location:** `F:\web-clients\joseph-sardella\jpsrealtor\src\app\campaigns\[id]\components\PipelinePreviewStep.tsx`

---

#### PipelineSendStep
**File:** `src/app/campaigns/[id]/components/PipelineSendStep.tsx`

**Status:** ⚠️ Works but uses wrong recording_id

**Features:**
- Final confirmation
- Send button
- Progress tracking
- Real-time status updates
- Error handling
- Success summary

**Current Issue:**
- Calls `/api/campaigns/[id]/send`
- That route attempts Drop Cowboy upload
- Upload fails (returns list instead)
- Uses wrong recording_id from list
- Voicemails sent with incorrect audio

**File Location:** `F:\web-clients\joseph-sardella\jpsrealtor\src\app\campaigns\[id]\components\PipelineSendStep.tsx`

---

## Database Models

### VoicemailScript Model
**File:** `src/models/VoicemailScript.ts`

**Status:** ✅ Fully functional

**Schema:**
```typescript
{
  _id: ObjectId,
  campaignId: ObjectId,
  userId: ObjectId,
  contactId: ObjectId,  // Optional: null for general scripts
  isGeneral: boolean,

  // Script content
  content: string,
  generatedBy: 'ai' | 'manual',
  aiProvider: 'groq' | 'claude',

  // Audio
  audio: {
    status: 'pending' | 'generating' | 'completed' | 'failed',
    url: string,  // Cloudinary URL
    elevenLabsId: string,
    voiceId: string,
    duration: number,
    generatedAt: Date,
  },

  // Status
  status: 'draft' | 'ready' | 'sent' | 'failed',
  sentAt: Date,
  deliveryStatus: string,

  createdAt: Date,
  updatedAt: Date,
}
```

**File Location:** `F:\web-clients\joseph-sardella\jpsrealtor\src\models\VoicemailScript.ts`

---

## Integration Details

### 11Labs Integration

**Configuration:**
```typescript
// .env.local
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=pNInz6obpgDQGcFmaJgB  // Default voice
```

**Workflow:**
1. User selects voice from dropdown
2. Frontend calls 11Labs API
3. Generates audio from script text
4. Returns audio file (MP3)
5. Uploads to Cloudinary
6. Stores URL in VoicemailScript

**Cost:**
- ~$0.05 per 1000 characters
- Average script: 200-300 characters
- Cost per audio: ~$0.01-0.015

---

### Cloudinary Integration

**Configuration:**
```typescript
// .env.local
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

**Storage Structure:**
```
voicemail-campaigns/
  ├── ai-generated/
  │   └── voicemail_ai_{scriptId}.mp3
  └── user-recorded/
      └── voicemail_user_recorded_{scriptId}.mp3
```

**Upload Settings:**
- Resource type: 'video'
- Format: MP3
- Context metadata: campaignId, userId, contactId
- Tags: campaignId, userId, recordType

**Audio URLs:**
```
https://res.cloudinary.com/{cloud_name}/video/upload/
  voicemail-campaigns/ai-generated/voicemail_ai_67772f96b9e8e03ca07ef826.mp3
```

---

### Drop Cowboy Integration (BYOC Required)

**Configuration:**
```typescript
// .env.local
DROP_COWBOY_TEAM_ID=dc_team_...
DROP_COWBOY_SECRET=dc_secret_...
DROP_COWBOY_BRAND_ID=...
DROP_COWBOY_NUMBER_POOL_ID=...
```

**RVM Payload (BYOC):**
```json
{
  "command": "message.send_rvm",
  "team_id": "dc_team_xxx",
  "secret": "dc_secret_xxx",
  "brand_id": "brand_id_xxx",
  "number_pool_id": "pool_id_xxx",
  "phone_number": "+1234567890",
  "forwarding_number": "+1098765432",
  "audio_url": "https://res.cloudinary.com/.../recording.mp3",  // ← BYOC only!
  "foreign_id": "campaign_name-contact_id"
}
```

**Key Difference:**
- Standard accounts: Use `recording_id` (pre-uploaded)
- BYOC accounts: Use `audio_url` (dynamic Cloudinary URL)

---

## Activation Checklist for BYOC

When BYOC account is activated, follow these steps:

### 1. Update Environment Variables
```bash
# Add BYOC-specific config
DROP_COWBOY_ACCOUNT_TYPE=byoc
```

### 2. Enable Full Pipeline in UI
```typescript
// In CampaignPipeline.tsx or config
const accountType = process.env.DROP_COWBOY_ACCOUNT_TYPE;
const useFullPipeline = accountType === 'byoc';
```

### 3. Modify Send Route
```typescript
// In src/app/api/campaigns/[id]/send/route.ts

// Remove or comment out:
// const recordingId = await uploadAudioToDropCowboy(audioUrl, scriptId);

// Use audio_url instead:
const payload = {
  command: 'message.send_rvm',
  // ... other fields
  audio_url: audioUrl,  // ← Direct Cloudinary URL
  // No recording_id needed!
};
```

### 4. Test End-to-End
- [ ] Create campaign
- [ ] Generate scripts
- [ ] Generate audio
- [ ] Preview
- [ ] Send
- [ ] Verify correct audio delivered
- [ ] Check analytics

### 5. Update Documentation
- [ ] Mark BYOC as active
- [ ] Update user guides
- [ ] Remove "BYOC required" warnings

---

## Cost Analysis

### Full Pipeline (BYOC)

**Per Campaign (150 contacts):**
- Script generation (Groq): 150 × $0.001 = $0.15
- Audio generation (11Labs): 1 recording × ~$0.015 = $0.015
- Cloudinary storage: Negligible (~$0.001)
- Drop Cowboy RVM (BYOC): 150 × $0.06 = $9.00
- **Total: ~$9.17**

**Advantages:**
- Fully automated
- Personalized scripts per contact
- High-quality 11Labs voices
- No manual uploads
- Scalable

### Simple Pipeline (Standard Account)

**Per Campaign (150 contacts):**
- Manual recording: $0 (user records once)
- Manual upload to Drop Cowboy: $0
- Drop Cowboy RVM (standard): 150 × $0.10 = $15.00
- **Total: $15.00**

**Advantages:**
- No AI costs
- User has full control
- No BYOC setup needed
- Simple workflow

**BYOC Savings per Campaign:** $5.83
**BYOC Break-even:** ~2-3 campaigns (assuming $20-30 setup cost)

---

## Files to Preserve (Do Not Delete!)

### API Routes
- ✅ `src/app/api/campaigns/[id]/send/route.ts`
- ✅ `src/app/api/campaigns/[id]/scripts/route.ts`
- ✅ `src/app/api/campaigns/[id]/scripts/[scriptId]/route.ts`
- ✅ `src/app/api/campaigns/[id]/scripts/[scriptId]/upload-audio/route.ts`

### Services
- ✅ `src/lib/services/script-generation.service.ts`

### Components
- ✅ `src/app/campaigns/[id]/components/PipelineScriptsStep.tsx`
- ✅ `src/app/campaigns/[id]/components/PipelineAudioStep.tsx`
- ✅ `src/app/campaigns/[id]/components/PipelinePreviewStep.tsx`
- ✅ `src/app/campaigns/[id]/components/PipelineSendStep.tsx`

### Models
- ✅ `src/models/VoicemailScript.ts`
- ✅ `src/models/Campaign.ts`

---

## Why We Built This (Valuable Work!)

Even though we can't use this immediately, building the full pipeline was NOT wasted effort:

### 1. Script Generation Service
- ✅ Can be used for other features (email templates, SMS)
- ✅ Groq/Claude integration reusable
- ✅ Personalization engine valuable

### 2. Audio Infrastructure
- ✅ Cloudinary setup works for future features
- ✅ 11Labs integration ready
- ✅ Audio player components reusable

### 3. Campaign Pipeline UI
- ✅ Multi-step wizard pattern established
- ✅ Progress tracking implemented
- ✅ Can be adapted for email/SMS campaigns

### 4. Architecture Foundation
- ✅ Service layer pattern
- ✅ API route structure
- ✅ Error handling
- ✅ Status tracking

### 5. Future Features Enabled
- ✅ Personalized campaigns at scale
- ✅ A/B testing (different scripts/voices)
- ✅ Drip campaigns
- ✅ Multi-channel coordination

---

## Future Enhancements (Post-BYOC)

### 1. Script A/B Testing
- Test 2-3 script variants
- Compare response rates
- Auto-select best performer

### 2. Voice Selection per Contact
- Match voice to contact demographics
- Male/female voice options
- Accent/tone variations

### 3. Script Templates Library
- Pre-built templates by campaign type
- Community-contributed templates
- Industry-specific templates

### 4. Audio Quality Optimization
- Dynamic bitrate selection
- Compression optimization
- File size reduction

### 5. Drip Campaign Sequences
- Multi-touch voicemail sequences
- Automated follow-ups
- Response-triggered sequences

---

## Related Documents

- [Simplified Workflow Action Plan](./VOICEMAIL_CAMPAIGN_SIMPLIFIED_ACTION_PLAN.md)
- [Drop Cowboy API Limitations](./DROP_COWBOY_API_LIMITATIONS.md)
- [Campaign Architecture](./CAMPAIGN_STRATEGY_ARCHITECTURE.md)

---

**Document Version:** 1.0
**Created:** 2026-01-07
**Author:** AI Development Team
**Status:** PRESERVED - Ready for BYOC Activation
**Estimated BYOC Activation:** TBD (contact Drop Cowboy sales)
